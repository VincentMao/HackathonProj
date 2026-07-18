/**
 * UI-layer label maps and provenance helpers.
 * These live in the UI (never in the contracts): they turn enum tokens into
 * human-legible strings and derive chip styling from a ref prefix.
 */
import type { RegimenId, Verdict } from "@/lib/contracts";

/** Human labels for regimen enum tokens. */
export const REGIMEN_LABEL: Record<RegimenId, string> = {
  R_DHAP: "R-DHAP",
  R_ICE: "R-ICE",
  R_GEMOX: "R-GemOx",
  POLA_MOSUN: "Pola + Mosunetuzumab",
  EPCOR_GEMOX: "Epcoritamab + GemOx",
  POLA_BR: "Pola-BR",
  GLOFIT_GEMOX: "Glofitamab + GemOx",
  TAFA_LEN: "Tafasitamab + Lenalidomide",
  CAR_T_AXICEL: "Axi-cel",
  CAR_T_LISOCEL: "Liso-cel",
  CNS_SALVAGE_MATRIX: "CNS-directed salvage (MATRix/MARIETTA)",
  BSC_GOC: "Best supportive care / goals-of-care",
};

/** One-line clinical gloss shown under the regimen name. */
export const REGIMEN_SUBLABEL: Record<RegimenId, string> = {
  R_DHAP: "Platinum / ara-C salvage — CNS-active",
  R_ICE: "Platinum salvage — poor CNS penetration",
  R_GEMOX: "Gem/Ox salvage backbone",
  POLA_MOSUN: "Mosunetuzumab + polatuzumab (SUNMO)",
  EPCOR_GEMOX: "Epcoritamab + GemOx (EPCORE NHL-2)",
  POLA_BR: "Pola-bendamustine-rituximab (3L+)",
  GLOFIT_GEMOX: "Glofitamab + GemOx (STARGLO)",
  TAFA_LEN: "Tafasitamab-lenalidomide (L-MIND)",
  CAR_T_AXICEL: "Axicabtagene ciloleucel (ZUMA-7)",
  CAR_T_LISOCEL: "Lisocabtagene maraleucel — lower ICANS",
  CNS_SALVAGE_MATRIX: "HD-MTX / cytarabine / thiotepa + intrathecal",
  BSC_GOC: "Comfort-focused, goals-of-care",
};

export function regimenLabel(id: RegimenId): string {
  return REGIMEN_LABEL[id] ?? id;
}

export function regimenSubLabel(id: RegimenId): string {
  return REGIMEN_SUBLABEL[id] ?? "";
}

/** Provenance kind derived from a ref prefix. Never guess — always derive. */
export type RefKind = "chart" | "visit";

export function refKind(ref: string): RefKind {
  return ref.startsWith("visit.") ? "visit" : "chart";
}

/** Turn a ref into a short human label, e.g. "chart.fitness.age" -> "Age". */
const REF_LABEL_OVERRIDES: Record<string, string> = {
  "chart.fitness.age": "Age",
  "chart.fitness.cell_therapy_fit": "Cell-therapy fitness",
  "chart.refractoriness.primary_refractory": "Primary-refractory",
  "chart.disease.cns_involvement": "CNS involvement",
  "chart.disease.cns_compartment": "CNS compartment",
  "chart.transplant_intent": "Transplant intent",
  "visit.new_neuro_symptoms": "New neuro symptoms",
  "visit.treatment_intent": "Treatment intent",
  "visit.caregiver_reliability": "Caregiver reliability",
  "visit.functional_narrative": "Functional status",
  "visit.distance_to_center_minutes": "Distance to center",
  "visit.gentler_vs_active_preference": "Active preference",
};

export function refLabel(ref: string): string {
  if (REF_LABEL_OVERRIDES[ref]) return REF_LABEL_OVERRIDES[ref];
  const tail = ref.split(".").slice(1).join(".");
  return tail
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Verdict → badge presentation. Colors reference tailwind.config verdict.* tokens. */
export interface VerdictStyle {
  label: string;
  chip: string; // full tailwind class string (static, purge-safe)
  dot: string;
}

export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  verified: {
    label: "Verified",
    chip: "border-verdict-verified/40 bg-verdict-verified/10 text-verdict-verified",
    dot: "bg-verdict-verified",
  },
  off_guideline_explained: {
    label: "Off-guideline · explained",
    chip: "border-verdict-off_guideline/40 bg-verdict-off_guideline/10 text-verdict-off_guideline",
    dot: "bg-verdict-off_guideline",
  },
  excluded: {
    label: "Excluded",
    chip: "border-verdict-excluded/40 bg-verdict-excluded/10 text-verdict-excluded",
    dot: "bg-verdict-excluded",
  },
  flagged: {
    label: "Flagged",
    chip: "border-verdict-flagged/40 bg-verdict-flagged/10 text-verdict-flagged",
    dot: "bg-verdict-flagged",
  },
  unverified: {
    label: "Unverified",
    chip: "border-dashed border-verdict-excluded/50 bg-transparent text-verdict-excluded",
    dot: "bg-verdict-excluded",
  },
};

/** Case registry — ids, display names, and a chart summary for the header. */
export interface ChartSummary {
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  refractoriness: string;
  priorLine: string;
  ecog: string;
  note: string;
}

export interface CaseMeta {
  key: "A" | "B" | "C";
  caseId: string;
  title: string;
  scenario: string;
  chart: ChartSummary;
  /** Baseline transcript shown for Case C; A/B rely on the cached fixture. */
  transcript: string;
}

export const CASES: Record<"A" | "B" | "C", CaseMeta> = {
  A: {
    key: "A",
    caseId: "SYN-A-0001::SYN-A-ENC-0001",
    title: "Gerald Okafor",
    scenario: "The room surfaces a symptom that reroutes and escalates the plan.",
    chart: {
      name: "Gerald Okafor",
      age: 62,
      sex: "M",
      diagnosis: "Transformed high-grade B-cell lymphoma (double-hit-like)",
      refractoriness: "Primary-refractory",
      priorLine: "R-CHOP ×6",
      ecog: "ECOG 1",
      note: "Fit, working full-time, strong caregiver support.",
    },
    transcript: "",
  },
  B: {
    key: "B",
    caseId: "SYN-B-0001::SYN-B-ENC-0001",
    title: "Dorothy Ferreira",
    scenario: "Age on the chart says gentle; the room says do not under-treat.",
    chart: {
      name: "Dorothy Ferreira",
      age: 86,
      sex: "F",
      diagnosis: "Primary-refractory DLBCL, GCB (not double-hit)",
      refractoriness: "Primary-refractory",
      priorLine: "Mini-R-CHOP ×6",
      ecog: "ECOG 1",
      note: "Robust, independent, gardens daily; lives alone, 90 min from center.",
    },
    transcript: "",
  },
  C: {
    key: "C",
    caseId: "SYN-C-0001::SYN-C-ENC-0001",
    title: "Live case",
    scenario: "Type the room. Run the pipeline live.",
    chart: {
      name: "Live patient",
      age: 74,
      sex: "—",
      diagnosis: "Relapsed/refractory aggressive B-cell lymphoma",
      refractoriness: "Refractory",
      priorLine: "R-CHOP",
      ecog: "ECOG —",
      note: "Edit the transcript below and run the pipeline live.",
    },
    transcript:
      "DR: Good to see you. Before we talk treatment, tell me how you're actually doing day to day.\nPT: Honestly, not bad. I keep busy.\nDR: Any new symptoms since we last spoke?\nPT: ",
  },
};

/** Suggested sentences a judge can append to the Case C transcript. */
export const CASE_C_SUGGESTIONS: string[] = [
  "Still gardening every day",
  "Lives 90 minutes away",
  "New back pain and leg weakness",
];
