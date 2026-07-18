/**
 * Decision bar: Accept the top post option, or Override (reveals a required
 * reason textarea). No persistence — the choice is only reflected in the UI.
 */
import type { Recommendation } from "@/lib/contracts";
import { regimenLabel } from "./labels";

export type DecisionAction = "accept" | "override" | null;

export interface DecisionState {
  action: DecisionAction;
  reason: string;
}

export default function DecisionBar({
  top,
  decision,
  onChange,
}: {
  top: Recommendation;
  decision: DecisionState;
  onChange: (d: DecisionState) => void;
}) {
  const accepted = decision.action === "accept";
  const overriding = decision.action === "override";
  const overrideValid = decision.reason.trim().length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Recommended decision
        </span>
        <h3 className="text-2xl font-bold text-slate-900">{regimenLabel(top.regimen)}</h3>
        <p className="text-sm text-slate-500">Top-ranked after the room.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onChange({ action: "accept", reason: "" })}
          className={`rounded-xl px-6 py-3 text-base font-semibold transition-colors ${
            accepted
              ? "bg-emerald-600 text-white shadow"
              : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {accepted ? "✓ Accepted" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ action: "override", reason: overriding ? decision.reason : "" })
          }
          className={`rounded-xl px-6 py-3 text-base font-semibold transition-colors ${
            overriding
              ? "bg-amber-500 text-white shadow"
              : "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          Override
        </button>
      </div>

      {overriding && (
        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-700">
            Override reason <span className="text-amber-600">(required)</span>
          </label>
          <textarea
            autoFocus
            value={decision.reason}
            onChange={(e) => onChange({ action: "override", reason: e.target.value })}
            rows={3}
            placeholder="Why are you departing from the recommended plan?"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          {!overrideValid && (
            <p className="mt-1 text-xs text-amber-600">A reason is required to record an override.</p>
          )}
        </div>
      )}

      {accepted && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Plan accepted: {regimenLabel(top.regimen)}.
        </p>
      )}
      {overriding && overrideValid && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Override recorded — deviating from {regimenLabel(top.regimen)}.
        </p>
      )}
    </section>
  );
}
