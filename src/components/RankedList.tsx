/**
 * The one combined ranking. Sorts by rank (excluded plans drop to the bottom) and renders a
 * selectable card per plan, each with its verifier attention flags + evidence.
 */
import type { Recommendation, PlanVerification } from "@/lib/contracts";
import RecCard from "./RecCard";

function order(a: Recommendation, b: Recommendation): number {
  const ax = a.status === "excluded" || a.rank <= 0 ? 999 : a.rank;
  const bx = b.status === "excluded" || b.rank <= 0 ? 999 : b.rank;
  return ax - bx;
}

export default function RankedList({
  options,
  verifications,
  selectedRegimen,
  onSelect,
}: {
  options: Recommendation[];
  verifications: PlanVerification[];
  selectedRegimen: string | null;
  onSelect: (regimen: string) => void;
}) {
  const sorted = [...options].sort(order);
  const vByReg = new Map(verifications.map((v) => [v.regimen, v]));

  return (
    <div className="space-y-3">
      {sorted.map((rec, i) => (
        <div key={`${rec.regimen}-${i}`} className="stagger-in" style={{ animationDelay: `${i * 70}ms` }}>
          <RecCard
            rec={rec}
            verification={vByReg.get(rec.regimen)}
            selected={selectedRegimen === rec.regimen}
            onSelect={rec.status === "excluded" ? undefined : () => onSelect(rec.regimen)}
          />
        </div>
      ))}
    </div>
  );
}
