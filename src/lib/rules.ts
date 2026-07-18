/**
 * Rule table loading + the evaluation contexts that rule conditions resolve against.
 *
 * A rule in data/knowledge/rules.json has a `condition` string referencing fields across
 * three contexts. The verifier evaluates each rule against:
 *     ChartExtract  U  VisitSignals(visit.*)  U  CandidateEval(candidate)
 *
 * ChartExtract + CandidateEval are defined here; VisitSignals lives in contracts.ts.
 * CandidateEval is synthesized per-recommendation from REGIMEN_ATTRS below — the
 * `therapy` / `therapy.*` / `regimen.*` / `plan.*` fields are NOT patient data.
 *
 * See docs/clinical/rules.rubric.md for the human rationale and docs/clinical/coverage.md
 * for the case-by-case rule/citation coverage map.
 */
import { z } from "zod";
import type { RegimenId, VisitSignals, RuleCheck, Verdict } from "./contracts";
import { evaluateCondition, type Ctx } from "./condition";

/* ------------------------------------------------------------------ *
 * Context 1 — ChartExtract (deterministic from the case JSON; chart.* provenance)
 * ------------------------------------------------------------------ */

export const ChartExtract = z.object({
  line: z.number().int(),
  region: z.enum(["US"]).default("US"),
  transplant_intent: z.enum(["intended", "ineligible", "undetermined"]),
  refractoriness: z.object({
    // NOTE (open item #4 for Shalin): R01 keys on primary_refractory === true.
    // Confirm Case B sets this true, or broaden R01 to include early_relapse_le6mo.
    primary_refractory: z.boolean(),
  }),
  disease: z.object({
    chemosensitive: z.boolean(),
    relapse_timing: z.enum(["early", "late", "na"]), // early <=12mo
    cell_of_origin: z.enum(["GCB", "ABC", "non_GCB", "unknown"]),
    cns_involvement: z.boolean(),
    cns_compartment: z.array(z.enum(["parenchymal", "leptomeningeal", "csf_positive"])),
    molecular: z.object({
      myc_positive: z.boolean(),
      myc_method: z.enum(["unknown", "rearrangement", "amplification", "not_tested"]),
    }),
  }),
  fitness: z.object({
    age: z.number().int(),
    // DERIVED composite (open item #5): fitness + organ + comorbidity + caregiver + logistics.
    // Never an age rule (R11). Computed, not extracted raw.
    cell_therapy_fit: z.boolean(),
  }),
  prior: z.object({
    first_line: z.string(),
    cd19_directed: z.boolean(),
  }),
  geriatric_assessment: z.object({
    completed: z.boolean(),
  }),
});
export type ChartExtract = z.infer<typeof ChartExtract>;

/* ------------------------------------------------------------------ *
 * Context 3 — CandidateEval (per-recommendation; synthesized, not patient data)
 * ------------------------------------------------------------------ */

export type TherapyClass =
  | "CD19-CAR-T"
  | "bispecific"
  | "adc"
  | "chemo_salvage"
  | "imid_combo"
  | "supportive";

export interface RegimenAttributes {
  /** Canonical string a rule condition matches on (must agree with rules.json literals). */
  therapy: string;
  class: TherapyClass;
  is_bispecific: boolean;
  contains_bendamustine: boolean;
  contains_polatuzumab: boolean;
  /** CD19-directed agent (relevant to sequencing before CD19 CAR-T, R09). */
  cd19_directed: boolean;
}

/**
 * The RegimenId -> attributes table. This is the mapping layer between the reasoner's
 * committed RegimenId enum and the string/boolean facets the rule conditions test.
 * Keep the `therapy` strings in sync with the literals in data/knowledge/rules.json.
 */
export const REGIMEN_ATTRS: Record<RegimenId, RegimenAttributes> = {
  R_DHAP: { therapy: "R-DHAP", class: "chemo_salvage", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  R_ICE: { therapy: "R-ICE", class: "chemo_salvage", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  R_GEMOX: { therapy: "R-GemOx", class: "chemo_salvage", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  POLA_MOSUN: { therapy: "mosunetuzumab+polatuzumab", class: "imid_combo", is_bispecific: true, contains_bendamustine: false, contains_polatuzumab: true, cd19_directed: false },
  EPCOR_GEMOX: { therapy: "epcoritamab+GemOx", class: "bispecific", is_bispecific: true, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  POLA_BR: { therapy: "pola-BR", class: "chemo_salvage", is_bispecific: false, contains_bendamustine: true, contains_polatuzumab: true, cd19_directed: false },
  GLOFIT_GEMOX: { therapy: "glofitamab+GemOx", class: "bispecific", is_bispecific: true, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  TAFA_LEN: { therapy: "tafasitamab-lenalidomide", class: "imid_combo", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: true },
  CAR_T_AXICEL: { therapy: "axicabtagene-ciloleucel", class: "CD19-CAR-T", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: true },
  CAR_T_LISOCEL: { therapy: "lisocabtagene-maraleucel", class: "CD19-CAR-T", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: true },
  CNS_SALVAGE_MATRIX: { therapy: "MATRix/MARIETTA", class: "chemo_salvage", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
  BSC_GOC: { therapy: "best-supportive-care", class: "supportive", is_bispecific: false, contains_bendamustine: false, contains_polatuzumab: false, cd19_directed: false },
};

/* ------------------------------------------------------------------ *
 * Rule table schema (mirror of data/knowledge/rules.json)
 * ------------------------------------------------------------------ */

export const Rule = z.object({
  rule_id: z.string(),
  condition: z.string(),
  action: z.enum(["exclude", "prefer", "deprioritize", "flag", "require_workup"]),
  therapy: z.string(),
  rationale: z.string(),
  citation_ids: z.array(z.string()),
  severity: z.enum(["hard", "soft"]),
});
export type Rule = z.infer<typeof Rule>;

export const RuleTable = z.object({
  schema_version: z.number(),
  scope: z.string(),
  rules: z.array(Rule),
});
export type RuleTable = z.infer<typeof RuleTable>;

/* ------------------------------------------------------------------ *
 * Context building + rule evaluation
 * ------------------------------------------------------------------ */

/** Plan-intent flags (Context 3, plan.*) — provisional pipeline intent, not patient data. */
export interface PlanFlags {
  intends_cellular_therapy?: boolean;
  cd19_car_t?: boolean;
  hd_mtx?: boolean;
  bridging_agent?: string | null;
}

/** Flatten ChartExtract + VisitSignals into a flat, dotted-key context. */
export function baseContext(chart: ChartExtract, signals: VisitSignals | null): Ctx {
  const ctx: Ctx = {
    line: chart.line,
    region: chart.region,
    transplant_intent: chart.transplant_intent,
    "refractoriness.primary_refractory": chart.refractoriness.primary_refractory,
    "disease.chemosensitive": chart.disease.chemosensitive,
    "disease.relapse_timing": chart.disease.relapse_timing,
    "disease.cell_of_origin": chart.disease.cell_of_origin,
    "disease.cns_involvement": chart.disease.cns_involvement,
    "disease.cns_compartment": chart.disease.cns_compartment,
    "disease.molecular.myc_positive": chart.disease.molecular.myc_positive,
    "disease.molecular.myc_method": chart.disease.molecular.myc_method,
    "fitness.age": chart.fitness.age,
    "fitness.cell_therapy_fit": chart.fitness.cell_therapy_fit,
    "prior.first_line": chart.prior.first_line,
    "prior.cd19_directed": chart.prior.cd19_directed,
    "geriatric_assessment.completed": chart.geriatric_assessment.completed,
  };
  for (const s of signals?.signals ?? []) ctx[`visit.${s.key}`] = s.value;
  return ctx;
}

/** Add Context 3 (candidate) fields for a specific regimen + plan intent. */
export function withCandidate(base: Ctx, regimen: RegimenId, plan: PlanFlags = {}): Ctx {
  const a = REGIMEN_ATTRS[regimen];
  return {
    ...base,
    therapy: a.therapy,
    "therapy.class": a.class,
    "therapy.is_bispecific": a.is_bispecific,
    "regimen.contains_bendamustine": a.contains_bendamustine,
    "regimen.contains_polatuzumab": a.contains_polatuzumab,
    "prior.cd19_directed": base["prior.cd19_directed"] ?? false,
    "plan.intends_cellular_therapy": plan.intends_cellular_therapy ?? false,
    "plan.cd19_car_t": plan.cd19_car_t ?? false,
    "plan.hd_mtx": plan.hd_mtx ?? false,
    "plan.bridging_agent": plan.bridging_agent ?? null,
  };
}

const ACTION_VERDICT: Record<Rule["action"], Verdict> = {
  exclude: "excluded",
  flag: "off_guideline_explained",
  prefer: "verified",
  deprioritize: "off_guideline_explained",
  require_workup: "verified",
};

/**
 * Evaluate every rule against the merged context. Rules whose condition references a
 * candidate field (therapy / regimen / plan) are evaluated per-candidate; others once.
 * Returns the RuleChecks that fired.
 */
export function runRuleChecks(
  table: RuleTable,
  chart: ChartExtract,
  signals: VisitSignals | null,
  candidates: RegimenId[],
  plan: PlanFlags = {},
): RuleCheck[] {
  const base = baseContext(chart, signals);
  const out: RuleCheck[] = [];
  const seen = new Set<string>();

  for (const rule of table.rules) {
    const candidateScoped = /\b(therapy|regimen|plan)\b/.test(rule.condition);
    const ctxs = candidateScoped ? candidates.map((c) => withCandidate(base, c, plan)) : [base];
    for (const ctx of ctxs) {
      let fired = false;
      try {
        fired = evaluateCondition(rule.condition, ctx);
      } catch {
        fired = false; // a malformed/unsupported condition never crashes the demo
      }
      if (!fired || seen.has(rule.rule_id)) continue;
      seen.add(rule.rule_id);
      out.push({
        rule_id: rule.rule_id,
        passed: true,
        verdict: rule.severity === "hard" && rule.action === "exclude" ? "flagged" : ACTION_VERDICT[rule.action],
        message: rule.rationale,
        citation_id: rule.citation_ids[0] ?? null,
      });
    }
  }
  return out;
}
