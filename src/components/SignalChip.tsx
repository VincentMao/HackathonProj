/**
 * A conversation-derived signal: its value plus the VERBATIM evidence_span quote.
 * Reveals with a staggered slide-in (index drives the animation delay).
 */
import type { VisitSignal } from "@/lib/contracts";
import ProvenanceChip from "./ProvenanceChip";

const SALIENCE: Record<VisitSignal["salience"], string> = {
  high: "border-teal-400 ring-1 ring-teal-200",
  med: "border-teal-200",
  low: "border-slate-200",
};

export default function SignalChip({
  signal,
  index,
}: {
  signal: VisitSignal;
  index: number;
}) {
  return (
    <div
      className={`signal-reveal rounded-xl border bg-white p-4 shadow-sm ${SALIENCE[signal.salience]}`}
      style={{ animationDelay: `${index * 320}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          {signal.label}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            signal.salience === "high"
              ? "bg-teal-600 text-white"
              : signal.salience === "med"
                ? "bg-teal-100 text-teal-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {signal.salience}
        </span>
      </div>
      <div className="mt-1.5 text-lg font-semibold text-slate-900">
        {String(signal.value)}
      </div>
      <blockquote className="mt-2 border-l-2 border-teal-300 pl-3 text-sm italic leading-snug text-slate-600">
        &ldquo;{signal.evidence_span}&rdquo;
      </blockquote>
      <div className="mt-3">
        <ProvenanceChip refValue={signal.ref} />
      </div>
    </div>
  );
}
