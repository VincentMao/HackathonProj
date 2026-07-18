/**
 * Summary endpoint. POST { chart, plans, verifications } -> { todos }.
 * Turns the doctor's selected plan(s) into an actionable clinical to-do list. 501 without a key.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Recommendation, PlanVerification } from "@/lib/contracts";
import { ChartExtract } from "@/lib/rules";
import { summarizeTodos } from "@/lib/agents/summarizer";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  chart: ChartExtract,
  plans: z.array(Recommendation),
  verifications: z.array(PlanVerification),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "invalid summary request" }, { status: 400 });
  if (parsed.data.plans.length === 0) return NextResponse.json({ todos: [] });

  try {
    const todos = await summarizeTodos(parsed.data.chart, parsed.data.plans, parsed.data.verifications);
    return NextResponse.json({ todos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "summary error";
    const noKey = message.includes("ANTHROPIC_API_KEY");
    return NextResponse.json({ error: message }, { status: noKey ? 501 : 500 });
  }
}
