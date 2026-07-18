/**
 * Bake cached fixtures for Cases A and B by running the REAL runPipeline once and saving
 * the output to data/fixtures/, keyed by sha256(caseId + transcript). This guarantees
 * cached and live outputs come from the identical code path.
 *
 * Run: npm run bake:fixtures
 */
// TODO(pipeline): load cases, runPipeline(chart, transcript), write data/fixtures/<hash>.json.
export {};
