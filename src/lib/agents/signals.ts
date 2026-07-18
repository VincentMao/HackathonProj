/**
 * Signal extractor (LLM). Pulls decision variables from the transcript, each with a
 * VERBATIM evidence_span, into VisitSignals. Reads the transcript ONLY — never the
 * chart note or after-visit summary.
 */
import type { VisitSignals } from "../contracts";

// TODO(pipeline): structured() call over the transcript -> VisitSignals (validated).
export async function extractSignals(_caseId: string, _transcript: string): Promise<VisitSignals> {
  throw new Error("extractSignals() not yet implemented — see docs/design/build-plan.md");
}
