/**
 * Pipeline orchestration + the cached/live execution wrapper.
 *
 * runPipeline() is the single code path: signals -> reasoner x2 -> verifier.
 * getResult() memoizes on sha256(caseId + transcript): a preloaded transcript hits a
 * baked fixture (Case A/B, instant); a judge-edited transcript misses and runs live
 * (Case C) through the IDENTICAL runPipeline. Cached and live are literally one function.
 */
import type { PipelineResult } from "./contracts";
import type { RawCase } from "./chart";

// TODO(pipeline): signals -> reasoner(pre: chart-only) + reasoner(post: chart+signals)
// -> verifier(rule-check + in-context grounding). Fixtures are baked by running this.
export async function runPipeline(_raw: RawCase, _transcript: string): Promise<PipelineResult> {
  throw new Error("runPipeline() not yet implemented — see docs/design/build-plan.md");
}

// TODO(pipeline): fixture lookup by content hash; fall through to runPipeline on miss.
export async function getResult(_caseId: string, _transcript: string): Promise<PipelineResult> {
  throw new Error("getResult() not yet implemented — see docs/design/build-plan.md");
}
