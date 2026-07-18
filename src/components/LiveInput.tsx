/**
 * Case C live input: editable transcript, suggested sentences to append, and a
 * Run-live button that POSTs to /api/run.
 */
import { CASE_C_SUGGESTIONS } from "./labels";

export default function LiveInput({
  transcript,
  onChange,
  onRun,
  loading,
}: {
  transcript: string;
  onChange: (t: string) => void;
  onRun: () => void;
  loading: boolean;
}) {
  const append = (s: string) => {
    const sep = transcript.length && !/\s$/.test(transcript) ? "\n" : "";
    onChange(`${transcript}${sep}PT: ${s}.`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Live transcript</h2>
        <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          Case C · live
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Edit the conversation, then run the pipeline. The signals, re-rank and verifier are computed live.
      </p>

      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="mt-4 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm leading-relaxed text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Append
        </span>
        {CASE_C_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => append(s)}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            + {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={loading || transcript.trim().length === 0}
        className="mt-5 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Running…" : "Run live"}
      </button>
    </section>
  );
}
