/**
 * Server-side loaders for the knowledge assets, cases, and baked fixtures.
 * Everything is validated on load (fail loud) so a bad asset never reaches the pipeline.
 * Server-only (uses fs) — import from API routes / scripts, never from client components.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PipelineResult } from "./contracts";
import { RuleTable } from "./rules";
import type { RawCase } from "./chart";

const ROOT = process.cwd();
const KNOWLEDGE = join(ROOT, "data", "knowledge");
const CASES = join(ROOT, "data", "cases");
const FIXTURES = join(ROOT, "data", "fixtures");

function readJson<T>(path: string, schema: z.ZodType<T>, label: string): T {
  if (!existsSync(path)) throw new Error(`data: missing ${label} at ${path}`);
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(`data: ${label} failed validation:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}

/* ------------------------------ knowledge ------------------------------ */

export const EvidenceEntry = z.object({
  citation_id: z.string(),
  trial_name: z.string(),
  population: z.string(),
  finding: z.string(),
  anchor_quote: z.string(),
  evidence_strength: z.string(),
  doi: z.string(),
  pmid: z.string(),
  limits: z.string(),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntry>;

export const EvidencePack = z.object({
  schema_version: z.number(),
  entries: z.array(EvidenceEntry),
});
export type EvidencePack = z.infer<typeof EvidencePack>;

let _rules: RuleTable | null = null;
let _pack: EvidencePack | null = null;

export function loadRuleTable(): RuleTable {
  if (!_rules) _rules = readJson(join(KNOWLEDGE, "rules.json"), RuleTable, "rules.json");
  return _rules;
}

export function loadEvidencePack(): EvidencePack {
  if (!_pack) _pack = readJson(join(KNOWLEDGE, "evidence-pack.json"), EvidencePack, "evidence-pack.json");
  return _pack;
}

/** Set of valid citation_ids; used to fail loud on dangling references. */
export function citationIds(): Set<string> {
  return new Set(loadEvidencePack().entries.map((e) => e.citation_id));
}

/* -------------------------------- cases -------------------------------- */

const CASE_FILES: Record<string, string> = {
  "SYN-A-0001::SYN-A-ENC-0001": "consilium-case-A.json",
  "SYN-B-0001::SYN-B-ENC-0001": "consilium-case-B.json",
  // Blind live-demo test cases (no fixtures -> always run live).
  "SYN-T1-0001::SYN-T1-ENC-0001": "consilium-case-T1.json",
  "SYN-T2-0001::SYN-T2-ENC-0001": "consilium-case-T2.json",
};

// Cases are authored, not zod-validated here (shape is the encounter schema).
export function loadCase(caseId: string): RawCase {
  const file = CASE_FILES[caseId];
  if (!file) throw new Error(`data: unknown caseId '${caseId}'`);
  return JSON.parse(readFileSync(join(CASES, file), "utf8")) as RawCase;
}

/* ------------------------------ fixtures ------------------------------- */

const FIXTURE_FILES: Record<string, string> = {
  "SYN-A-0001::SYN-A-ENC-0001": "case-A.result.json",
  "SYN-B-0001::SYN-B-ENC-0001": "case-B.result.json",
};

/** Return the baked fixture for a case, or null if none exists (e.g. Case C). */
export function loadFixture(caseId: string): PipelineResult | null {
  const file = FIXTURE_FILES[caseId];
  if (!file) return null;
  const path = join(FIXTURES, file);
  if (!existsSync(path)) return null;
  return readJson(path, PipelineResult, `fixture ${file}`);
}
