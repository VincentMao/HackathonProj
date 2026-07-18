/**
 * Anthropic client + structured-output helper.
 *
 * Orchestration is written directly against tool use (no LangChain / agent framework).
 * `structured()` forces a single tool call, parses the input with the provided zod
 * schema, and retries once on validation failure before failing loud.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export interface StructuredOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

// TODO(pipeline): implement forced tool-use call -> zod.parse -> retry once -> throw.
// Keep the note/after_visit_summary OUT of every prompt (enforced by tests/).
export async function structured<T>(_opts: StructuredOptions<T>): Promise<T> {
  throw new Error("structured() not yet implemented — see docs/design/build-plan.md");
}
