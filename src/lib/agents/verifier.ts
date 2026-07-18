/**
 * Verifier — checks each INCLUDED plan (not the patient in the abstract) and surfaces what a
 * doctor should attend to: off-label boundaries, safety/toxicity cautions given this chart
 * (organ function, neuropathy, logistics), sequencing hazards, and the evidence that supports
 * the plan. Retrieval lives only here. On timeout / no key it degrades to a rule-derived seed.
 */
import { VerifierReport, PlanVerification, Verdict } from "../contracts";
import type { RecommendationSet, VisitSignals } from "../contracts";
import type { ChartExtract, RuleTable } from "../rules";
import { chartSummary } from "../chart";
import { loadRuleTable, loadEvidencePack, citationIds } from "../data";
import { structured } from "../anthropic";
import { z } from "zod";

const Payload = z.object({
  plans: z.array(
    z.object({
      regimen: z.string(),
      verdict: Verdict,
      citations: z.array(z.string()),
      flags: z.array(
        z.object({
          severity: z.enum(["hard", "attention", "info"]),
          text: z.string(),
          citation_id: z.string().nullable(),
        }),
      ),
    }),
  ),
});

const SCHEMA = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          regimen: { type: "string" },
          verdict: { type: "string", enum: Verdict.options },
          citations: { type: "array", items: { type: "string" } },
          flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["hard", "attention", "info"] },
                text: { type: "string" },
                citation_id: { type: ["string", "null"] },
              },
              required: ["severity", "text", "citation_id"],
            },
          },
        },
        required: ["regimen", "verdict", "citations", "flags"],
      },
    },
  },
  required: ["plans"],
};

/** Deterministic seed from the recommendation itself (used as fallback + belt-and-suspenders). */
function seedFor(recs: RecommendationSet): PlanVerification[] {
  return recs.options
    .filter((o) => o.status !== "excluded")
    .map((o) => ({
      regimen: o.regimen,
      verdict: (o.status === "off_guideline" ? "off_guideline_explained" : "verified") as Verdict,
      citations: o.off_guideline ? [o.off_guideline.citation_id] : [],
      flags: o.off_guideline
        ? [{ severity: "attention" as const, text: `Off-guideline: ${o.off_guideline.boundary}`, citation_id: o.off_guideline.citation_id }]
        : [],
    }));
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
  const included = recs.options.filter((o) => o.status !== "excluded");
  const seed = seedFor(recs);
  const seedByReg = new Map(seed.map((s) => [s.regimen, s]));
  void signals;

  try {
    const validIds = citationIds();
    const pack = loadEvidencePack();
    const packText = pack.entries
      .map((e) => `[${e.citation_id}] ${e.trial_name} — ${e.finding} (strength: ${e.evidence_strength}; limits: ${e.limits})`)
      .join("\n");
    const ruleText = table.rules
      .map((r) => `${r.rule_id} [${r.severity}/${r.action}] ${r.therapy}: ${r.rationale} (cite: ${r.citation_ids.join(", ") || "—"})`)
      .join("\n");
    const planText = included
      .map((o) => `- ${o.regimen}: ${o.rationale.map((r) => r.text).join(" ")}${o.off_guideline ? ` [off-guideline: ${o.off_guideline.boundary}]` : ""}`)
      .join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let out: z.infer<typeof Payload>;
    try {
      out = await structured({
        system:
          "You are a clinical verifier. For EACH proposed plan, check it against the rule table and evidence pack " +
          "for THIS patient and surface what the doctor must attend to. Return per plan: verdict " +
          "('off_guideline_explained' if off-label/off-guideline, 'flagged' if a hard safety/efficacy problem, else " +
          "'verified'); citations (citation_ids from the pack that support the plan); and flags — concrete attention " +
          "items such as off-label boundary, organ-function/toxicity cautions given this chart (e.g. cardiac LVEF vs " +
          "anthracyclines, neuropathy vs vincristine/polatuzumab), sequencing hazards, and required monitoring/workup. " +
          "severity: 'hard' = do-not-proceed safety/efficacy, 'attention' = review before proceeding, 'info' = note. " +
          "Keep flags concise (<=3 per plan). Use only citation_ids present in the pack, or null.",
        user: `PATIENT CHART:\n${chartSummary(chart)}\n\nRULES:\n${ruleText}\n\nEVIDENCE PACK:\n${packText}\n\nPLANS TO CHECK:\n${planText}`,
        schema: Payload,
        jsonSchema: SCHEMA,
        toolName: "verify_plans",
        toolDescription: "Verify each proposed plan and flag attention items.",
        maxTokens: 4096,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const llmByReg = new Map(out.plans.map((p) => [p.regimen, p]));
    const plans: PlanVerification[] = included.map((o) => {
      const base = seedByReg.get(o.regimen)!;
      const llm = llmByReg.get(o.regimen);
      const flags = [...base.flags, ...(llm?.flags ?? [])]
        .map((f) => ({ ...f, citation_id: f.citation_id && validIds.has(f.citation_id) ? f.citation_id : null }))
        .filter((f, i, arr) => arr.findIndex((g) => g.text === f.text) === i); // dedupe by text
      const citations = [...new Set([...base.citations, ...(llm?.citations ?? [])])].filter((c) => validIds.has(c));
      let verdict: Verdict = base.verdict;
      if (flags.some((f) => f.severity === "hard")) verdict = "flagged";
      else if (base.verdict !== "off_guideline_explained" && llm?.verdict) verdict = llm.verdict;
      return { regimen: o.regimen, verdict, citations, flags };
    });
    return VerifierReport.parse({ case_id: caseId, plans, degraded: false });
  } catch {
    return VerifierReport.parse({ case_id: caseId, plans: seed, degraded: true });
  }
}
