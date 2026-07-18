# Consilium — Build Plan

## Context

**Consilium** is a hackathon project (Abridge × Anthropic × Lightspeed, "agentic AI in healthcare") for a two-person team over a single working day. The product thesis: *the chart proposes, the room disposes* — every other oncology tool goes `chart → recommendation`; Consilium goes `chart → room → recommendation`. Two behaviors nobody else does fall out: (1) a signal from the visit conversation can **correct the chart**, changing the plan; (2) when a clinician goes **off-guideline defensibly**, the agent names the boundary, grounds the tradeoff in evidence, and lets them proceed — it explains, it never hard-stops a licensed physician. Hard stops are reserved for the affirmatively unsafe.

Scope is deliberately narrow: relapsed/refractory aggressive B-cell lymphoma (DLBCL / transformed FL), second line, one decision point. The deliverable is a single-screen, keyboard-driven **temporal narrative** (state changes over time — not a dashboard) demoed in 3 minutes across 3 cases.

### What's actually in the repo (reality check vs. the original plan)

Verified by reading every asset:

- **Both twin cases are fully authored and demo-ready** (`synthetic-cases/consilium-case-{A,B}.json` + human-readable `.md`). Each has a FHIR-shaped chart, a strong transcript, a gold clinical `note` with plan + off-guideline reasoning, and an AVS. Case A = Okafor 62M, CNS escalation. Case B = Ferreira 86F, off-guideline right-size.
- **The schema is real and locked** (`data/synthetic-ambient-fhir-25/schema.json`, JSON Schema draft 2020-12). The twin cases conform; the 25-encounter Abridge set shares it exactly. Fields: `id, metadata, patient_context, encounter_fhir, transcript, note, after_visit_summary, after_visit_summary_provenance`. (Note: the provenance field is `after_visit_summary_provenance`, not `provenance`.)
- **The rule table exists as prose** in `evidence/rules.md` — the finished clinical brain: 11 decision domains (each variable tagged chart / room / both), the exact `VisitSignals` field list with enums, and ~22 verifier rules in `IF/THEN` form. Build task = translate the "Verifier rules" section into `rules.json`; `rules.md` stays the human source of truth.
- **The evidence pack is a citation/fetch manifest** (`evidence/evidence-manifest.json`, 40 sources: `key, title, doi, pmid, priority, grounds`). It has **no anchor spans / population field**, and its content is **provisional** (per user). Treat the pack's *shape* as locked and its *content* as TBD; `key` is the `citation_id` value.

### Key invariants (design commitments)

- **The reasoner never sees `note` or `after_visit_summary`.** It runs on `chart + transcript` only. The gold `note` is a *validation target and fixture source*, never a pipeline input, or the demo is circular. Enforced by a test asserting `note` is absent from every prompt.
- **Retrieval lives only in the verifier**, after the recommendation exists — never as the generator. Confirmed approach: **in-context grounding** over the ~40-entry pack (no embeddings, no vector store). Deterministic and defensible on stage.
- **Recommendations come from a committed regimen enum.** Fail loud on unknown values.
- **Provenance is derived from `ref` prefix, never guessed** — a `ref` into `chart.*` renders a chart-derived chip; a `ref` into `visit.*` renders a conversation-derived chip. `citation_id`s validated against evidence-pack keys.
- **Cached and live use one code path.** Case A/B are cached fixtures (baked by running the real pipeline once); Case C is a cache miss on the *same* function. Equivalence is literal, not claimed.

---

## Repository reorganization (branch `refactor/production-structure`) — status

Latest pulled (HEAD `726882b`), working on branch `refactor/production-structure`. **Everything below is uncommitted in the working tree; `main` is untouched.** Merge to `main` only after the app is ready.

**Applied (uncommitted):**
- `git mv` of every asset into the production layout — renames, so git history is preserved:
  - `data/cases/` ← the two twins + `consilium-cases.jsonl`
  - `data/knowledge/` ← `rules.json`, `evidence-pack.json`, `schema/encounter-schema.json`
  - `docs/clinical/` ← `coverage.md`, `cases/*.md`, and `rules.rubric.md` (the untracked older `rules.md`, renamed to mark it as rationale-source)
  - `docs/evidence/cards/` ← the bibliographic evidence cards
  - `archive/` ← the 25-encounter Abridge raw set + superseded `evidence-manifest.{json,md}`
- Wrote config: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.example`.
- Wrote real, locked source: `src/lib/contracts.ts` (all 4 contracts + enums) and `src/lib/rules.ts` (`ChartExtract`, `CandidateEval`, the `REGIMEN_ATTRS` table, `RuleTable` schema).
- Wrote stubs: `src/lib/{anthropic,chart,pipeline}.ts`.

**Remaining to finish the skeleton, then commit (still on branch, no merge):**
1. Stubs: `src/lib/agents/{signals,reasoner,verifier}.ts`; `src/app/{layout.tsx,globals.css,page.tsx,api/run/route.ts}`; `scripts/{validate-knowledge,bake-fixtures}.ts`.
2. `.gitkeep` in `src/components/`, `src/types/`, `data/fixtures/`, `tests/`.
3. Rewrite `README.md` (Consilium overview, directory map, run steps).
4. Copy the build plan into the repo at `docs/design/build-plan.md`.
5. **Fix `.gitignore`:** `.env.example` is currently ignored by the `.env.*` rule — add `!.env.example`. Also add Next.js ignores: `.next/`, `/out`, `*.tsbuildinfo`, `.vercel`, `/coverage`.
6. `git add -A` and commit on the branch. Do **not** merge to `main`.

Target layout (already created on disk): `src/{app,lib,lib/agents,components,types}` · `data/{cases,knowledge,knowledge/schema,fixtures}` · `docs/{clinical,clinical/cases,evidence/cards,design}` · `scripts/` · `tests/` · `archive/`.

## Locked data contracts

All four are `zod` schemas in `lib/contracts.ts`, exported as both runtime validators and TS types, and enforced on every LLM boundary (Anthropic structured output / tool use → `zod.parse` → retry once on failure → fail loud).

### Shared enums

```ts
RegimenId = // committed enum, ~12
  | "R_DHAP" | "R_ICE" | "R_GEMOX"            // platinum / gem salvage
  | "POLA_MOSUN" | "EPCOR_GEMOX" | "POLA_BR"  // combos (mosun-pola=SUNMO; epcor+GemOx=NHL-2 off-label 2L; pola-BR 3L+)
  | "GLOFIT_GEMOX"                            // STARGLO — US-unavailable (CRL 2025-07-18)
  | "TAFA_LEN"                                // L-MIND — excluded in primary-refractory
  | "CAR_T_AXICEL" | "CAR_T_LISOCEL"         // 2L CAR-T (tisa-cel intentionally absent: BELINDA negative)
  | "CNS_SALVAGE_MATRIX"                      // MATRix/MARIETTA-type + IT for secondary CNS
  | "BSC_GOC"                                 // best supportive / goals-of-care

Verdict = "verified" | "off_guideline_explained" | "excluded" | "flagged" | "unverified"
// green            | amber                    | grey       | hard-stop | timeout/degraded

Ref = string // "chart.<field>" | "visit.<signalKey>" — prefix drives provenance chip type
CitationId = string // must exist as a `key` in evidence-pack.json, else fail loud
```

### 1. `VisitSignals` (output of the signal extractor)

Field keys are the committed enum from `rules.md`. Each signal carries a **verbatim** `evidence_span`.

```ts
VisitSignals = {
  case_id: string,
  mode: "cached" | "live",
  signals: Array<{
    key: SignalKey,          // enum: treatment_intent, risk_tolerance, functional_narrative,
                             //       new_neuro_symptoms, distance_to_center_minutes,
                             //       caregiver_reliability, shared_care_feasible,
                             //       neuropathy_severity_reported, clinician_relapse_confidence, ... (per rules.md)
    label: string,           // human label for the chip
    value: string | number | boolean,
    evidence_span: string,   // VERBATIM substring of the transcript
    ref: "visit." + key,     // provenance ref (always visit.* here)
    salience: "high" | "med" | "low"
  }>
}
```

### 2. `RecommendationSet` (output of the reasoner; `{pre, post}`)

```ts
Recommendation = {
  regimen: RegimenId,
  rank: number,                    // 1 = top
  intent: "curative" | "disease_control" | "palliative",
  status: "preferred" | "candidate" | "excluded" | "off_guideline",
  rationale: Array<{ text: string, ref: Ref }>,   // ref → chart field OR visit signal
  depends_on: Ref[],               // the attributes this option hinges on ("age is not the decision")
  off_guideline: null | {
    boundary: string,              // exact boundary crossed, e.g. "epcoritamab is on-label only as monotherapy at 3L+"
    citation_id: CitationId,       // e.g. "epcore-nhl2-gemox-blood-2025"
    tradeoff: string               // concrete tradeoff accepted
  }
}

RecommendationSet = {
  case_id: string,
  pre:  { options: Recommendation[] },   // chart-only pass
  post: { options: Recommendation[] },   // chart + room pass
  delta: Array<{                         // derived diff for the narrative
    regimen: RegimenId,
    change: "rose" | "fell" | "entered" | "excluded" | "flagged",
    from_rank: number | null,
    to_rank: number | null,
    driver_refs: Ref[]                   // which visit signals moved it
  }>
}
```

### 3. `VerifierReport` (output of the verifier)

```ts
VerifierReport = {
  case_id: string,
  rule_checks: Array<{                    // deterministic pass over rules.json
    rule_id: string,
    passed: boolean,
    verdict: Verdict,
    message: string,
    citation_id: CitationId | null
  }>,
  groundings: Array<{                     // in-context grounding of each rationale/exclusion/off-guideline claim
    claim_id: string,
    claim_text: string,
    verdict: Verdict,
    citation_id: CitationId | null,
    quote: string | null                  // anchor span from the evidence pack (null while content is provisional)
  }>,
  overall: Verdict,
  degraded: boolean                        // true if grounding timed out → claims render "unverified"
}
```

### 4. `Decision` (clinician action; append-only local JSON)

```ts
Decision = {
  case_id: string,
  chosen_regimen: RegimenId,
  action: "accept" | "override",
  override_reason: string | null,          // required when action = "override"
  recommendation_snapshot: RecommendationSet,   // provenance: what was on screen at decision time
  verifier_snapshot: VerifierReport,
  ts: string                               // ISO; injected at call time (not in the pure pipeline)
}
```

---

## Architecture & data flow

```
case.json ──▶ chart.ts (deterministic FHIR→ChartFacts, NO LLM) ──┐
                                                                 ├─▶ reasoner.ts (LLM ×2: pre=chart, post=chart+signals; reads rules.json)
transcript ──▶ signals.ts (LLM → VisitSignals, verbatim spans) ──┘        │
                                                                          ▼
                                                              RecommendationSet {pre,post,delta}
                                                                          │
                                                                          ▼
                                              verifier.ts (deterministic rule-check over rules.json,
                                                          THEN in-context grounding vs evidence-pack) ──▶ VerifierReport
                                                                          │
                                                                          ▼
                                              UI temporal narrative ──▶ Decision (accept/override) ──▶ append to log
```

- **Exclusions/flags are enforced deterministically**, not left to LLM whim: the reasoner ranks over the allowed candidate set, then `rules.json` exclusions are applied in code, and the verifier re-checks the same rules independently (belt-and-suspenders → the off-guideline amber beat is reproducible).
- **Verifier is off the critical path**: hard timeout → `degraded: true` → affected claims render as grey "unverified" chips rather than hanging the demo.

---

## File / module structure

```
/app
  page.tsx                 # single page; keyboard-driven stage machine (space=advance, r=reset, 1/2/3=jump)
  /api/run/route.ts        # POST {caseId, transcript} → runs pipeline live (Case C + any cache miss)
/lib
  contracts.ts             # zod schemas + TS types for all 4 contracts + RegimenId/Verdict/SignalKey enums
  chart.ts                 # deterministic FHIR→ChartFacts normalizer (no LLM); yields chart.* refs
  anthropic.ts             # Anthropic client + structured-output helper (tool use, no framework)
  agents/
    signals.ts             # signal extractor
    reasoner.ts            # runs twice (pre/post)
    verifier.ts            # rule check + in-context grounding
  rules.ts                 # loads rules.json; applyExclusions(); deterministic rule-check
  pipeline.ts              # runPipeline(chart,transcript) → {signals,recs,verifier}; getResult() cache wrapper
/data
  cases/case-A.json case-B.json case-C-base.json   # C = preloaded chart+transcript, judge appends sentences
  rules.json               # DERIVED from rules.md "Verifier rules" + VisitSignals field list
  evidence-pack.json       # from manifest (shape locked, content provisional)
  fixtures/case-A.result.json case-B.result.json   # baked pipeline outputs (instant, unstallable)
/components
  Stage.tsx RankedList.tsx RecCard.tsx ProvenanceChip.tsx VerdictBadge.tsx
  DeltaArrow.tsx LiveInput.tsx DecisionBar.tsx
/test
  pipeline.test.ts         # asserts note/AVS never in prompts; contracts validate; Case B off-guideline reproduces
```

---

## Cached-vs-live execution design

One function, two entry conditions — no branch in logic:

```ts
// pipeline.ts
export async function runPipeline(chart, transcript) { /* signals → reasoner×2 → verifier */ }

export async function getResult(caseId, transcript) {
  const key = sha256(caseId + transcript);
  const fixture = fixtures[key];                 // baked from a prior real runPipeline
  if (fixture) return { ...fixture, mode: "cached" };
  return { ...(await runPipeline(charts[caseId], transcript)), mode: "live" };
}
```

- **Case A/B**: preloaded transcript → hash matches baked fixture → instant. Fixtures are *generated by running `runPipeline` itself*, so they are byte-for-byte what live would produce.
- **Case C**: judge appends 2–3 sentences to the preloaded transcript → hash miss → `runPipeline` executes live. Literally the same function.
- On stage you can even hit "run live" on A/B to prove the equivalence claim is real.

---

## Build order (single day; demoable artifact ASAP, each step adds a beat not a dependency)

| # | Time-box | Step | Demoable beat added |
|---|---|---|---|
| 0 | pre-9am / ~45m | Scaffold Next.js + Tailwind + Vercel; `lib/contracts.ts` (all 4 zod schemas + enums); `anthropic.ts` helper | Repo deploys a "hello" page to Vercel |
| 1 | ~60m | `rules.json` from `rules.md`; `evidence-pack.json` (provisional) from manifest; `chart.ts` normalizer | ChartFacts prints for Case A/B (test) |
| 2 | ~75m | `signals.ts` + `reasoner.ts`; `runPipeline` end-to-end on Case A → console/JSON | **Pipeline produces `{pre,post,delta}` for a real case** (first working artifact) |
| 3 | ~75m | Minimal single screen: RankedList + RecCard + DeltaArrow rendering baked Case A fixture; keyboard space/reset | **First visual demo: the room escalates (Case A pre→post re-rank)** |
| 4 | ~45m | Case B fixture + off-guideline `status`/badge (amber) + `depends_on` "age is not the decision" chip | **The money beat: off-guideline right-size with amber boundary badge** |
| 5 | ~60m | `verifier.ts`: deterministic rule-check + in-context grounding; ProvenanceChip + VerdictBadge (green/amber/grey/red) | **Every claim traced to a chart field or a citation** |
| 6 | ~60m | `/api/run` + `LiveInput`; Case C = append sentences → live run through same path; timeout→unverified fallback | **Case C: judge types, real pipeline runs live on stage** |
| 7 | ~30m | `DecisionBar` (accept / override + reason) → append `Decision` to local JSON | Clinician disposition + provenance log |
| 8 | ~remaining | Polish: transitions, number-key case jump, pre-warm API, on-Vercel smoke test | Presentation-grade temporal narrative |

Fixtures for A and B are baked at the end of step 2/4 by running `runPipeline` once and saving output, so steps 3+ always render from saved JSON and never depend on a live call.

---

## Risk list (ranked) + mitigations

1. **Evidence-pack content (anchor spans) not final.** → Lock the *shape* now; verifier renders `quote: null` as a valid "verified-by-citation, quote pending" state; Shalin fills spans in parallel; nothing on the critical path waits on it.
2. **Live inference latency/failure during Case C.** → Verifier off critical path (timeout → grey "unverified"); hard timeout + "live failed → showing cached" fallback; pre-warm the API before demo; keep prompts/tokens small; Sonnet as workhorse.
3. **LLM emits a regimen outside the enum or malformed structure.** → Anthropic structured output/tool use + `zod.parse` + one retry, then fail loud to a safe render. Never silently coerce.
4. **Reasoner "cheats" by reading the gold note.** → Pipeline only ever passes `chart + transcript`; test asserts `note`/`after_visit_summary` absent from all prompts.
5. **Off-guideline beat (Case B) doesn't reproduce reliably.** → It's a baked fixture; and exclusions/off-guideline flags come from deterministic `rules.json`, not LLM sampling.
6. **Judges' Case C input yields a degenerate/boring result.** → Offer 2–3 seeded example sentences ("still gardening, wants to fight, lives 90 min away"); constrain input to "what the patient said."
7. **Provenance mis-attribution (chart vs room).** → Chip type derived from `ref` prefix in code; `citation_id`s validated against evidence-pack keys; fail loud on unknown.
8. **NCCN / copyright leak in a public repo.** → Never commit PDFs or NCCN-derived text; evidence-pack holds only derived structure + citations + links; `.gitignore` + a pre-commit `grep` guard.
9. **Vercel cold start / env misconfig at demo time.** → Deploy in step 0, smoke-test on Vercel by mid-morning, keep `localhost` as demo fallback, API key in env only.
10. **UI polish eats the day.** → Keyboard nav + transitions are the last, fully cuttable layer (see cut list).

---

## Cut list (drop in this order if behind; latest safe time to cut)

1. **Transitions / animation polish** → static state swaps. *Latest: 3:30pm.*
2. **Keyboard nav** → on-screen click buttons. *Latest: 3:00pm.*
3. **Decision/override persistence** → show the accept/override affordance without appending to the log. *Latest: 2:30pm.*
4. **In-context grounding (quotes)** → keep deterministic rule-check verdicts + citation badges only, drop live evidence quotes. *Latest: 2:00pm.*
5. **Live Case C** → fall back to a third baked case; keep the "run live" affordance on A/B if time allows. *Latest: 1:00pm.*
6. **One of the two hero cases** (last resort) → keep **Case B** (the money beat: off-guideline right-size). *Latest: 3:30pm.*

**Never cut:** one case showing a pre→post re-rank driven by a room signal, with provenance chips (chart vs conversation) and at least one off-guideline **amber** badge naming the boundary + citation. That single flow is the entire thesis.

---

## Verification (how we prove it works end-to-end)

- **Unit/contract:** `zod` parse of every fixture and every live output; test asserting `note`/`after_visit_summary` never appear in any prompt; test asserting Case B produces `EPCOR_GEMOX` at rank 1 with `status: off_guideline` and a valid `citation_id`.
- **Pipeline smoke:** `runPipeline` on Case A yields `delta` containing `CNS_SALVAGE_MATRIX` "entered/rose" driven by a `visit.new_neuro_symptoms` ref; on Case B yields `TAFA_LEN` `excluded` with reason = primary-refractory (not age).
- **Live-equivalence check:** run Case A both cached and live; assert the recommendation ranking matches (structure, not necessarily prose).
- **End-to-end on Vercel:** load the deployed URL, walk A → B with the keyboard, type a Case C sentence, confirm a live run completes and renders verdicts; confirm verifier timeout degrades to "unverified" rather than hanging.
- **Repo-safety check:** `grep` for NCCN text / PDF blobs before every push.

---

## Authoritative assets (committed at origin/main, 3 commits ahead of local)

- `evidence/rules.json` — 22 rules. `condition` (field-path expression) · `action` (exclude / prefer / deprioritize / flag / require_workup) · `therapy` · `rationale` · `citation_ids[]` · `severity` (hard/soft). Only 3 hard: **R01** tafa-len in primary-refractory, **R05** tisa-cel at 2L, **R08** bendamustine before planned cellular therapy. Everything else soft (explain-and-proceed).
- `evidence/evidence-pack.json` — 31 entries. `citation_id` · `trial_name` · `population` · `finding` (own words) · `anchor_quote` · `evidence_strength` (incl. `press_release_only`) · `limits` · `doi`/`pmid`.
- `evidence/coverage.md` — maps every claim in Cases A/B → firing `rule_id` + grounding `citation_id`. Two intentional partials: **A7** (allo-post-CAR-T: citation, no gate rule) and **B7** (treat-despite-equivocal-biopsy: R21, no trial citation — clinical-practice standard; render as "clinical-judgment rule, no trial citation").
- `evidence/cards/` — per-source card JSONs + `evidence-cards.json` (bibliographic backing; not needed at runtime).
- **Citation integrity verified:** all 28 citation_ids used by rules exist in the 31-entry pack; 3 orphans (`ALLO-POST-CART`, `SUNMO`, `EPCORE-DLBCL-1`) are expected (used by coverage or supporting-only).
- `evidence/rules.md` is **untracked, older prose** — the human rubric that `rules.json` was generated from. Not authoritative; archive to `evidence/rules.rubric.md` to remove ambiguity.

## Canonical field contract (rules.json ↔ ChartExtract / VisitSignals integration)

Rule conditions reference three evaluation contexts. The verifier evaluates each rule against `ChartExtract ∪ VisitSignals ∪ CandidateEval(candidate)`.

**Context 1 — `ChartExtract`** (deterministic from case JSON incl. `longitudinal_summary.condition_labels`; provenance = `chart.*`):
| field | type / enum |
|---|---|
| `line` | int |
| `region` | enum {US} (default US) |
| `transplant_intent` | enum {intended, ineligible, undetermined} |
| `refractoriness.primary_refractory` | bool |
| `disease.chemosensitive` | bool |
| `disease.relapse_timing` | enum {early ≤12mo, late >12mo, na} |
| `disease.cell_of_origin` | enum {GCB, ABC, non_GCB, unknown} |
| `disease.cns_involvement` | bool |
| `disease.cns_compartment` | array<enum {parenchymal, leptomeningeal, csf_positive}> |
| `disease.molecular.myc_positive` | bool |
| `disease.molecular.myc_method` | enum {unknown, rearrangement, amplification, not_tested} |
| `fitness.age` | int |
| `fitness.cell_therapy_fit` | bool — **DERIVED composite**, not a raw extract (see open items) |
| `prior.first_line` | string/enum (e.g. R-CHOP, R-miniCHOP) |
| `prior.cd19_directed` | bool |
| `geriatric_assessment.completed` | bool |

**Context 2 — `VisitSignals`** (from transcript; provenance = `visit.*`; only these 4 are referenced by rules, though the full signal set per `rules.md` still drives the narrative):
| field | type / enum |
|---|---|
| `visit.caregiver_reliability` | enum {robust, limited, none} |
| `visit.clinician_relapse_confidence` | enum {biopsy_confirmed, imaging_clinical_gestalt, uncertain} |
| `visit.distance_to_center_minutes` | int |
| `visit.neuropathy_severity_reported` | ordered enum {none < grade1 < grade2plus} |

**Context 3 — `CandidateEval`** (synthesized per-recommendation by the verifier from a `RegimenId → attributes` table I own; not patient data):
| field | type / enum |
|---|---|
| `therapy` | canonical regimen/product id string |
| `therapy.class` | enum {CD19-CAR-T, bispecific, adc, chemo_salvage, imid_combo, …} |
| `therapy.is_bispecific` | bool |
| `regimen.contains_bendamustine` | bool |
| `regimen.contains_polatuzumab` | bool |
| `plan.intends_cellular_therapy` | bool |
| `plan.cd19_car_t` | bool |
| `plan.hd_mtx` | bool |
| `plan.bridging_agent` | string \| null |

## Open items for Shalin (rule-condition tweaks; ~10-min pass) + case-data fixes

Rule-condition tweaks so conditions evaluate deterministically:
1. **R10 literal:** `visit.neuropathy_severity_reported >= 'grade2'` → use enum value `'grade2plus'` (define order none<grade1<grade2plus).
2. **R19 grammar:** `therapy in ['CD19-CAR-T','bispecific']` → `therapy.class in [...]` (class, not product identity).
3. **Therapy-string vocabulary:** lock the exact strings R06 (`'epcoritamab+GemOx'`), R07 (`'glofitamab+GemOx'`), R05 (`tisagenlecleucel`), etc.; I'll match my `RegimenId` table to them.
4. **R01 determinism (Case B):** R01 fires on `refractoriness.primary_refractory == true`. Case B is clinically "response then early progression" — confirm the chart sets `primary_refractory = true`, OR broaden R01 to `refractoriness in {primary_refractory, early_relapse_le6mo}` (L-MIND's actual exclusion window). Without one of these, the tafa-len exclusion (money-beat B2) won't fire deterministically.
5. **`fitness.cell_therapy_fit`:** define as a derived composite output (fitness+organ+comorbidity+caregiver+logistics) with documented inputs, not a raw field (R03 depends on it; R11 forbids any age rule).
6. **`transplant_intent` enum:** confirm {intended, ineligible, undetermined}; ZUMA-7/TRANSFORM population = intended, PILOT = ineligible.

Case-data fixes (case JSONs, unchanged by the new commits — verified live):
- **Case B cerebral aneurysm** is in `longitudinal_summary.condition_labels` but **absent from `related_resources.Condition`**. The chart normalizer must read `condition_labels` so Case B's CAR-T exclusion is reconstructable as a *composite* (aneurysm comorbidity + 90-min distance + lives-alone/part-time caregiver) rather than by age. Optionally add it as a Condition resource too.
- **Case B R19 caregiver flag:** with `caregiver_reliability` likely `limited` (lives alone, daughter "comes to the important ones"), R19 will add a soft flag to the epcoritamab choice. Confirm this is intended (shared-care/center ramp-up arguably satisfies it) — it can add noise to the money beat.
- **`longitudinal_summary.resource_counts`** don't match `related_resources` counts (e.g. Case B Condition 6 vs 4). Plausibly by-design (longitudinal totals vs encounter subset); confirm which layer the reasoner reads. Not a bug if the label is honored.

Findings already resolved by the new commits (were flagged against the stale `rules.md`/manifest): citation machine-linkage (now `citation_id` enum), LOTIS-2/SCHOLAR-1 orphans (now used by R09/R20), `population`+`anchor_quote` fields (now present), manifest template literal, EPCORE-DLBCL-1 OS wording (pack now says "did not reach significance").

---

## Update (2026-07-18): single-page interactive model

The 3-case staged UI (2 cached tabs + 1 live) was replaced by **one interactive page**:
- Load a starting case (A or B) → instant cached result.
- The **chart facts** (age, primary-refractory, CNS involvement, cell-of-origin, transplant intent) and the **transcript** are **editable**.
- **Run live** (⌘⏎) runs the identical pipeline on the edited inputs → new recommendations.
- Layout is a single **before/after** screen: "Chart only" vs "After the room" ranked lists, with the room's signals, the verifier panel, and the decision bar.

New endpoint `GET /api/case?caseId=` returns the deterministic `ChartExtract` + transcript to populate the editable inputs. `POST /api/run` now accepts an optional validated `chart` override; `getResult(caseId, transcript, chartOverride?)` returns the cached fixture only when there are no edits, else runs live. Stage/keyboard-narrative components were removed.
