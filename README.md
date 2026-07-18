# Consilium

> **The chart proposes, the room disposes.**

Agentic treatment-decision support for relapsed/refractory aggressive B-cell lymphoma
(DLBCL / transformed FL), second line, one decision point. Built for the Abridge ×
Anthropic × Lightspeed hackathon ("agentic AI in healthcare").

Every other oncology tool goes `chart → recommendation`. Consilium goes
`chart → room → recommendation`. Two behaviors fall out:

1. A signal from the visit conversation can **correct the chart** — the record says one
   thing, the room says another, the plan changes.
2. When the clinician goes **off-guideline defensibly**, the agent names the boundary
   crossed, grounds the tradeoff in evidence, and lets them proceed. It explains; it never
   hard-stops a licensed physician. Hard stops are reserved for the affirmatively unsafe.

The screen is a **temporal narrative** — state changing over time as the room speaks — not
a dashboard.

## Pipeline

Three LLM agents plus two deterministic assets:

```
chart.json ─▶ chart.ts (deterministic, no LLM) ─┐
                                                ├▶ reasoner (LLM ×2: chart-only, then chart+room)
transcript ─▶ signals (LLM, verbatim spans) ────┘        │
                                                         ▼
                                     RecommendationSet {pre, post, delta}
                                                         │
                                     verifier (rule-check + in-context grounding) ─▶ VerifierReport
```

Retrieval lives **only** in the verifier (in-context over the evidence pack — no vector
store). Cached (Cases A/B) and live (Case C) run the **identical** `runPipeline`.

## Repository layout

```
src/
  app/            Next.js app router (single page + /api/run)
  lib/            contracts (zod), chart normalizer, rules, pipeline, anthropic client
    agents/       signals · reasoner · verifier
  components/     UI (temporal-narrative stage)
  types/
data/
  cases/          the two synthetic twin cases (+ jsonl)
  knowledge/      rules.json · evidence-pack.json · schema/  (runtime clinical brain)
  fixtures/       baked pipeline outputs (cached A/B)
docs/
  clinical/       rules.rubric.md · coverage.md · cases/   (Shalin's clinical source)
  evidence/cards/ per-source bibliographic cards
  design/         build-plan.md
scripts/          validate-knowledge · bake-fixtures
tests/
archive/          unused/superseded (25-encounter raw set, old evidence manifests)
```

## Getting started

```bash
git clone https://github.com/VincentMao/HackathonProj.git
cd HackathonProj
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Other scripts: `npm run typecheck` · `npm run test` · `npm run validate:knowledge` ·
`npm run bake:fixtures`.

## Data & safety

All patient data is **synthetic and de-identified** — no real PHI anywhere. This repo is
public: it never contains source PDFs or NCCN-derived text (license forbids reproduction);
only the derived evidence-pack structure with citations and links. See `.gitignore`.

## Team

- [@VincentMao](https://github.com/VincentMao) — engineering
- Shalin — clinical (Yale lymphoma oncology)
