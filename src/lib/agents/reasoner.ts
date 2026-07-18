/**
 * Reasoner (LLM), runs twice:
 *   pass 1 (pre)  = chart only
 *   pass 2 (post) = chart + VisitSignals
 * Reads the rule table; ranks over the committed RegimenId set; emits off_guideline as a
 * first-class field. The delta (pre -> post) is computed deterministically in code.
 */
import { RegimenId, Recommendation, RecommendationSet } from "../contracts";
import type { VisitSignals, RecommendationDelta } from "../contracts";
import type { ChartExtract } from "../rules";
import type { RuleTable } from "../rules";
import { chartSummary } from "../chart";
import { structured } from "../anthropic";
import { z } from "zod";

const OptionsPayload = z.object({ options: z.array(Recommendation) });

const RECO_SCHEMA = {
  type: "object",
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          regimen: { type: "string", enum: RegimenId.options },
          rank: { type: "integer" },
          intent: { type: "string", enum: ["curative", "disease_control", "palliative"] },
          status: { type: "string", enum: ["preferred", "candidate", "excluded", "off_guideline"] },
          rationale: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                ref: { type: "string", description: "chart.<field> or visit.<signalKey>" },
              },
              required: ["text", "ref"],
            },
          },
          depends_on: { type: "array", items: { type: "string" } },
          off_guideline: {
            type: ["object", "null"],
            properties: {
              boundary: { type: "string" },
              citation_id: { type: "string" },
              tradeoff: { type: "string" },
            },
          },
        },
        required: ["regimen", "rank", "intent", "status", "rationale", "depends_on", "off_guideline"],
      },
    },
  },
  required: ["options"],
};

function system(rules: RuleTable): string {
  const ruleLines = rules.rules
    .map((r) => `${r.rule_id} [${r.severity}/${r.action}] ${r.condition} :: ${r.rationale} (cite: ${r.citation_ids.join(", ") || "—"})`)
    .join("\n");
  return (
    "You are a lymphoma treatment reasoner for relapsed/refractory aggressive B-cell lymphoma (2nd line). " +
    "Rank treatment options from the committed regimen set. Respect the rule table below: apply exclusions, " +
    "prefer where indicated, and when an option is off strict guideline, set status='off_guideline' and fill " +
    "off_guideline{boundary, citation_id, tradeoff} — explain the boundary; never hard-stop a licensed physician " +
    "unless a rule is a hard exclusion. Every rationale.ref and every depends_on entry MUST be 'chart.<field>' " +
    "or 'visit.<signalKey>'. Do not put age in depends_on when fitness/logistics are the real drivers. " +
    "Weigh the whole chart — organ function (e.g. cardiac LVEF vs anthracycline exposure), peripheral neuropathy " +
    "(vincristine/polatuzumab), relapse timing and chemosensitivity — against the rules. Include only the most " +
    "relevant options (typically 4-6): the preferred and serious candidates plus any noteworthy exclusion; you need " +
    "not enumerate every regimen in the set.\n\n" +
    "RULE TABLE:\n" +
    ruleLines
  );
}

async function rankPass(
  rules: RuleTable,
  user: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof OptionsPayload>> {
  return structured({
    system: system(rules),
    user,
    schema: OptionsPayload,
    jsonSchema: RECO_SCHEMA,
    toolName: "rank_options",
    toolDescription: "Rank the treatment options with rationale, dependencies, and off-guideline flags.",
    maxTokens: 8192,
    signal,
  });
}

function computeDelta(
  pre: z.infer<typeof Recommendation>[],
  post: z.infer<typeof Recommendation>[],
): RecommendationDelta[] {
  const preByReg = new Map(pre.map((o) => [o.regimen, o]));
  const deltas: RecommendationDelta[] = [];
  for (const p of post) {
    const before = preByReg.get(p.regimen);
    const from = before && before.status !== "excluded" ? before.rank : null;
    const to = p.status === "excluded" ? null : p.rank;
    let change: RecommendationDelta["change"];
    if (p.status === "excluded") change = "excluded";
    else if (from == null) change = "entered";
    else if (to != null && to < from) change = "rose";
    else if (to != null && to > from) change = "fell";
    else continue; // unchanged
    deltas.push({
      regimen: p.regimen,
      change,
      from_rank: from,
      to_rank: to,
      driver_refs: p.rationale.filter((r) => r.ref.startsWith("visit.")).map((r) => r.ref),
    });
  }
  return deltas;
}

export async function reason(
  caseId: string,
  chart: ChartExtract,
  rules: RuleTable,
  signals: VisitSignals | null,
  signal?: AbortSignal,
): Promise<RecommendationSet> {
  const chartText = chartSummary(chart);
  const roomText = (signals?.signals ?? [])
    .map((s) => `- ${s.label}: ${String(s.value)} ("${s.evidence_span}")`)
    .join("\n");
  // The two passes are independent given the signals — run them concurrently to halve latency.
  const [pre, post] = await Promise.all([
    rankPass(rules, `CHART ONLY:\n${chartText}`, signal),
    rankPass(rules, `CHART:\n${chartText}\n\nROOM (conversation signals):\n${roomText || "(none)"}`, signal),
  ]);
  return RecommendationSet.parse({
    case_id: caseId,
    pre: { options: pre.options },
    post: { options: post.options },
    delta: computeDelta(pre.options, post.options),
  });
}
