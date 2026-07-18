/**
 * A provenance chip. Its color is DERIVED from the ref prefix, never guessed:
 *   chart.* -> slate (chart-derived)   visit.* -> teal (conversation-derived)
 */
import { refKind, refLabel } from "./labels";

export default function ProvenanceChip({
  refValue,
  showLabel = true,
}: {
  refValue: string;
  showLabel?: boolean;
}) {
  const kind = refKind(refValue);
  const styles =
    kind === "visit"
      ? "border-teal-300 bg-teal-50 text-teal-800"
      : "border-slate-300 bg-slate-100 text-slate-700";
  const dot = kind === "visit" ? "bg-teal-500" : "bg-slate-400";
  return (
    <span
      title={refValue}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {showLabel ? refLabel(refValue) : refValue}
    </span>
  );
}
