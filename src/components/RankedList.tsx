/**
 * An ordered list of recommendations (pre or post pass). Sorts ranked options
 * ascending and drops rank-0 / excluded options to the bottom. When a delta map
 * is supplied (post pass), each card shows its change badge.
 */
import type { Recommendation, RecommendationDelta } from "@/lib/contracts";
import RecCard from "./RecCard";

function order(a: Recommendation, b: Recommendation): number {
  const ax = a.status === "excluded" || a.rank <= 0 ? 999 : a.rank;
  const bx = b.status === "excluded" || b.rank <= 0 ? 999 : b.rank;
  return ax - bx;
}

export default function RankedList({
  options,
  deltas,
  emphasizeDependsOn = false,
}: {
  options: Recommendation[];
  deltas?: RecommendationDelta[];
  emphasizeDependsOn?: boolean;
}) {
  const sorted = [...options].sort(order);
  const deltaByRegimen = new Map<string, RecommendationDelta>();
  deltas?.forEach((d) => deltaByRegimen.set(d.regimen, d));

  return (
    <div className="space-y-3">
      {sorted.map((rec, i) => (
        <div
          key={rec.regimen}
          className="stagger-in"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <RecCard
            rec={rec}
            delta={deltaByRegimen.get(rec.regimen)}
            emphasizeDependsOn={emphasizeDependsOn}
          />
        </div>
      ))}
    </div>
  );
}
