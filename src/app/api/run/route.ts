/**
 * Live pipeline endpoint. POST { caseId, transcript?, chart? } -> PipelineResult.
 * No overrides -> cached fixture for a preloaded case. An edited transcript and/or chart
 * runs live through the identical getResult()/runPipeline path. 501 when no API key.
 */
import { NextResponse } from "next/server";
import { getResult } from "@/lib/pipeline";
import { ChartExtract } from "@/lib/rules";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { caseId?: string; transcript?: string; chart?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { caseId, transcript } = body;
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  let chartOverride: ReturnType<typeof ChartExtract.parse> | undefined;
  if (body.chart !== undefined && body.chart !== null) {
    const parsed = ChartExtract.safeParse(body.chart);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid chart override" }, { status: 400 });
    }
    chartOverride = parsed.data;
  }

  try {
    const result = await getResult(caseId, transcript ?? "", chartOverride);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline error";
    const noKey = message.includes("ANTHROPIC_API_KEY");
    return NextResponse.json({ error: message }, { status: noKey ? 501 : 500 });
  }
}
