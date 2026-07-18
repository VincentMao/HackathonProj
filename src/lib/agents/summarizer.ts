/**
 * Summarizer (LLM). Turns the doctor's selected plan(s) — with their rationale and the
 * verifier's attention flags — into an actionable clinical to-do list to operationalize the
 * choice: orders, pre-treatment workup, consents (incl. off-label), referrals/coordination
 * (tumor board, cellular-therapy referral, shared-care handoff), monitoring, and supportive
 * care. This is what a doctor would check off and hand to downstream clinical workflow.
 */
import { TodoItem } from "../contracts";
import type { Recommendation, PlanVerification, RegimenId } from "../contracts";
import type { ChartExtract } from "../rules";
import { REGIMEN_ATTRS } from "../rules";
import { chartSummary } from "../chart";
import { structured } from "../anthropic";
import { z } from "zod";

const Payload = z.object({
  todos: z.array(
    z.object({
      text: z.string(),
      category: TodoItem.shape.category,
      regimen: z.string().nullable(), // coerced to a RegimenId (or null) below
    }),
  ),
});

// Coerce the model's regimen field to a valid enum token: accept the token, or map a therapy
// name back to its id, else null (the tag is optional).
const VALID_IDS = new Set(Object.keys(REGIMEN_ATTRS));
const NAME_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(REGIMEN_ATTRS).map(([id, a]) => [a.therapy.toLowerCase(), id]),
);
function coerceRegimen(r: string | null): RegimenId | null {
  if (!r) return null;
  if (VALID_IDS.has(r)) return r as RegimenId;
  return (NAME_TO_ID[r.toLowerCase()] as RegimenId) ?? null;
}

const SCHEMA = {
  type: "object",
  properties: {
    todos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          category: { type: "string", enum: ["order", "workup", "consent", "referral", "monitoring", "supportive", "coordination", "other"] },
          regimen: { type: ["string", "null"] },
        },
        required: ["text", "category", "regimen"],
      },
    },
  },
  required: ["todos"],
};

export async function summarizeTodos(
  chart: ChartExtract,
  plans: Recommendation[],
  verifications: PlanVerification[],
  signal?: AbortSignal,
): Promise<TodoItem[]> {
  const vByReg = new Map(verifications.map((v) => [v.regimen, v]));
  const planText = plans
    .map((p) => {
      const v = vByReg.get(p.regimen);
      const flags = v?.flags.map((f) => `attention: ${f.text}`).join("; ") ?? "";
      return `PLAN ${REGIMEN_ATTRS[p.regimen].therapy} (${p.regimen})\n  rationale: ${p.rationale.map((r) => r.text).join(" ")}${p.off_guideline ? `\n  off-guideline: ${p.off_guideline.boundary} — ${p.off_guideline.tradeoff}` : ""}${flags ? `\n  ${flags}` : ""}`;
    })
    .join("\n\n");

  const out = await structured({
    system:
      "You are a clinical operations assistant. Given the doctor's SELECTED treatment plan(s) for relapsed/refractory " +
      "aggressive B-cell lymphoma, produce a concise, actionable to-do list to operationalize the choice: pre-treatment " +
      "orders and workup, consents (including off-label/off-guideline consent where relevant), referrals and coordination " +
      "(tumor board, cellular-therapy referral, shared-care handoff to a local oncologist), monitoring/safety-netting, and " +
      "supportive care. Turn the attention flags into concrete tasks (e.g. a low LVEF -> baseline echo + cardiology; prior " +
      "neuropathy -> avoid/limit neurotoxic agents and document; distance -> arrange cycle-1 at the center). 6-12 items, " +
      "each tagged with a category and the regimen it belongs to. For 'regimen' use EXACTLY the enum token shown in " +
      "parentheses after each plan (e.g. CNS_SALVAGE_MATRIX), or null if the task is shared across the selected plans. " +
      "Be specific and clinical; do not restate the diagnosis.",
    user: `PATIENT CHART:\n${chartSummary(chart)}\n\nSELECTED PLAN(S):\n${planText}`,
    schema: Payload,
    jsonSchema: SCHEMA,
    toolName: "build_todo_list",
    toolDescription: "Build the actionable clinical to-do list for the selected plan(s).",
    maxTokens: 2048,
    signal,
  });

  return out.todos.map((t, i) =>
    TodoItem.parse({ id: `todo-${i}`, text: t.text, category: t.category, regimen: coerceRegimen(t.regimen) }),
  );
}
