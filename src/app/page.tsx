"use client";

/**
 * Consilium — single interactive page. Load a starting case (or from scratch), edit the chart
 * facts and/or the transcript, and Run the real pipeline live. One combined ranking (chart +
 * room together); each plan carries its verifier attention flags; the doctor selects a plan
 * and Accepts or Overrides it.
 *
 *   Load case  -> instant cached result (A/B) or live (T1/T2)
 *   Edit + Run -> live pipeline (signals -> reasoner -> verifier), identical code path
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineResult, Recommendation, RegimenId } from "@/lib/contracts";
import type { ChartExtract } from "@/lib/rules";
import { BLANK_CHART } from "@/lib/rules";
import { CASES, PRESET_KEYS, type PresetKey } from "@/components/labels";
import ChartForm from "@/components/ChartForm";
import RankedList from "@/components/RankedList";
import SignalChip from "@/components/SignalChip";
import DecisionBar, { type DecisionState } from "@/components/DecisionBar";

type CaseKey = PresetKey | "scratch";
const SCRATCH_ID = "SCRATCH::ENC-0001";

function topOption(result: PipelineResult): Recommendation | undefined {
  return result.recommendations.options
    .filter((o) => o.status !== "excluded" && o.rank > 0)
    .sort((a, b) => a.rank - b.rank)[0];
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
  const [selectedRegimen, setSelectedRegimen] = useState<RegimenId | null>(null);
  const runToken = useRef(0);

  const caseId = caseKey === "scratch" ? SCRATCH_ID : CASES[caseKey].caseId;

  // Load a starting case: populate editable inputs, then show the instant cached result.
  const loadCase = useCallback(async (key: PresetKey) => {
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

  // Start from scratch: neutral chart + empty transcript, nothing cached — build it live.
  const startBlank = useCallback(() => {
    ++runToken.current;
    setCaseKey("scratch");
    setChart(BLANK_CHART);
    setTranscript("");
    setResult(null);
    setError(null);
    setLoading(false);
    setDirty(true);
    setDecision({ action: null, reason: "" });
  }, []);

  useEffect(() => {
    void loadCase("A");
  }, [loadCase]);

  // When a new result arrives, default-select the top plan and reset the decision.
  useEffect(() => {
    if (!result) {
      setSelectedRegimen(null);
      return;
    }
    setSelectedRegimen(topOption(result)?.regimen ?? null);
    setDecision({ action: null, reason: "" });
  }, [result]);

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

  const top = result ? topOption(result) : undefined;
  // "Age is not the decision": an older patient whose top plan hinges on function/logistics, not age.
  const showAgeCallout =
    !!result && !!chart && chart.fitness.age >= 75 && !!top && !top.depends_on.some((r) => r.includes("age"));
  const scenario =
    caseKey === "scratch"
      ? "Build a case from scratch — set the chart facts and type the room, then run live."
      : CASES[caseKey].scenario;

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
            {result.verifier.degraded && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                evidence check degraded
              </span>
            )}
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ---------- Input panel ---------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Starting point</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PRESET_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => void loadCase(k)}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    caseKey === k ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    {CASES[k].title}
                    {CASES[k].live && (
                      <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${caseKey === k ? "bg-teal-500 text-white" : "bg-teal-100 text-teal-700"}`}>
                        live
                      </span>
                    )}
                  </span>
                  <span className={`block text-xs ${caseKey === k ? "text-slate-300" : "text-slate-400"}`}>
                    {CASES[k].chart.age}{CASES[k].chart.sex} · {CASES[k].chart.diagnosis.split(",")[0]}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={startBlank}
              className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                caseKey === "scratch"
                  ? "bg-slate-900 text-white"
                  : "border border-dashed border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="block font-semibold">+ From scratch</span>
              <span className={`block text-xs ${caseKey === "scratch" ? "text-slate-300" : "text-slate-400"}`}>
                Blank chart — build the case live
              </span>
            </button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Chart</p>
            <p className="mb-1 text-xs text-slate-400">{scenario}</p>
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
              {loading
                ? "Running the pipeline…"
                : chart
                  ? "Edit the chart and transcript, then Run live to generate a plan."
                  : "Load a case to begin."}
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

              {/* One combined ranking (chart + room), each plan verified */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Recommended plans
                </h2>
                {showAgeCallout && (
                  <div className="mb-3 rounded-xl border border-teal-300 bg-teal-50 p-3">
                    <p className="text-sm font-semibold text-teal-900">Age is not the decision</p>
                    <p className="text-xs text-teal-800">
                      The top plan hinges on function, goals and logistics — not the number on the chart.
                    </p>
                  </div>
                )}
                <RankedList
                  options={result.recommendations.options}
                  verifications={result.verifier.plans}
                  selectedRegimen={selectedRegimen}
                  onSelect={(r) => setSelectedRegimen(r as RegimenId)}
                />
              </div>

              <DecisionBar regimen={selectedRegimen} decision={decision} onChange={setDecision} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
