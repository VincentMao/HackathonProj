/**
 * Case-loading endpoint. GET /api/case?caseId=... -> { caseId, chart, transcript }.
 * The client uses this to populate the editable chart form and transcript when a starting
 * case is loaded. `chart` is the deterministic ChartExtract (the same one the pipeline uses).
 */
import { NextResponse } from "next/server";
import { loadCase } from "@/lib/data";
import { extractChart } from "@/lib/chart";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caseId = new URL(req.url).searchParams.get("caseId");
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  try {
    const raw = loadCase(caseId);
    return NextResponse.json({ caseId, chart: extractChart(raw), transcript: raw.transcript });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "load error" }, { status: 404 });
  }
}
