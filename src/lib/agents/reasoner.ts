/**
 * Reasoner (LLM), runs twice:
 *   pass 1 (pre)  = chart only
 *   pass 2 (post) = chart + VisitSignals
 * Reads the rule table; ranks over the committed RegimenId set; emits off_guideline as a
 * first-class field. Deterministic exclusions/flags from rules.json are applied in code
 * after ranking (the LLM does not get the final say on exclusions).
 */
import type { RecommendationSet } from "../contracts";
import type { ChartExtract } from "../rules";
import type { VisitSignals } from "../contracts";

// TODO(pipeline): two structured() passes + code-applied rule exclusions -> RecommendationSet.
export async function reason(
  _caseId: string,
  _chart: ChartExtract,
  _signals: VisitSignals | null,
): Promise<RecommendationSet> {
  throw new Error("reason() not yet implemented — see docs/design/build-plan.md");
}
