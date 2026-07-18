/**
 * Signal extractor (LLM). Pulls decision variables from the TRANSCRIPT ONLY, each with a
 * VERBATIM evidence_span, into VisitSignals. Never receives the chart note or AVS.
 */
import { VisitSignals, SignalKey } from "../contracts";
import { structured } from "../anthropic";
import { z } from "zod";

const Extracted = z.object({
  signals: z.array(
    z.object({
      key: SignalKey,
      label: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      evidence_span: z.string(),
      salience: z.enum(["high", "med", "low"]),
    }),
  ),
});

const JSON_SCHEMA = {
  type: "object",
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: SignalKey.options },
          label: { type: "string" },
          value: {},
          evidence_span: { type: "string", description: "VERBATIM substring of the transcript" },
          salience: { type: "string", enum: ["high", "med", "low"] },
        },
        required: ["key", "label", "value", "evidence_span", "salience"],
      },
    },
  },
  required: ["signals"],
};

const SYSTEM =
  "You extract decision-relevant signals from an oncology clinic conversation for relapsed/refractory " +
  "aggressive B-cell lymphoma. Only report signals actually present in the transcript. Every signal's " +
  "evidence_span MUST be a verbatim substring copied from the transcript — never paraphrased. Use only " +
  "the provided signal keys. Do not infer the treatment plan; just surface what the room reveals.";

export async function extractSignals(
  caseId: string,
  transcript: string,
  mode: "cached" | "live" = "live",
  signal?: AbortSignal,
): Promise<VisitSignals> {
  const out = await structured({
    system: SYSTEM,
    user: `Transcript:\n\n${transcript}`,
    schema: Extracted,
    jsonSchema: JSON_SCHEMA,
    toolName: "report_signals",
    toolDescription: "Report the conversation-surfaced decision signals.",
    signal,
  });
  return VisitSignals.parse({
    case_id: caseId,
    mode,
    signals: out.signals.map((s) => ({ ...s, ref: `visit.${s.key}` })),
  });
}
