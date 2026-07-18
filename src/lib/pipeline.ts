/**
 * Pipeline orchestration + the cached/live execution wrapper.
 *
 * runPipeline() is the single code path: signals -> reasoner x2 -> verifier.
 * getResult() returns a baked fixture for a preloaded case (empty transcript override) and
 * otherwise runs live through the IDENTICAL runPipeline — so cached and live are one function.
 */
import { PipelineResult } from "./contracts";
import type { ExecutionMode } from "./contracts";
import { extractChart, type RawCase } from "./chart";
import { extractSignals } from "./agents/signals";
import { reason } from "./agents/reasoner";
import { verify } from "./agents/verifier";
import { loadRuleTable, loadCase, loadFixture } from "./data";

export async function runPipeline(
  caseId: string,
  raw: RawCase,
  transcript: string,
  mode: ExecutionMode = "live",
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const chart = extractChart(raw);
  const rules = loadRuleTable();
  const signals = await extractSignals(caseId, transcript, mode, signal);
  const recommendations = await reason(caseId, chart, rules, signals, signal);
  const verifier = await verify(caseId, chart, signals, recommendations, rules);
  return PipelineResult.parse({ case_id: caseId, mode, signals, recommendations, verifier });
}

/**
 * Cached for a preloaded case (no transcript override), live otherwise.
 * The page sends an empty transcript for Cases A/B (cache hit) and a real transcript for C.
 */
export async function getResult(caseId: string, transcript: string): Promise<PipelineResult> {
  const override = transcript.trim();
  if (override === "") {
    const fixture = loadFixture(caseId);
    if (fixture) return fixture;
  }
  const raw = loadCase(caseId);
  const effective = override === "" ? raw.transcript : transcript;
  return runPipeline(caseId, raw, effective, "live");
}
