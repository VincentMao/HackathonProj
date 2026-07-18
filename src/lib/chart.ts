/**
 * Deterministic FHIR -> ChartExtract normalizer (NO LLM).
 *
 * The case JSON is already structured, so this is a pure, heuristic flatten over the
 * encounter's related_resources AND patient_context.longitudinal_summary (condition_labels
 * matter: e.g. Case B's cerebral aneurysm lives only there, and the CAR-T exclusion must be
 * reconstructable as a composite from it, never from age).
 */
import { ChartExtract } from "./rules";

export interface RawCase {
  id: string;
  metadata: { date?: string; [k: string]: unknown };
  patient_context: {
    patient: { birthDate?: string; gender?: string; [k: string]: unknown };
    longitudinal_summary?: {
      condition_labels?: string[];
      medication_labels?: string[];
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  encounter_fhir: {
    related_resources?: {
      Condition?: Array<{ code?: { text?: string } }>;
      Observation?: Array<{ code?: { text?: string }; valueString?: string; valueQuantity?: { value?: number } }>;
      Procedure?: Array<{ code?: { text?: string } }>;
      DiagnosticReport?: Array<{ code?: { text?: string }; conclusion?: string }>;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  transcript: string;
  note: string; // NEVER passed to the reasoner — validation target only
  after_visit_summary: string; // NEVER passed to the reasoner
  after_visit_summary_provenance: Record<string, unknown>;
}

function ageFrom(birthDate?: string, visitDate?: string): number {
  if (!birthDate) return 0;
  const b = new Date(birthDate);
  const v = visitDate ? new Date(visitDate) : new Date(2026, 6, 15);
  let age = v.getFullYear() - b.getFullYear();
  const m = v.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && v.getDate() < b.getDate())) age--;
  return age;
}

/** All condition/diagnosis text (encounter resources + longitudinal labels), lowercased. */
function diseaseText(raw: RawCase): string {
  const conds = raw.encounter_fhir.related_resources?.Condition?.map((c) => c.code?.text ?? "") ?? [];
  const labels = raw.patient_context.longitudinal_summary?.condition_labels ?? [];
  const reports = raw.encounter_fhir.related_resources?.DiagnosticReport?.map((d) => d.conclusion ?? "") ?? [];
  return [...conds, ...labels, ...reports].join(" | ").toLowerCase();
}

function ecog(raw: RawCase): number | null {
  const obs = raw.encounter_fhir.related_resources?.Observation ?? [];
  const e = obs.find((o) => (o.code?.text ?? "").toLowerCase().includes("ecog"));
  if (!e) return null;
  const v = e.valueString ?? String(e.valueQuantity?.value ?? "");
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function firstLine(raw: RawCase): string {
  const procs = (raw.encounter_fhir.related_resources?.Procedure ?? []).map((p) => (p.code?.text ?? "").toLowerCase());
  const t = procs.join(" | ");
  if (t.includes("minichop") || t.includes("mini-r-chop") || t.includes("mini r-chop")) return "R-miniCHOP";
  if (t.includes("chop")) return "R-CHOP";
  return "unknown";
}

/**
 * Extract structured chart facts. Heuristics are targeted at the encounter schema and
 * degrade gracefully; the two demo cases are exercised by tests/.
 */
export function extractChart(raw: RawCase): ChartExtract {
  const dx = diseaseText(raw);
  const age = ageFrom(raw.patient_context.patient.birthDate, raw.metadata.date);
  const eco = ecog(raw);

  const primaryRefractory = /primary[\s-]*refractory|refractory/.test(dx);
  const cnsInvolved = /\bcns\b|leptomening|intrathecal|central nervous/.test(dx);

  const compartment: Array<"parenchymal" | "leptomeningeal" | "csf_positive"> = [];
  if (/leptomening/.test(dx)) compartment.push("leptomeningeal");
  if (/parenchymal|posterior fossa/.test(dx)) compartment.push("parenchymal");
  if (/csf positive|clonal b-cell|flow cytometr/.test(dx)) compartment.push("csf_positive");

  const mycPositive = /myc (amplif|rearrang|translocat|positive)|myc\+/.test(dx);
  let mycMethod: "unknown" | "rearrangement" | "amplification" | "not_tested" = "not_tested";
  if (/myc amplif/.test(dx)) mycMethod = "amplification";
  else if (/myc (rearrang|translocat)/.test(dx)) mycMethod = "rearrangement";
  else if (mycPositive) mycMethod = "unknown";

  const cellOfOrigin: "GCB" | "ABC" | "non_GCB" | "unknown" = /\bgcb\b/.test(dx)
    ? "GCB"
    : /\babc\b|non-gcb|non gcb/.test(dx)
      ? "ABC"
      : "unknown";

  const physiologicallyFit = eco == null ? age < 80 : eco <= 1;

  const parsed = ChartExtract.safeParse({
    line: 2,
    region: "US",
    transplant_intent: age >= 75 ? "ineligible" : "intended",
    refractoriness: { primary_refractory: primaryRefractory },
    disease: {
      chemosensitive: !primaryRefractory,
      relapse_timing: primaryRefractory ? "early" : "na",
      cell_of_origin: cellOfOrigin,
      cns_involvement: cnsInvolved,
      cns_compartment: compartment,
      molecular: { myc_positive: mycPositive, myc_method: mycMethod },
    },
    fitness: { age, cell_therapy_fit: physiologicallyFit },
    prior: { first_line: firstLine(raw), cd19_directed: false },
    geriatric_assessment: { completed: false },
  });
  if (!parsed.success) throw new Error(`chart: extract failed validation:\n${parsed.error.toString()}`);
  return parsed.data;
}

/** Compact, human-readable chart summary for the reasoner prompt (NO note / AVS). */
export function chartSummary(chart: ChartExtract): string {
  const d = chart.disease;
  return [
    `Age: ${chart.fitness.age}`,
    `Line of therapy: ${chart.line}`,
    `Primary-refractory: ${chart.refractoriness.primary_refractory}`,
    `Chemosensitive: ${d.chemosensitive}`,
    `Relapse timing: ${d.relapse_timing}`,
    `Cell of origin: ${d.cell_of_origin}`,
    `MYC: ${d.molecular.myc_positive ? d.molecular.myc_method : "negative"}`,
    `CNS involvement: ${d.cns_involvement}${d.cns_compartment.length ? ` (${d.cns_compartment.join(", ")})` : ""}`,
    `Transplant intent: ${chart.transplant_intent}`,
    `Physiologic cell-therapy fitness: ${chart.fitness.cell_therapy_fit}`,
    `Prior first line: ${chart.prior.first_line}`,
    `Geriatric assessment completed: ${chart.geriatric_assessment.completed}`,
  ].join("\n");
}
