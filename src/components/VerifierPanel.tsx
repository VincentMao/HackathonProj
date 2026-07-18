/**
 * Verifier panel: the deterministic rule checks and the in-context groundings, each with a
 * verdict badge and citation pill. Shows the "grounding degraded" note when the grounding
 * step timed out (claims render as unverified rather than hanging).
 */
import type { VerifierReport } from "@/lib/contracts";
import VerdictBadge from "./VerdictBadge";
import CitationPill from "./CitationPill";

export default function VerifierPanel({ report }: { report: VerifierReport }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Verifier</h3>
        <VerdictBadge verdict={report.overall} />
      </div>
      {report.degraded && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Grounding timed out — claims shown as unverified (retrieval is off the critical path).
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Rule checks</p>
          <ul className="space-y-2">
            {report.rule_checks.map((c) => (
              <li key={c.rule_id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{c.rule_id}</span>
                  <VerdictBadge verdict={c.verdict} />
                  {c.citation_id && <CitationPill id={c.citation_id} />}
                </div>
                <p className="mt-1 text-xs leading-snug text-slate-600">{c.message}</p>
              </li>
            ))}
            {report.rule_checks.length === 0 && <li className="text-xs text-slate-400">No rules fired.</li>}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Evidence grounding</p>
          <ul className="space-y-2">
            {report.groundings.map((g) => (
              <li key={g.claim_id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={g.verdict} />
                  {g.citation_id && <CitationPill id={g.citation_id} />}
                </div>
                <p className="mt-1 text-xs leading-snug text-slate-600">{g.claim_text}</p>
                {g.quote && (
                  <blockquote className="mt-1 border-l-2 border-indigo-200 pl-2 text-[11px] italic text-slate-500">
                    &ldquo;{g.quote}&rdquo;
                  </blockquote>
                )}
              </li>
            ))}
            {report.groundings.length === 0 && <li className="text-xs text-slate-400">No claims grounded.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
