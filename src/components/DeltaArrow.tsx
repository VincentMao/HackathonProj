/**
 * Delta indicator computed from RecommendationDelta.change:
 *   rose ↑ (emerald) · fell ↓ (rose) · entered ✦ (violet) · excluded ✕ (grey) · flagged ! (red)
 */
import type { RecommendationDelta } from "@/lib/contracts";

const STYLE: Record<
  RecommendationDelta["change"],
  { glyph: string; classes: string; verb: string }
> = {
  rose: { glyph: "↑", classes: "border-emerald-300 bg-emerald-50 text-emerald-700", verb: "Rose" },
  fell: { glyph: "↓", classes: "border-rose-300 bg-rose-50 text-rose-700", verb: "Fell" },
  entered: { glyph: "✦", classes: "border-violet-300 bg-violet-50 text-violet-700", verb: "Entered" },
  excluded: { glyph: "✕", classes: "border-slate-300 bg-slate-100 text-slate-500", verb: "Excluded" },
  flagged: { glyph: "!", classes: "border-red-300 bg-red-50 text-red-700", verb: "Flagged" },
};

function rankText(d: RecommendationDelta): string {
  const from = d.from_rank && d.from_rank > 0 ? `#${d.from_rank}` : "—";
  const to = d.to_rank && d.to_rank > 0 ? `#${d.to_rank}` : "out";
  if (d.change === "entered") return `new → ${to}`;
  if (d.change === "excluded") return `${from} → out`;
  return `${from} → ${to}`;
}

export default function DeltaArrow({ delta }: { delta: RecommendationDelta }) {
  const s = STYLE[delta.change];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.classes}`}
    >
      <span className="text-sm leading-none">{s.glyph}</span>
      {s.verb}
      <span className="font-mono font-normal opacity-70">{rankText(delta)}</span>
    </span>
  );
}
