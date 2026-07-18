/**
 * Verifier: (1) deterministic rule-check over rules.json against the merged evaluation
 * context, then (2) in-context grounding of every rationale / exclusion / off-guideline
 * claim against the evidence pack. Retrieval lives ONLY here, after the recommendation
 * exists. On grounding timeout, degrade to `unverified` chips (degraded: true) rather
 * than hanging.
 */
import type { RecommendationSet, VerifierReport, VisitSignals } from "../contracts";
import type { ChartExtract } from "../rules";

// TODO(pipeline): rule-check (pure) + grounding (LLM, timeout-guarded) -> VerifierReport.
export async function verify(
  _caseId: string,
  _chart: ChartExtract,
  _signals: VisitSignals,
  _recs: RecommendationSet,
): Promise<VerifierReport> {
  throw new Error("verify() not yet implemented — see docs/design/build-plan.md");
}
