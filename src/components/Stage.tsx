/**
 * Stage chrome: a horizontal progress rail of the five narrative stages plus a
 * titled content region. The stage machine lives in page.tsx; this is presentation.
 */
export interface StageDef {
  id: string;
  title: string;
  kicker: string;
}

export const STAGES: StageDef[] = [
  { id: "chart", title: "Chart", kicker: "What the agent sees before the room" },
  { id: "room", title: "The room", kicker: "Signals surface from the conversation" },
  { id: "rerank", title: "Re-rank", kicker: "The room disposes — the plan moves" },
  { id: "verify", title: "Verify", kicker: "Every claim checked and grounded" },
  { id: "decision", title: "Decision", kicker: "Accept or override" },
];

export function StageRail({ active }: { active: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STAGES.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                current
                  ? "bg-slate-900 text-white"
                  : done
                    ? "bg-slate-200 text-slate-600"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  current ? "bg-white text-slate-900" : done ? "bg-slate-400 text-white" : "bg-slate-300 text-white"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {s.title}
            </span>
            {i < STAGES.length - 1 && (
              <span className={`h-px w-4 ${done ? "bg-slate-400" : "bg-slate-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Stage({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const stage = STAGES[index];
  return (
    <section key={stage.id} className="stage-enter">
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          Stage {index + 1} of {STAGES.length}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{stage.title}</h2>
        <p className="text-base text-slate-500">{stage.kicker}</p>
      </div>
      {children}
    </section>
  );
}
