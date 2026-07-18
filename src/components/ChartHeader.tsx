/** Compact patient chart summary header shown from the Chart stage onward. */
import type { ChartSummary } from "./labels";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="truncate text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

export default function ChartHeader({ chart }: { chart: ChartSummary }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {chart.name}
            <span className="ml-2 text-base font-medium text-slate-500">
              {chart.age}
              {chart.sex}
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{chart.note}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          Chart
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Diagnosis" value={chart.diagnosis} />
        <Field label="Refractoriness" value={chart.refractoriness} />
        <Field label="Prior line" value={chart.priorLine} />
        <Field label="Performance" value={chart.ecog} />
        <Field label="Age" value={`${chart.age} ${chart.sex}`} />
      </div>
    </section>
  );
}
