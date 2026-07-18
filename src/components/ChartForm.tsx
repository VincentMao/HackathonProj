/**
 * Editable chart facts — the decisive fields the reasoner keys on. Editing these (or the
 * transcript) and hitting "Run live" produces new recommendations. Light coupling keeps
 * derived fields consistent (chemosensitive tracks primary-refractory; CNS compartment
 * clears when involvement is turned off).
 */
"use client";
import type { ChartExtract } from "@/lib/rules";

const COO = ["GCB", "ABC", "non_GCB", "unknown"] as const;
const TX_INTENT = ["intended", "ineligible", "undetermined"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

export default function ChartForm({
  chart,
  onChange,
  disabled = false,
}: {
  chart: ChartExtract;
  onChange: (next: ChartExtract) => void;
  disabled?: boolean;
}) {
  const setAge = (age: number) => onChange({ ...chart, fitness: { ...chart.fitness, age } });

  const setPrimaryRefractory = (v: boolean) =>
    onChange({
      ...chart,
      refractoriness: { ...chart.refractoriness, primary_refractory: v },
      disease: { ...chart.disease, chemosensitive: !v, relapse_timing: v ? "early" : chart.disease.relapse_timing },
    });

  const setCns = (v: boolean) =>
    onChange({
      ...chart,
      disease: {
        ...chart.disease,
        cns_involvement: v,
        cns_compartment: v ? (chart.disease.cns_compartment.length ? chart.disease.cns_compartment : ["leptomeningeal"]) : [],
      },
    });

  const setCoo = (v: (typeof COO)[number]) =>
    onChange({ ...chart, disease: { ...chart.disease, cell_of_origin: v } });

  const setTxIntent = (v: (typeof TX_INTENT)[number]) => onChange({ ...chart, transplant_intent: v });

  return (
    <fieldset disabled={disabled} className="space-y-0.5 divide-y divide-slate-100">
      <Field label="Age">
        <input
          type="number"
          value={chart.fitness.age}
          min={18}
          max={110}
          onChange={(e) => setAge(Number(e.target.value))}
          className={`w-20 text-right ${selectCls}`}
        />
      </Field>

      <Field label="Primary-refractory">
        <input
          type="checkbox"
          checked={chart.refractoriness.primary_refractory}
          onChange={(e) => setPrimaryRefractory(e.target.checked)}
          className="h-4 w-4 accent-teal-600"
        />
      </Field>

      <Field label="CNS involvement">
        <input
          type="checkbox"
          checked={chart.disease.cns_involvement}
          onChange={(e) => setCns(e.target.checked)}
          className="h-4 w-4 accent-teal-600"
        />
      </Field>

      <Field label="Cell of origin">
        <select value={chart.disease.cell_of_origin} onChange={(e) => setCoo(e.target.value as (typeof COO)[number])} className={selectCls}>
          {COO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Transplant intent">
        <select value={chart.transplant_intent} onChange={(e) => setTxIntent(e.target.value as (typeof TX_INTENT)[number])} className={selectCls}>
          {TX_INTENT.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}
