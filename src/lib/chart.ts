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

/** Find an Observation whose code.text contains `needle`; return its numeric/string value. */
function obs(raw: RawCase, needle: string): { num: number | null; str: string | null } {
  const list = raw.encounter_fhir.related_resources?.Observation ?? [];
  const o = list.find((x) => (x.code?.text ?? "").toLowerCase().includes(needle.toLowerCase()));
  if (!o) return { num: null, str: null };
  const num = o.valueQuantity?.value ?? (o.valueString != null && !Number.isNaN(Number(o.valueString)) ? Number(o.valueString) : null);
  return { num: num ?? null, str: o.valueString ?? (num != null ? String(num) : null) };
}

/** All clinical free-text (conditions, observations, procedures, reports, labels), lowercased. */
function clinicalText(raw: RawCase): string {
  const rr = raw.encounter_fhir.related_resources ?? {};
  const parts: string[] = [];
  for (const c of rr.Condition ?? []) parts.push(c.code?.text ?? "");
  for (const o of rr.Observation ?? []) parts.push(`${o.code?.text ?? ""} ${o.valueString ?? ""} ${o.valueQuantity?.value ?? ""}`);
  for (const p of rr.Procedure ?? []) parts.push(p.code?.text ?? "");
  for (const d of rr.DiagnosticReport ?? []) parts.push(`${d.code?.text ?? ""} ${d.conclusion ?? ""}`);
  parts.push(...(raw.patient_context.longitudinal_summary?.condition_labels ?? []));
  return parts.join(" | ").toLowerCase();
}

function patientName(raw: RawCase): string {
  const n = (raw.patient_context.patient as { name?: Array<{ family?: string; given?: string[] }> }).name?.[0];
  if (!n) return "";
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ");
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

  // Check non-GCB/ABC BEFORE GCB — otherwise "\bgcb\b" matches inside "non-GCB".
  const cellOfOrigin: "GCB" | "ABC" | "non_GCB" | "unknown" = /\babc\b/.test(dx)
    ? "ABC"
    : /non-?gcb|non gcb/.test(dx)
      ? "non_GCB"
      : /\bgcb\b/.test(dx)
        ? "GCB"
        : "unknown";

  const physiologicallyFit = eco == null ? age < 80 : eco <= 1;

  const all = clinicalText(raw);
  const stageMatch = dx.match(/stage\s+(iv|iii|ii|i)\s*([ab])?/i);
  const stage = stageMatch ? (stageMatch[1] + (stageMatch[2] ?? "")).toUpperCase() : "";
  const bSymptoms = /night sweats|b symptoms|weight loss|drenching/.test(all) || /[iv]+b$/i.test(stage);
  const doubleHit = /double.?hit/.test(dx) && !/negative|like/.test(dx);
  const firstLineText = firstLine(raw);
  const anthracycline = /chop|epoch|anthracyc/i.test(firstLineText) || /chop|anthracyc/.test(all);

  // Neurologic (from any clinical text)
  let neuropathyGrade = 0;
  if (/neuropath/.test(all)) {
    const m = all.match(/grade\s*(\d)[^|]*neuropath/) || all.match(/neuropath[^|]*grade\s*(\d)/);
    neuropathyGrade = m ? Number(m[1]) : 1;
  }
  const footDrop = /foot drop/.test(all);
  const vincristineNeuropathy = /vincristine|vinca/.test(all) && (/neuropath/.test(all) || footDrop);

  // Relapse timing from the clinical text (else fall back to primary-refractory).
  let relapseTiming: "early" | "late" | "na" = "na";
  if (/early relapse|within 12 months|<\s*12\s*month|refractory/.test(all)) relapseTiming = "early";
  else if (/late relapse|>\s*12\s*month/.test(all) || /relapse[^|]*\b\d+\s*years?/.test(all)) relapseTiming = "late";
  else if (primaryRefractory) relapseTiming = "early";

  const lvef = obs(raw, "lvef");
  const egfr = obs(raw, "egfr");
  const ldh = obs(raw, "ldh");
  const hgb = obs(raw, "hemoglobin").num ?? obs(raw, "hgb").num;
  const hbv = obs(raw, "hepatitis b");
  const hcv = obs(raw, "hepatitis c");
  const diagnosis = raw.encounter_fhir.related_resources?.Condition?.[0]?.code?.text ?? "";

  const lvefBaselineObs = (raw.encounter_fhir.related_resources?.Observation ?? []).find((o) => {
    const t = (o.code?.text ?? "").toLowerCase();
    return t.includes("lvef") && (t.includes("original") || t.includes("baseline"));
  });
  const lvefBaseline = lvefBaselineObs?.valueQuantity?.value ?? null;
  let ldhRatio = ldh.num != null ? Math.round((ldh.num / 250) * 100) / 100 : null;
  if (ldhRatio == null && ldh.str) {
    const m = ldh.str.match(/([\d.]+)\s*x/i); // e.g. "~1.3x ULN"
    if (m) ldhRatio = Number(m[1]);
  }

  const parsed = ChartExtract.safeParse({
    patient: { name: patientName(raw), mrn: String((raw.patient_context.patient as { id?: string }).id ?? ""), sex: raw.patient_context.patient.gender ?? "unknown" },
    line: 2,
    region: "US",
    transplant_intent: age >= 75 ? "ineligible" : "intended",
    refractoriness: { primary_refractory: primaryRefractory },
    disease: {
      diagnosis,
      stage,
      b_symptoms: bSymptoms,
      sites: "",
      largest_mass_cm: null,
      ki67: null,
      ldh_uln_ratio: ldhRatio,
      chemosensitive: !primaryRefractory,
      relapse_timing: relapseTiming,
      cell_of_origin: cellOfOrigin,
      cns_involvement: cnsInvolved,
      cns_compartment: compartment,
      molecular: { myc_positive: mycPositive, myc_method: mycMethod, double_hit: doubleHit },
    },
    fitness: { age, ecog: eco ?? 1, cell_therapy_fit: physiologicallyFit },
    organ: {
      lvef_current: lvef.num,
      lvef_baseline: lvefBaseline,
      egfr: egfr.str ?? "",
      hepatitis_status: [hbv.str ? `HBV ${hbv.str}` : "", hcv.str ? `HCV ${hcv.str}` : ""].filter(Boolean).join("; "),
    },
    neuro: { neuropathy_grade: neuropathyGrade, foot_drop_history: footDrop },
    prior: {
      first_line: firstLineText,
      prior_response: primaryRefractory ? "refractory to first line" : "",
      anthracycline_exposed: anthracycline,
      vincristine_neuropathy: vincristineNeuropathy,
      cd19_directed: false,
    },
    labs: {
      hgb,
      other: [ldh.str ? `LDH ${ldh.str}` : "", obs(raw, "creatinine").str ? `Cr ${obs(raw, "creatinine").str}` : ""].filter(Boolean).join("; "),
    },
    social: { distance_minutes: null, lives_with_spouse: false },
    geriatric_assessment: { completed: false },
  });
  if (!parsed.success) throw new Error(`chart: extract failed validation:\n${parsed.error.toString()}`);
  return parsed.data;
}

/** Full, human-readable chart summary for the reasoner prompt (NO note / AVS). */
export function chartSummary(chart: ChartExtract): string {
  const d = chart.disease;
  const o = chart.organ;
  const p = chart.prior;
  const line = (label: string, v: unknown) =>
    v === null || v === undefined || v === "" ? null : `${label}: ${v}`;
  return [
    line("Patient", [chart.patient.name, chart.patient.sex, `age ${chart.fitness.age}`].filter(Boolean).join(", ")),
    line("Line of therapy", chart.line),
    line("Diagnosis", d.diagnosis),
    line("Cell of origin", d.cell_of_origin),
    line("MYC", d.molecular.myc_positive ? d.molecular.myc_method : "negative"),
    line("Double-hit", d.molecular.double_hit),
    line("Ki-67 (%)", d.ki67),
    line("Stage", d.stage),
    line("B symptoms", d.b_symptoms),
    line("Sites", d.sites),
    line("Largest mass (cm)", d.largest_mass_cm),
    line("LDH (x ULN)", d.ldh_uln_ratio),
    line("Primary-refractory", chart.refractoriness.primary_refractory),
    line("Chemosensitive", d.chemosensitive),
    line("Relapse timing", d.relapse_timing),
    line("CNS involvement", d.cns_involvement ? `yes${d.cns_compartment.length ? ` (${d.cns_compartment.join(", ")})` : ""}` : "no"),
    line("ECOG", chart.fitness.ecog),
    line("Cardiac LVEF", o.lvef_current != null ? `${o.lvef_current}%${o.lvef_baseline != null ? ` (baseline ${o.lvef_baseline}%)` : ""}` : null),
    line("eGFR", o.egfr),
    line("Hepatitis", o.hepatitis_status),
    line("Peripheral neuropathy grade", chart.neuro.neuropathy_grade),
    line("Prior foot drop", chart.neuro.foot_drop_history),
    line("Prior first line", p.first_line),
    line("Prior response", p.prior_response),
    line("Anthracycline exposed", p.anthracycline_exposed),
    line("Prior vincristine neuropathy", p.vincristine_neuropathy),
    line("Prior CD19-directed therapy", p.cd19_directed),
    line("Hemoglobin (g/dL)", chart.labs.hgb),
    line("Other labs", chart.labs.other),
    line("Transplant intent", chart.transplant_intent),
    line("Physiologic cell-therapy fitness", chart.fitness.cell_therapy_fit),
    line("Distance to center (min)", chart.social.distance_minutes),
    line("Lives with spouse", chart.social.lives_with_spouse),
    line("Geriatric assessment completed", chart.geriatric_assessment.completed),
  ]
    .filter(Boolean)
    .join("\n");
}
