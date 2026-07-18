/**
 * Verifier: (1) deterministic rule-check over rules.json, then (2) in-context grounding of
 * each rationale / exclusion / off-guideline claim against the evidence pack. Retrieval lives
 * ONLY here, after the recommendation exists. Grounding is timeout-guarded: on timeout / no
 * API key it degrades to `unverified` chips (degraded: true) rather than hanging.
 */
import { VerifierReport, Verdict } from "../contracts";
import type { RecommendationSet, VisitSignals, Grounding } from "../contracts";
import type { ChartExtract, RuleTable, PlanFlags } from "../rules";
import { runRuleChecks } from "../rules";
import { loadRuleTable, loadEvidencePack, citationIds } from "../data";
import { structured } from "../anthropic";
import { z } from "zod";

const GroundingPayload = z.object({
  groundings: z.array(
    z.object({
      claim_id: z.string(),
      claim_text: z.string(),
      verdict: Verdict,
      citation_id: z.string().nullable(),
      quote: z.string().nullable(),
    }),
  ),
});

const GROUNDING_SCHEMA = {
  type: "object",
  properties: {
    groundings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim_id: { type: "string" },
          claim_text: { type: "string" },
          verdict: { type: "string", enum: Verdict.options },
          citation_id: { type: ["string", "null"] },
          quote: { type: ["string", "null"] },
        },
        required: ["claim_id", "claim_text", "verdict", "citation_id", "quote"],
      },
    },
  },
  required: ["groundings"],
};

interface Claim {
  claim_id: string;
  claim_text: string;
}

function collectClaims(recs: RecommendationSet): Claim[] {
  // Ground the claims behind options that are actually on the table (non-excluded); the
  // reasons for exclusions are already captured deterministically in rule_checks. This keeps
  // the grounding call small and fast so it completes within the timeout.
  const claims: Claim[] = [];
  for (const o of recs.post.options.filter((o) => o.status !== "excluded")) {
    o.rationale.forEach((r, j) => claims.push({ claim_id: `${o.regimen}-r${j}`, claim_text: r.text }));
    if (o.off_guideline) {
      claims.push({ claim_id: `${o.regimen}-og`, claim_text: `${o.off_guideline.boundary} — ${o.off_guideline.tradeoff}` });
    }
  }
  return claims;
}

function planFlags(recs: RecommendationSet): PlanFlags {
  const post = recs.post.options.filter((o) => o.status !== "excluded").map((o) => o.regimen);
  return {
    intends_cellular_therapy: post.some((r) => r.startsWith("CAR_T")),
    cd19_car_t: post.some((r) => r.startsWith("CAR_T")),
    hd_mtx: post.includes("CNS_SALVAGE_MATRIX"),
    bridging_agent: null,
  };
}

/**
 * The headline verdict reflects the RECOMMENDED plan (the top non-excluded option), not
 * incidental hard-exclusions of therapies that were never selected (e.g. tisa-cel via R05).
 */
function overallFrom(recs: RecommendationSet): Verdict {
  const top = recs.post.options
    .filter((o) => o.status !== "excluded" && o.rank > 0)
    .sort((a, b) => a.rank - b.rank)[0];
  if (!top) return "flagged";
  return top.status === "off_guideline" ? "off_guideline_explained" : "verified";
}

export async function verify(
  caseId: string,
  chart: ChartExtract,
  signals: VisitSignals,
  recs: RecommendationSet,
  rules?: RuleTable,
  timeoutMs = Number(process.env.VERIFIER_TIMEOUT_MS ?? 20000),
): Promise<VerifierReport> {
  const table = rules ?? loadRuleTable();
  const candidates = [...recs.pre.options, ...recs.post.options].map((o) => o.regimen);
  const rule_checks = runRuleChecks(table, chart, signals, candidates, planFlags(recs));

  const claims = collectClaims(recs);
  const validIds = citationIds();
  let groundings: Grounding[];
  let degraded = false;

  try {
    const pack = loadEvidencePack();
    const packText = pack.entries
      .map((e) => `[${e.citation_id}] ${e.trial_name} — ${e.finding} (strength: ${e.evidence_strength}; limits: ${e.limits})`)
      .join("\n");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const out = await structured({
        system:
          "You are a clinical evidence verifier. For each claim, assign a verdict and ground it against the " +
          "evidence pack by citation_id. verdict: 'verified' if a pack entry supports it; 'off_guideline_explained' " +
          "if it is an off-label/off-guideline choice named with its basis; 'excluded' if it justifies an exclusion; " +
          "'flagged' only if evidence contradicts it. Use only citation_ids present in the pack, or null. quote may be " +
          "a short verbatim anchor from the entry or empty string.",
        user: `EVIDENCE PACK:\n${packText}\n\nCLAIMS:\n${claims.map((c) => `${c.claim_id}: ${c.claim_text}`).join("\n")}`,
        schema: GroundingPayload,
        jsonSchema: GROUNDING_SCHEMA,
        toolName: "ground_claims",
        toolDescription: "Ground each claim against the evidence pack.",
        maxTokens: 6144,
        signal: controller.signal,
      });
      groundings = out.groundings.map((g) => ({
        ...g,
        citation_id: g.citation_id && validIds.has(g.citation_id) ? g.citation_id : null,
      }));
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Timeout / no API key / model error: degrade to unverified rather than hang the demo.
    degraded = true;
    groundings = claims.map((c) => ({ ...c, verdict: "unverified" as const, citation_id: null, quote: null }));
  }

  return VerifierReport.parse({
    case_id: caseId,
    rule_checks,
    groundings,
    overall: overallFrom(recs),
    degraded,
  });
}
