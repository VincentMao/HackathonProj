"use client";

/**
 * Consilium — single interactive page. Load a starting case (A/B), edit the chart facts
 * and/or the transcript, and Run the real pipeline live to get new recommendations.
 *
 *   Load case  -> instant cached result
 *   Edit + Run -> live pipeline (signals -> reasoner x2 -> verifier), identical code path
 *
 * Before/after: chart-only (pre) vs after-the-room (post), with the verifier and decision.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PipelineResult, Recommendation } from "@/lib/contracts";
import type { ChartExtract } from "@/lib/rules";
import { CASES } from "@/components/labels";
import ChartForm from "@/components/ChartForm";
import RankedList from "@/components/RankedList";
import SignalChip from "@/components/SignalChip";
import VerdictBadge from "@/components/VerdictBadge";
import VerifierPanel from "@/components/VerifierPanel";
import DecisionBar, { type DecisionState } from "@/components/DecisionBar";

type CaseKey = "A" | "B";

function topPostOption(result: PipelineResult): Recommendation | undefined {
  return result.recommendations.post.options
    .filter((o) => o.status !== "excluded" && o.rank > 0)
    .sort((a, b) => a.rank - b.rank)[0];
}

/** "Age is not the decision": age drove a pre option but not the top post option. */
function ageIsNotTheDecision(result: PipelineResult): boolean {
  const hasAge = (refs: string[]) => refs.some((r) => r.includes("age"));
  const preAge = result.recommendations.pre.options.some((o) => hasAge(o.depends_on));
  const top = topPostOption(result);
  return preAge && !!top && !hasAge(top.depends_on);
}

export default function Home() {
  const [caseKey, setCaseKey] = useState<CaseKey>("A");
  const [chart, setChart] = useState<ChartExtract | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [decision, setDecision] = useState<DecisionState>({ action: null, reason: "" });
  const runToken = useRef(0);

  const caseId = CASES[caseKey].caseId;

  // Load a starting case: populate editable inputs, then show the instant cached result.
  const loadCase = useCallback(async (key: CaseKey) => {
    const token = ++runToken.current;
    setCaseKey(key);
    setLoading(true);
    setError(null);
    setDirty(false);
    setDecision({ action: null, reason: "" });
    const id = CASES[key].caseId;
    try {
      const caseRes = await fetch(`/api/case?caseId=${encodeURIComponent(id)}`);
      const caseData = await caseRes.json();
      if (token !== runToken.current) return;
      setChart(caseData.chart as ChartExtract);
      setTranscript(caseData.transcript as string);

      const runRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: id }),
      });
      if (token !== runToken.current) return;
      if (runRes.ok) setResult((await runRes.json()) as PipelineResult);
      else setResult(null);
    } catch {
      if (token === runToken.current) setError("Could not load case. Is the dev server running?");
    } finally {
      if (token === runToken.current) setLoading(false);
    }
  }, []);

  // Run the pipeline live on the current (possibly edited) chart + transcript.
  const runLive = useCallback(async () => {
    if (!chart) return;
    const token = ++runToken.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, transcript, chart }),
      });
      if (token !== runToken.current) return;
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        setError(
          res.status === 501
            ? "Live pipeline unavailable — set ANTHROPIC_API_KEY in .env.local and restart."
            : detail?.error
              ? String(detail.error)
              : `Run failed (${res.status}).`,
        );
        return;
      }
      setResult((await res.json()) as PipelineResult);
      setDirty(false);
      setDecision({ action: null, reason: "" });
    } catch {
      if (token === runToken.current) setError("Could not reach /api/run.");
    } finally {
      if (token === runToken.current) setLoading(false);
    }
  }, [caseId, chart, transcript]);

  useEffect(() => {
    void loadCase("A");
  }, [loadCase]);

  // Cmd/Ctrl+Enter runs live from anywhere (incl. the transcript textarea).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void runLive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runLive]);

  const editChart = (next: ChartExtract) => {
    setChart(next);
    setDirty(true);
  };
  const editTranscript = (v: string) => {
    setTranscript(v);
    setDirty(true);
  };

  const showAgeCallout = useMemo(() => (result ? ageIsNotTheDecision(result) : false), [result]);
  const top = result ? topPostOption(result) : undefined;
  const meta = CASES[caseKey];

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consilium</h1>
          <p className="text-sm text-slate-500">The chart proposes, the room disposes.</p>
        </div>
        {result && (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result.mode === "live"
                  ? "border border-teal-300 bg-teal-50 text-teal-700"
                  : "border border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {result.mode}
            </span>
            <VerdictBadge verdict={result.verifier.overall} />
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ---------- Input panel ---------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Starting point</p>
            <div className="mt-2 flex gap-2">
              {(["A", "B"] as CaseKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => void loadCase(k)}
                  className={`flex-1 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    caseKey === k ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-semibold">{CASES[k].title}</span>
                  <span className={`block text-xs ${caseKey === k ? "text-slate-300" : "text-slate-400"}`}>
                    {CASES[k].chart.age}{CASES[k].chart.sex} · {CASES[k].chart.diagnosis.split(",")[0]}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Chart</p>
            <p className="mb-1 text-xs text-slate-400">{meta.scenario}</p>
            {chart && <ChartForm chart={chart} onChange={editChart} disabled={loading} />}

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Transcript (the room)</p>
            <textarea
              value={transcript}
              onChange={(e) => editTranscript(e.target.value)}
              rows={10}
              spellCheck={false}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              placeholder="Edit the conversation to surface new symptoms…"
            />

            <button
              type="button"
              onClick={() => void runLive()}
              disabled={loading || !chart}
              className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Running pipeline…" : "Run live"}
              <span className="ml-2 font-normal text-teal-200">⌘⏎</span>
            </button>
            {dirty && !loading && (
              <p className="mt-2 text-center text-xs text-amber-600">Inputs changed — run live to update the plan.</p>
            )}
            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          </div>
        </aside>

        {/* ---------- Outputs ---------- */}
        <section className={`space-y-6 transition-opacity ${dirty ? "opacity-60" : "opacity-100"}`}>
          {!result && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
              {loading ? "Running the pipeline…" : "Load a case to begin."}
            </div>
          )}

          {result && (
            <>
              {/* The room */}
              <div>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  The room surfaced
                </h2>
                {result.signals.signals.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {result.signals.signals.map((s, i) => (
                      <SignalChip key={s.key + i} signal={s} index={0} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No conversation signals extracted.</p>
                )}
              </div>

              {/* Before / after */}
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Chart only
                  </h2>
                  <RankedList options={result.recommendations.pre.options} />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    After the room
                  </h2>
                  {showAgeCallout && (
                    <div className="mb-3 rounded-xl border border-teal-300 bg-teal-50 p-3">
                      <p className="text-sm font-semibold text-teal-900">Age is not the decision</p>
                      <p className="text-xs text-teal-800">
                        The chart-only pass leaned on age; after the room the top option depends on function, goals and
                        logistics — not the number on the chart.
                      </p>
                    </div>
                  )}
                  <RankedList
                    options={result.recommendations.post.options}
                    deltas={result.recommendations.delta}
                    emphasizeDependsOn
                  />
                </div>
              </div>

              <VerifierPanel report={result.verifier} />
              {top && <DecisionBar top={top} decision={decision} onChange={setDecision} />}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
