/**
 * Live pipeline endpoint. POST { caseId, transcript } -> PipelineResult.
 * Case C (and any cache miss) runs here through the identical getResult()/runPipeline path.
 */
import { NextResponse } from "next/server";

export async function POST(_req: Request) {
  // TODO(pipeline): parse { caseId, transcript }, call getResult(), return PipelineResult.
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
