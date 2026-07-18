/**
 * Anthropic client + structured-output helper.
 *
 * Orchestration is written directly against tool use (no LangChain / agent framework).
 * `structured()` forces one tool call, parses tool input with the provided zod schema,
 * and retries once on validation failure before failing loud. Keep note/after_visit_summary
 * OUT of every prompt (enforced by tests/).
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — live inference unavailable (cached fixtures still work).");
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export interface StructuredOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** JSON Schema for the tool input (hand-written to match `schema`). */
  jsonSchema: Record<string, unknown>;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export async function structured<T>(opts: StructuredOptions<T>): Promise<T> {
  const c = client();
  const call = async (): Promise<T> => {
    const msg = await c.messages.create(
      {
        model: MODEL,
        max_tokens: opts.maxTokens ?? 2048,
        system: opts.system,
        tools: [
          {
            name: opts.toolName,
            description: opts.toolDescription,
            input_schema: opts.jsonSchema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: opts.toolName },
        messages: [{ role: "user", content: opts.user }],
      },
      { signal: opts.signal },
    );
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error(`${opts.toolName}: model did not call the tool`);
    return opts.schema.parse(block.input);
  };

  try {
    return await call();
  } catch (err) {
    if (err instanceof z.ZodError) return await call(); // one retry on schema mismatch
    throw err;
  }
}
