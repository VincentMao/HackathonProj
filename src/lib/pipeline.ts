/**
 * Pipeline orchestration + the cached/live execution wrapper.
 *
 * runPipeline() is the single code path: signals -> reasoner x2 -> verifier.
 * getResult() returns a baked fixture for a preloaded case with no edits, and otherwise
 * runs live through the IDENTICAL runPipeline — so cached and live are one function.
 * A live run may override the chart (edited facts) and/or the transcript (new symptoms).
 */
import { PipelineResult } from "./contracts";
import type { ExecutionMode } from "./contracts";
import { extractChart } from "./chart";
import type { ChartExtract } from "./rules";
import { extractSignals } from "./agents/signals";
import { reason } from "./agents/reasoner";
import { verify } from "./agents/verifier";
import { loadRuleTable, loadCase, loadFixture } from "./data";

export async function runPipeline(
  caseId: string,
  chart: ChartExtract,
  transcript: string,
  mode: ExecutionMode = "live",
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const rules = loadRuleTable();
  const signals = await extractSignals(caseId, transcript, mode, signal);
  const recommendations = await reason(caseId, chart, rules, signals, signal);
  const verifier = await verify(caseId, chart, signals, recommendations, rules);
  return PipelineResult.parse({ case_id: caseId, mode, signals, recommendations, verifier });
}

/**
 * Cached when a preloaded case is requested with no edits (no transcript, no chart override);
 * live otherwise. The page sends no overrides on load (cache hit) and the current chart +
 * transcript on "Run live" (cache miss -> identical live path).
 */
export async function getResult(
  caseId: string,
  transcript: string,
  chartOverride?: ChartExtract,
): Promise<PipelineResult> {
  const edited = transcript.trim() !== "" || !!chartOverride;
  if (!edited) {
    const fixture = loadFixture(caseId);
    if (fixture) return fixture;
  }
  const raw = loadCase(caseId);
  const chart = chartOverride ?? extractChart(raw);
  const effective = transcript.trim() === "" ? raw.transcript : transcript;
  return runPipeline(caseId, chart, effective, "live");
}
