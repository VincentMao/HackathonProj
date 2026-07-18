/**
 * The full editable chart. Every field a clinician reads is shown and editable; the whole
 * chart is fed to the reasoner (which weighs organ function, neuropathy, relapse timing,
 * etc. against the rule table). Light coupling keeps derived fields consistent.
 */
"use client";
import type { ChartExtract } from "@/lib/rules";

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-700">{title}</p>
      <div className="space-y-0.5 divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Text({ value, onChange, w = "w-44" }: { value: string; onChange: (v: string) => void; w?: string }) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`${w} ${inputCls}`} />;
}

function Num({
  value,
  onChange,
  w = "w-20",
  min,
  max,
  step,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  w?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${w} text-right ${inputCls}`}
    />
  );
}

function Bool({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-teal-600" />;
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Area({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className={`w-full ${inputCls}`}
    />
  );
}

export default function ChartForm({
  chart,
  onChange,
  disabled = false,
}: {
  chart: ChartExtract;
  onChange: (next: ChartExtract) => void;
  disabled?: boolean;
}) {
  const c = chart;
  const patient = (p: Partial<ChartExtract["patient"]>) => onChange({ ...c, patient: { ...c.patient, ...p } });
  const disease = (p: Partial<ChartExtract["disease"]>) => onChange({ ...c, disease: { ...c.disease, ...p } });
  const molecular = (p: Partial<ChartExtract["disease"]["molecular"]>) =>
    onChange({ ...c, disease: { ...c.disease, molecular: { ...c.disease.molecular, ...p } } });
  const fitness = (p: Partial<ChartExtract["fitness"]>) => onChange({ ...c, fitness: { ...c.fitness, ...p } });
  const organ = (p: Partial<ChartExtract["organ"]>) => onChange({ ...c, organ: { ...c.organ, ...p } });
  const neuro = (p: Partial<ChartExtract["neuro"]>) => onChange({ ...c, neuro: { ...c.neuro, ...p } });
  const prior = (p: Partial<ChartExtract["prior"]>) => onChange({ ...c, prior: { ...c.prior, ...p } });
  const labs = (p: Partial<ChartExtract["labs"]>) => onChange({ ...c, labs: { ...c.labs, ...p } });
  const social = (p: Partial<ChartExtract["social"]>) => onChange({ ...c, social: { ...c.social, ...p } });

  const setPrimaryRefractory = (v: boolean) =>
    onChange({
      ...c,
      refractoriness: { primary_refractory: v },
      disease: { ...c.disease, chemosensitive: !v, relapse_timing: v ? "early" : c.disease.relapse_timing },
    });
  const setCns = (v: boolean) =>
    onChange({
      ...c,
      disease: {
        ...c.disease,
        cns_involvement: v,
        cns_compartment: v ? (c.disease.cns_compartment.length ? c.disease.cns_compartment : ["leptomeningeal"]) : [],
      },
    });

  return (
    <fieldset disabled={disabled} className="divide-y divide-slate-200">
      <Section title="Patient">
        <Row label="Name"><Text value={c.patient.name} onChange={(v) => patient({ name: v })} /></Row>
        <Row label="MRN"><Text value={c.patient.mrn} onChange={(v) => patient({ mrn: v })} w="w-32" /></Row>
        <Row label="Sex"><Select value={c.patient.sex} onChange={(v) => patient({ sex: v })} options={["male", "female", "other", "unknown"] as const} /></Row>
        <Row label="Age"><Num value={c.fitness.age} onChange={(v) => fitness({ age: v ?? 0 })} min={18} max={110} /></Row>
      </Section>

      <Section title="Diagnosis">
        <label className="block py-1.5">
          <span className="text-sm text-slate-600">Diagnosis</span>
          <Area value={c.disease.diagnosis} onChange={(v) => disease({ diagnosis: v })} />
        </label>
        <Row label="Cell of origin"><Select value={c.disease.cell_of_origin} onChange={(v) => disease({ cell_of_origin: v })} options={["GCB", "ABC", "non_GCB", "unknown"] as const} /></Row>
        <Row label="MYC positive"><Bool value={c.disease.molecular.myc_positive} onChange={(v) => molecular({ myc_positive: v })} /></Row>
        <Row label="MYC method"><Select value={c.disease.molecular.myc_method} onChange={(v) => molecular({ myc_method: v })} options={["unknown", "rearrangement", "amplification", "not_tested"] as const} /></Row>
        <Row label="Double-hit"><Bool value={c.disease.molecular.double_hit} onChange={(v) => molecular({ double_hit: v })} /></Row>
        <Row label="Ki-67 (%)"><Num value={c.disease.ki67} onChange={(v) => disease({ ki67: v })} min={0} max={100} /></Row>
      </Section>

      <Section title="Disease extent">
        <Row label="Stage"><Text value={c.disease.stage} onChange={(v) => disease({ stage: v })} w="w-24" /></Row>
        <Row label="B symptoms"><Bool value={c.disease.b_symptoms} onChange={(v) => disease({ b_symptoms: v })} /></Row>
        <label className="block py-1.5">
          <span className="text-sm text-slate-600">Sites</span>
          <Area value={c.disease.sites} onChange={(v) => disease({ sites: v })} />
        </label>
        <Row label="Largest mass (cm)"><Num value={c.disease.largest_mass_cm} onChange={(v) => disease({ largest_mass_cm: v })} step={0.1} /></Row>
        <Row label="LDH (× ULN)"><Num value={c.disease.ldh_uln_ratio} onChange={(v) => disease({ ldh_uln_ratio: v })} step={0.1} /></Row>
        <Row label="CNS involvement"><Bool value={c.disease.cns_involvement} onChange={setCns} /></Row>
      </Section>

      <Section title="Course & intent">
        <Row label="Line of therapy"><Num value={c.line} onChange={(v) => onChange({ ...c, line: v ?? 2 })} min={1} max={9} /></Row>
        <Row label="Primary-refractory"><Bool value={c.refractoriness.primary_refractory} onChange={setPrimaryRefractory} /></Row>
        <Row label="Chemosensitive"><Bool value={c.disease.chemosensitive} onChange={(v) => disease({ chemosensitive: v })} /></Row>
        <Row label="Relapse timing"><Select value={c.disease.relapse_timing} onChange={(v) => disease({ relapse_timing: v })} options={["early", "late", "na"] as const} /></Row>
        <Row label="Transplant intent"><Select value={c.transplant_intent} onChange={(v) => onChange({ ...c, transplant_intent: v })} options={["intended", "ineligible", "undetermined"] as const} /></Row>
      </Section>

      <Section title="Fitness">
        <Row label="ECOG"><Select value={String(c.fitness.ecog)} onChange={(v) => fitness({ ecog: Number(v) })} options={["0", "1", "2", "3", "4"] as const} /></Row>
        <Row label="Cell-therapy fit (composite)"><Bool value={c.fitness.cell_therapy_fit} onChange={(v) => fitness({ cell_therapy_fit: v })} /></Row>
        <Row label="Geriatric assessment done"><Bool value={c.geriatric_assessment.completed} onChange={(v) => onChange({ ...c, geriatric_assessment: { completed: v } })} /></Row>
      </Section>

      <Section title="Organ function">
        <Row label="LVEF current (%)"><Num value={c.organ.lvef_current} onChange={(v) => organ({ lvef_current: v })} min={0} max={100} /></Row>
        <Row label="LVEF baseline (%)"><Num value={c.organ.lvef_baseline} onChange={(v) => organ({ lvef_baseline: v })} min={0} max={100} /></Row>
        <Row label="eGFR"><Text value={c.organ.egfr} onChange={(v) => organ({ egfr: v })} w="w-24" /></Row>
        <Row label="Hepatitis"><Text value={c.organ.hepatitis_status} onChange={(v) => organ({ hepatitis_status: v })} /></Row>
      </Section>

      <Section title="Neurologic">
        <Row label="Peripheral neuropathy grade"><Select value={String(c.neuro.neuropathy_grade)} onChange={(v) => neuro({ neuropathy_grade: Number(v) })} options={["0", "1", "2", "3", "4"] as const} /></Row>
        <Row label="Prior foot drop"><Bool value={c.neuro.foot_drop_history} onChange={(v) => neuro({ foot_drop_history: v })} /></Row>
      </Section>

      <Section title="Prior therapy">
        <Row label="First line"><Text value={c.prior.first_line} onChange={(v) => prior({ first_line: v })} /></Row>
        <Row label="Prior response"><Text value={c.prior.prior_response} onChange={(v) => prior({ prior_response: v })} /></Row>
        <Row label="Anthracycline exposed"><Bool value={c.prior.anthracycline_exposed} onChange={(v) => prior({ anthracycline_exposed: v })} /></Row>
        <Row label="Prior vincristine neuropathy"><Bool value={c.prior.vincristine_neuropathy} onChange={(v) => prior({ vincristine_neuropathy: v })} /></Row>
        <Row label="Prior CD19-directed therapy"><Bool value={c.prior.cd19_directed} onChange={(v) => prior({ cd19_directed: v })} /></Row>
      </Section>

      <Section title="Labs">
        <Row label="Hemoglobin (g/dL)"><Num value={c.labs.hgb} onChange={(v) => labs({ hgb: v })} step={0.1} /></Row>
        <label className="block py-1.5">
          <span className="text-sm text-slate-600">Other labs</span>
          <Area value={c.labs.other} onChange={(v) => labs({ other: v })} />
        </label>
      </Section>

      <Section title="Social">
        <Row label="Distance to center (min)"><Num value={c.social.distance_minutes} onChange={(v) => social({ distance_minutes: v })} /></Row>
        <Row label="Lives with spouse"><Bool value={c.social.lives_with_spouse} onChange={(v) => social({ lives_with_spouse: v })} /></Row>
      </Section>
    </fieldset>
  );
}
