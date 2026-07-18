/**
 * A single treatment plan (from the one combined ranking). Shows rank, regimen, status,
 * rationale (with provenance chips), depends_on, the off-guideline callout, and — folded in
 * from the verifier — the per-plan attention flags and supporting evidence. Non-excluded
 * plans are selectable (click to choose before Accept/Override).
 */
import type { Recommendation, PlanVerification, PlanFlag } from "@/lib/contracts";
import { regimenLabel, regimenSubLabel } from "./labels";
import ProvenanceChip from "./ProvenanceChip";
import CitationPill from "./CitationPill";

const STATUS: Record<Recommendation["status"], { label: string; classes: string }> = {
  preferred: { label: "Preferred", classes: "bg-emerald-600 text-white" },
  candidate: { label: "Candidate", classes: "bg-slate-200 text-slate-700" },
  off_guideline: { label: "Off-guideline", classes: "bg-amber-500 text-white" },
  excluded: { label: "Excluded", classes: "bg-slate-100 text-slate-400" },
};

const INTENT: Record<Recommendation["intent"], string> = {
  curative: "Curative intent",
  disease_control: "Disease control",
  palliative: "Palliative",
};

const FLAG_STYLE: Record<PlanFlag["severity"], { dot: string; box: string }> = {
  hard: { dot: "bg-red-500", box: "border-red-200 bg-red-50 text-red-800" },
  attention: { dot: "bg-amber-500", box: "border-amber-200 bg-amber-50 text-amber-900" },
  info: { dot: "bg-slate-400", box: "border-slate-200 bg-slate-50 text-slate-600" },
};

export default function RecCard({
  rec,
  verification,
  selected = false,
  onSelect,
}: {
  rec: Recommendation;
  verification?: PlanVerification;
  selected?: boolean;
  onSelect?: (additive: boolean) => void;
}) {
  const excluded = rec.status === "excluded";
  const preferred = rec.status === "preferred";
  const off = rec.status === "off_guideline";
  const selectable = !excluded && !!onSelect;

  const border = selected
    ? "border-teal-500 ring-2 ring-teal-300"
    : preferred
      ? "border-emerald-300"
      : off
        ? "border-amber-300"
        : excluded
          ? "border-slate-200 opacity-70"
          : "border-slate-200";

  const rankBadge = excluded
    ? "border border-slate-200 bg-slate-100 text-slate-400"
    : preferred
      ? "bg-emerald-600 text-white"
      : off
        ? "bg-amber-500 text-white"
        : "bg-slate-800 text-white";

  return (
    <article
      onClick={selectable ? (e) => onSelect!(e.metaKey || e.ctrlKey) : undefined}
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${border} ${selectable ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${rankBadge}`}>
          {excluded ? "✕" : rec.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-lg font-bold ${excluded ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"}`}>
              {regimenLabel(rec.regimen)}
            </h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[rec.status].classes}`}>
              {STATUS[rec.status].label}
            </span>
            {selected && <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-semibold text-white">Selected</span>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {regimenSubLabel(rec.regimen)} · {INTENT[rec.intent]}
          </p>

          <ul className="mt-3 space-y-2">
            {rec.rationale.map((r, i) => (
              <li key={i} className="flex flex-col gap-1.5 text-sm text-slate-700">
                <span className="leading-snug">{r.text}</span>
                <ProvenanceChip refValue={r.ref} />
              </li>
            ))}
          </ul>

          {rec.depends_on.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Depends on</span>
              {rec.depends_on.map((ref) => (
                <ProvenanceChip key={ref} refValue={ref} />
              ))}
            </div>
          )}

          {rec.off_guideline && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Off-guideline</span>
                <CitationPill id={rec.off_guideline.citation_id} />
              </div>
              <p className="mt-2 text-sm font-medium text-amber-900">{rec.off_guideline.boundary}</p>
              <p className="mt-1 text-sm text-amber-800">
                <span className="font-semibold">Tradeoff:</span> {rec.off_guideline.tradeoff}
              </p>
            </div>
          )}

          {/* Verifier: attention flags + supporting evidence for this plan */}
          {verification && verification.flags.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Needs attention</span>
              {verification.flags.map((f, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${FLAG_STYLE[f.severity].box}`}>
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${FLAG_STYLE[f.severity].dot}`} />
                  <span className="min-w-0 flex-1 leading-snug">{f.text}</span>
                  {f.citation_id && <CitationPill id={f.citation_id} />}
                </div>
              ))}
            </div>
          )}

          {verification && verification.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Evidence</span>
              {verification.citations.map((c) => (
                <CitationPill key={c} id={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
