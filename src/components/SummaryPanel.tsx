/**
 * Summary & to-do panel. The doctor selects one or more plans above (⌘/Ctrl-click for
 * multiple); the summarizer turns them into an actionable to-do list. The doctor can comment,
 * check items, and "send" them to downstream clinical workflow (a prototype hand-off).
 */
import type { Recommendation, TodoItem } from "@/lib/contracts";
import { regimenLabel } from "./labels";

const CATEGORY: Record<TodoItem["category"], { label: string; cls: string }> = {
  order: { label: "Order", cls: "bg-sky-100 text-sky-700" },
  workup: { label: "Workup", cls: "bg-indigo-100 text-indigo-700" },
  consent: { label: "Consent", cls: "bg-amber-100 text-amber-800" },
  referral: { label: "Referral", cls: "bg-violet-100 text-violet-700" },
  monitoring: { label: "Monitoring", cls: "bg-teal-100 text-teal-700" },
  supportive: { label: "Supportive", cls: "bg-emerald-100 text-emerald-700" },
  coordination: { label: "Coordination", cls: "bg-fuchsia-100 text-fuchsia-700" },
  other: { label: "Task", cls: "bg-slate-100 text-slate-600" },
};

export default function SummaryPanel({
  plans,
  todos,
  loading,
  error,
  onGenerate,
  checked,
  onToggle,
  comment,
  onComment,
  onSend,
  sent,
}: {
  plans: Recommendation[];
  todos: TodoItem[] | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  comment: string;
  onComment: (v: string) => void;
  onSend: () => void;
  sent: boolean;
}) {
  const checkedCount = (todos ?? []).filter((t) => checked[t.id]).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Summary &amp; to-do</span>
          <h3 className="text-xl font-bold text-slate-900">Selected plan{plans.length === 1 ? "" : "s"}</h3>
        </div>
        {plans.length > 0 && (todos === null || loading) && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Summarizing…" : "Build to-do summary"}
          </button>
        )}
      </div>

      {/* Selected plan chips */}
      {plans.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {plans.map((p) => (
            <span key={p.regimen} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
              {regimenLabel(p.regimen)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Select one or more plans above — ⌘/Ctrl-click to pick multiple.</p>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {/* To-do checklist */}
      {todos && todos.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              To-do ({checkedCount}/{todos.length} checked)
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {todos.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={!!checked[t.id]}
                    onChange={() => onToggle(t.id)}
                    className="mt-0.5 h-4 w-4 accent-teal-600"
                  />
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{t.text}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CATEGORY[t.category].cls}`}>
                      {CATEGORY[t.category].label}
                    </span>
                    {t.regimen && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {regimenLabel(t.regimen)}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {/* Comment */}
          <label className="mt-4 block text-sm font-semibold text-slate-700">Notes / comment</label>
          <textarea
            value={comment}
            onChange={(e) => onComment(e.target.value)}
            rows={2}
            placeholder="Add a note for the care team…"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />

          {/* Send */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onSend}
              disabled={checkedCount === 0}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send to clinical workflow →
            </button>
            <span className="text-xs text-slate-400">Prototype — hands off to EHR/orders/scheduling in a real deployment.</span>
          </div>

          {sent && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              ✓ Sent {checkedCount} task{checkedCount === 1 ? "" : "s"} to the clinical workflow (prototype — no external action taken).
            </p>
          )}
        </div>
      )}

      {todos && todos.length === 0 && !loading && (
        <p className="mt-3 text-sm text-slate-400">No to-do items generated.</p>
      )}
    </section>
  );
}
