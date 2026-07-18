/** Verdict badge — color mapped from the contracts Verdict enum via VERDICT_STYLE. */
import type { Verdict } from "@/lib/contracts";
import { VERDICT_STYLE } from "./labels";

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
