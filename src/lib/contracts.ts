/**
 * Consilium data contracts — the locked interfaces between pipeline stages.
 *
 * These are enforced with zod at every LLM boundary (structured output -> parse ->
 * retry once -> fail loud). Nothing renders that hasn't passed through here.
 *
 * Provenance rule: a `ref` prefix determines the chip type in the UI.
 *   "chart.*"  -> chart-derived chip
 *   "visit.*"  -> conversation-derived chip
 * Never guess provenance; always derive it from the ref.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Shared enums
 * ------------------------------------------------------------------ */

/** Committed regimen enum. Fail loud on anything outside this set. */
export const RegimenId = z.enum([
  "R_DHAP", // platinum/ara-C salvage (CNS-active)
  "R_ICE", // platinum salvage (poor CNS penetration)
  "R_GEMOX", // gem/ox salvage backbone
  "POLA_MOSUN", // mosunetuzumab + polatuzumab (SUNMO)
  "EPCOR_GEMOX", // epcoritamab + GemOx (EPCORE NHL-2; off-label 2L)
  "POLA_BR", // pola-bendamustine-rituximab (3L+; bendamustine sequencing hazard)
  "GLOFIT_GEMOX", // STARGLO — US-unavailable (CRL 2025-07-18)
  "TAFA_LEN", // tafasitamab-lenalidomide (L-MIND; excluded in primary-refractory)
  "CAR_T_AXICEL", // axi-cel (ZUMA-7)
  "CAR_T_LISOCEL", // liso-cel (TRANSFORM/PILOT; lower ICANS)
  "CNS_SALVAGE_MATRIX", // MATRix/MARIETTA-type + IT for secondary CNS
  "BSC_GOC", // best supportive care / goals-of-care
]);
export type RegimenId = z.infer<typeof RegimenId>;

/** Verdicts drive the badge color. */
export const Verdict = z.enum([
  "verified", // green
  "off_guideline_explained", // amber
  "excluded", // grey
  "flagged", // red — hard stop
  "unverified", // grey — grounding timed out / degraded
]);
export type Verdict = z.infer<typeof Verdict>;

/** Conversation-surfaced signal keys (authoritative set lives in docs/clinical/rules.rubric.md). */
export const SignalKey = z.enum([
  "treatment_intent",
  "risk_tolerance",
  "gentler_vs_active_preference",
  "willingness_prolonged_hospitalization",
  "functional_narrative",
  "adl_iadl_deficits",
  "falls_history_12mo",
  "cognition_flag",
  "polypharmacy_count",
  "mood_psych_flag",
  "caregiver_available",
  "caregiver_reliability",
  "caregiver_can_return_promptly",
  "home_environment_stability",
  "distance_to_center_minutes",
  "can_stay_near_center",
  "shared_care_feasible",
  "financial_access_barrier",
  "transportation_access",
  "new_neuro_symptoms",
  "neuropathy_severity_reported",
  "clinician_relapse_confidence",
  "prior_therapy_tolerance_narrative",
  "outside_treatment_plan_mentioned",
]);
export type SignalKey = z.infer<typeof SignalKey>;

/** A provenance ref: "chart.<path>" or "visit.<signalKey>". */
export const Ref = z.string().regex(/^(chart|visit)\..+/, "ref must start with chart. or visit.");
export type Ref = z.infer<typeof Ref>;

/** A citation_id must resolve against data/knowledge/evidence-pack.json (validated at load, fail loud). */
export const CitationId = z.string().min(1);
export type CitationId = z.infer<typeof CitationId>;

export const ExecutionMode = z.enum(["cached", "live"]);
export type ExecutionMode = z.infer<typeof ExecutionMode>;

/* ------------------------------------------------------------------ *
 * 1. VisitSignals — output of the signal extractor
 * ------------------------------------------------------------------ */

export const VisitSignal = z.object({
  key: SignalKey,
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  /** VERBATIM substring of the transcript. */
  evidence_span: z.string(),
  ref: Ref, // always visit.* here
  salience: z.enum(["high", "med", "low"]),
});
export type VisitSignal = z.infer<typeof VisitSignal>;

export const VisitSignals = z.object({
  case_id: z.string(),
  mode: ExecutionMode,
  signals: z.array(VisitSignal),
});
export type VisitSignals = z.infer<typeof VisitSignals>;

/* ------------------------------------------------------------------ *
 * 2. RecommendationSet {pre, post} — output of the reasoner (runs twice)
 * ------------------------------------------------------------------ */

export const Recommendation = z.object({
  regimen: RegimenId,
  rank: z.number().int().nonnegative(), // 1 = top; 0 = excluded sentinel (sorted to bottom)
  intent: z.enum(["curative", "disease_control", "palliative"]),
  status: z.enum(["preferred", "candidate", "excluded", "off_guideline"]),
  rationale: z.array(z.object({ text: z.string(), ref: Ref })),
  /** The attributes this option hinges on ("age is not the decision"). */
  depends_on: z.array(Ref),
  off_guideline: z
    .object({
      boundary: z.string(),
      citation_id: CitationId,
      tradeoff: z.string(),
    })
    .nullable(),
});
export type Recommendation = z.infer<typeof Recommendation>;

/** One combined ranking that considers chart + room together (no separate pre/post). */
export const RecommendationSet = z.object({
  case_id: z.string(),
  options: z.array(Recommendation),
});
export type RecommendationSet = z.infer<typeof RecommendationSet>;

/* ------------------------------------------------------------------ *
 * 3. VerifierReport — per-plan verification
 *    The verifier checks each INCLUDED plan against the rules + evidence and surfaces
 *    the things a doctor should attend to (off-label boundaries, safety cautions,
 *    sequencing hazards), plus the citations that support the plan.
 * ------------------------------------------------------------------ */

export const PlanFlag = z.object({
  severity: z.enum(["hard", "attention", "info"]), // hard = safety/efficacy stop; attention = review; info = note
  text: z.string(),
  citation_id: CitationId.nullable(),
});
export type PlanFlag = z.infer<typeof PlanFlag>;

export const PlanVerification = z.object({
  regimen: RegimenId,
  verdict: Verdict, // verified | off_guideline_explained | flagged
  citations: z.array(CitationId), // evidence supporting this plan
  flags: z.array(PlanFlag), // things needing the doctor's attention
});
export type PlanVerification = z.infer<typeof PlanVerification>;

export const VerifierReport = z.object({
  case_id: z.string(),
  plans: z.array(PlanVerification),
  degraded: z.boolean(), // true if the evidence step timed out
});
export type VerifierReport = z.infer<typeof VerifierReport>;

/* ------------------------------------------------------------------ *
 * 4. Decision — clinician action (append-only local log)
 * ------------------------------------------------------------------ */

export const Decision = z.object({
  case_id: z.string(),
  chosen_regimen: RegimenId,
  action: z.enum(["accept", "override"]),
  override_reason: z.string().nullable(),
  recommendation_snapshot: RecommendationSet,
  verifier_snapshot: VerifierReport,
  ts: z.string(), // ISO; injected at call time, never inside the pure pipeline
});
export type Decision = z.infer<typeof Decision>;

/* ------------------------------------------------------------------ *
 * 5. TODO summary — the summarizer turns the selected plan(s) into an actionable
 *    clinical to-do list (orders, workup, consent, referrals, monitoring, coordination)
 *    to hand off to downstream clinical workflow.
 * ------------------------------------------------------------------ */

export const TodoItem = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["order", "workup", "consent", "referral", "monitoring", "supportive", "coordination", "other"]),
  regimen: RegimenId.nullable(), // which selected plan this task belongs to (null = shared/cross-cutting)
});
export type TodoItem = z.infer<typeof TodoItem>;

export const TodoList = z.object({ todos: z.array(TodoItem) });
export type TodoList = z.infer<typeof TodoList>;

/* ------------------------------------------------------------------ *
 * Pipeline result envelope
 * ------------------------------------------------------------------ */

export const PipelineResult = z.object({
  case_id: z.string(),
  mode: ExecutionMode,
  signals: VisitSignals,
  recommendations: RecommendationSet,
  verifier: VerifierReport,
});
export type PipelineResult = z.infer<typeof PipelineResult>;
