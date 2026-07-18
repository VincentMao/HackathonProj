/**
 * Bake cached fixtures for Cases A and B by running the REAL runPipeline once and saving the
 * output to data/fixtures/. This guarantees cached and live outputs come from the identical
 * code path. Requires ANTHROPIC_API_KEY. Run: npm run bake:fixtures
 *
 * NOTE: the committed fixtures were authored from the gold clinical content so the demo runs
 * without a key; run this to regenerate them from live inference once a key is configured.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCase } from "../src/lib/data";
import { extractChart } from "../src/lib/chart";
import { runPipeline } from "../src/lib/pipeline";

const TARGETS: Array<[string, string]> = [
  ["SYN-A-0001::SYN-A-ENC-0001", "case-A.result.json"],
  ["SYN-B-0001::SYN-B-ENC-0001", "case-B.result.json"],
];

async function main() {
  for (const [caseId, file] of TARGETS) {
    const raw = loadCase(caseId);
    const result = await runPipeline(caseId, extractChart(raw), raw.transcript, "cached");
    const path = join(process.cwd(), "data", "fixtures", file);
    writeFileSync(path, JSON.stringify(result, null, 2) + "\n");
    console.log(`✓ baked ${file}`);
  }
}

main().catch((e) => {
  console.error("bake-fixtures failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
