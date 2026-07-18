/**
 * A single ranked recommendation. Shows rank, human regimen label, status,
 * rationale (each with a provenance chip), a depends_on line, an optional
 * delta badge (post pass), and an AMBER off-guideline callout when present.
 */
import type { Recommendation, RecommendationDelta } from "@/lib/contracts";
import { regimenLabel, regimenSubLabel } from "./labels";
import ProvenanceChip from "./ProvenanceChip";
import CitationPill from "./CitationPill";
import DeltaArrow from "./DeltaArrow";

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

export default function RecCard({
  rec,
  delta,
  emphasizeDependsOn = false,
}: {
  rec: Recommendation;
  delta?: RecommendationDelta;
  emphasizeDependsOn?: boolean;
}) {
  const excluded = rec.status === "excluded";
  const preferred = rec.status === "preferred";
  const off = rec.status === "off_guideline";

  const border = preferred
    ? "border-emerald-300 ring-1 ring-emerald-200"
    : off
      ? "border-amber-300 ring-1 ring-amber-200"
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
    <article className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${border}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${rankBadge}`}
        >
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
            {delta && <DeltaArrow delta={delta} />}
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
            <div
              className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 ${
                emphasizeDependsOn ? "bg-slate-50 ring-1 ring-slate-200" : ""
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Depends on
              </span>
              {rec.depends_on.map((ref) => (
                <ProvenanceChip key={ref} refValue={ref} />
              ))}
            </div>
          )}

          {rec.off_guideline && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Off-guideline
                </span>
                <CitationPill id={rec.off_guideline.citation_id} />
              </div>
              <p className="mt-2 text-sm font-medium text-amber-900">
                {rec.off_guideline.boundary}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                <span className="font-semibold">Tradeoff:</span> {rec.off_guideline.tradeoff}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
