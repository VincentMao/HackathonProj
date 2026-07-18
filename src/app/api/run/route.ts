/**
 * Live pipeline endpoint. POST { caseId, transcript } -> PipelineResult.
 * Case C (and any transcript override) runs through the identical getResult()/runPipeline
 * path; Cases A/B return cached fixtures. Missing API key -> 501 so the client degrades.
 */
import { NextResponse } from "next/server";
import { getResult } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { caseId?: string; transcript?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { caseId, transcript } = body;
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  try {
    const result = await getResult(caseId, transcript ?? "");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline error";
    const noKey = message.includes("ANTHROPIC_API_KEY");
    return NextResponse.json({ error: message }, { status: noKey ? 501 : 500 });
  }
}
