"use client";

/**
 * Consilium — single-page, keyboard-driven temporal narrative.
 *
 *   Space / →  advance stage      ← / ⌫  previous stage
 *   r          reset to stage 1   1 / 2 / 3  jump to Case A / B / C
 *
 * Data comes only from POST /api/run { caseId, transcript } -> PipelineResult.
 * A/B return cached fixtures (empty transcript); C runs live. Fixtures are never
 * read directly in the client.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PipelineResult, Recommendation } from "@/lib/contracts";
import Stage, { StageRail, STAGES } from "@/components/Stage";
import ChartHeader from "@/components/ChartHeader";
import RankedList from "@/components/RankedList";
import SignalChip from "@/components/SignalChip";
import VerdictBadge from "@/components/VerdictBadge";
import CitationPill from "@/components/CitationPill";
import DecisionBar, { type DecisionState } from "@/components/DecisionBar";
import LiveInput from "@/components/LiveInput";
import KeyboardLegend from "@/components/KeyboardLegend";
import { CASES } from "@/components/labels";

type CaseKey = "A" | "B" | "C";
const CASE_BY_DIGIT: Record<string, CaseKey> = { "1": "A", "2": "B", "3": "C" };

function topPostOption(result: PipelineResult): Recommendation | undefined {
  const ranked = result.recommendations.post.options
    .filter((o) => o.status !== "excluded" && o.rank > 0)
    .sort((a, b) => a.rank - b.rank);
  return ranked[0];
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
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionState>({ action: null, reason: "" });
  const [cTranscript, setCTranscript] = useState(CASES.C.transcript);

  const meta = CASES[caseKey];

  const runCase = useCallback(async (key: CaseKey, transcript: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setStage(0);
    setDecision({ action: null, reason: "" });
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: CASES[key].caseId, transcript }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        if (res.status === 501) {
          setError(
            "Live pipeline unavailable (no API key configured). Cases A and B still run from cache.",
          );
        } else {
          setError(detail?.error ? String(detail.error) : `Request failed (${res.status}).`);
        }
        return;
      }
      const data = (await res.json()) as PipelineResult;
      setResult(data);
    } catch {
      setError("Could not reach /api/run. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Selecting a case: A/B auto-load from cache; C waits for an explicit Run.
  const selectCase = useCallback(
    (key: CaseKey) => {
      setCaseKey(key);
      setStage(0);
      setDecision({ action: null, reason: "" });
      if (key === "C") {
        setResult(null);
        setError(null);
      } else {
        void runCase(key, "");
      }
    },
    [runCase],
  );

  // Initial load: Case A from cache.
  useEffect(() => {
    void runCase("A", "");
  }, [runCase]);

  const maxStage = STAGES.length - 1;
  const canAdvance = result !== null;

  // Keyboard controls drive everything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;

      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        if (canAdvance) setStage((s) => Math.min(maxStage, s + 1));
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        setStage((s) => Math.max(0, s - 1));
      } else if (e.key === "r" || e.key === "R") {
        setStage(0);
        setDecision({ action: null, reason: "" });
      } else if (CASE_BY_DIGIT[e.key]) {
        selectCase(CASE_BY_DIGIT[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAdvance, maxStage, selectCase]);

  const showAgeCallout = useMemo(
    () => (result ? ageIsNotTheDecision(result) : false),
    [result],
  );
  const top = result ? topPostOption(result) : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Consilium
          </h1>
          <p className="text-sm text-slate-500">The chart proposes, the room disposes.</p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result.mode === "live"
                  ? "border border-teal-200 bg-teal-50 text-teal-700"
                  : "border border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {result.mode === "live" ? "live" : "cached"}
            </span>
          )}
          <nav className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(["A", "B", "C"] as CaseKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => selectCase(k)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  caseKey === k
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Case {k}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Case title + progress rail */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-medium text-slate-600">
          <span className="font-bold text-slate-900">{meta.title}</span> — {meta.scenario}
        </p>
        <StageRail active={stage} />
      </div>

      {/* Stage content */}
      <div className="flex-1">
        <Stage index={stage}>
          {/* ---- Stage 1: Chart ---- */}
          {stage === 0 && (
            <div className="space-y-5">
              <ChartHeader chart={meta.chart} />
              {caseKey === "C" && (
                <LiveInput
                  transcript={cTranscript}
                  onChange={setCTranscript}
                  onRun={() => void runCase("C", cTranscript)}
                  loading={loading}
                />
              )}
              {error && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  {error}
                </div>
              )}
              {loading && <SkeletonList />}
              {result && !loading && (
                <div>
                  <SectionTitle>Chart-only recommendation</SectionTitle>
                  <RankedList options={result.recommendations.pre.options} />
                </div>
              )}
              {!result && !loading && !error && caseKey === "C" && (
                <EmptyHint text="Run the live pipeline to populate the narrative." />
              )}
            </div>
          )}

          {/* ---- Stage 2: The room ---- */}
          {stage === 1 &&
            (result ? (
              <div>
                <SectionTitle>Signals from the conversation</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.signals.signals.map((sig, i) => (
                    <SignalChip key={sig.key} signal={sig} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHint text="No signals yet — run a case first." />
            ))}

          {/* ---- Stage 3: Re-rank ---- */}
          {stage === 2 &&
            (result ? (
              <div className="space-y-4">
                {showAgeCallout && (
                  <div className="rounded-2xl border border-teal-300 bg-teal-50 p-5">
                    <div className="text-sm font-bold uppercase tracking-wide text-teal-800">
                      Age is not the decision
                    </div>
                    <p className="mt-1 text-sm text-teal-900">
                      The chart-only pass leaned on age. After the room, the top option depends on
                      function, goals and logistics — not the number on the chart.
                    </p>
                  </div>
                )}
                <SectionTitle>Recommendation after the room</SectionTitle>
                <RankedList
                  options={result.recommendations.post.options}
                  deltas={result.recommendations.delta}
                  emphasizeDependsOn
                />
              </div>
            ) : (
              <EmptyHint text="Nothing to re-rank yet." />
            ))}

          {/* ---- Stage 4: Verify ---- */}
          {stage === 3 &&
            (result ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-500">Overall</span>
                  <VerdictBadge verdict={result.verifier.overall} />
                  {result.verifier.degraded && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      degraded — grounding timed out
                    </span>
                  )}
                </div>

                <div>
                  <SectionTitle>Rule checks</SectionTitle>
                  <div className="space-y-2">
                    {result.verifier.rule_checks.map((rc) => (
                      <div
                        key={rc.rule_id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                              {rc.rule_id}
                            </span>
                            <span className="text-sm font-medium text-slate-800">{rc.message}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {rc.citation_id && <CitationPill id={rc.citation_id} />}
                          <VerdictBadge verdict={rc.verdict} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle>Groundings</SectionTitle>
                  <div className="space-y-2">
                    {result.verifier.groundings.map((g) => (
                      <div
                        key={g.claim_id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800">{g.claim_text}</span>
                          <div className="flex items-center gap-2">
                            {g.citation_id && <CitationPill id={g.citation_id} />}
                            <VerdictBadge verdict={g.verdict} />
                          </div>
                        </div>
                        {g.quote && g.quote.trim().length > 0 && (
                          <blockquote className="mt-2 border-l-2 border-indigo-300 pl-3 text-sm italic text-slate-600">
                            &ldquo;{g.quote}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyHint text="Nothing to verify yet." />
            ))}

          {/* ---- Stage 5: Decision ---- */}
          {stage === 4 &&
            (result && top ? (
              <DecisionBar top={top} decision={decision} onChange={setDecision} />
            ) : (
              <EmptyHint text="No decision available — run a case first." />
            ))}
        </Stage>
      </div>

      <KeyboardLegend />
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h3>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}
