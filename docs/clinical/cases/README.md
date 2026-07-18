---
title: "Synthetic Cases, Consilium"
type: reference
tags: [hackathon, hackathon/case]
synthetic: true
---

# Synthetic Cases

Two fully synthetic, de-identified clinical encounters that ground the Consilium demo, built from two real clinic encounters. **All names, identifiers, dates, and locations are fabricated;** only the clinical substance and the decision logic are preserved. No real patient data lives here or anywhere in the vault, S3, or the shared brief. The real source documents were read locally and never copied into the vault.

## Files

| File | What it is |
|---|---|
| `Case A - fit 62yo transformed high-grade BCL with CNS.md` | Human-readable: chart, transcript, note, after-visit summary |
| `Case B - robust 86yo primary-refractory DLBCL.md` | Human-readable version of Case B |
| `consilium-case-A.json`, `consilium-case-B.json` | Dataset-schema records (metadata, patient_context, encounter_fhir, transcript, note, AVS, provenance) |
| `consilium-cases.jsonl` | Both records, one per line, for the pipeline |

## The twin: age is not the decision

Both patients have primary-refractory aggressive B-cell lymphoma. The naive chart-only plan is driven by the single loudest variable, age, and it is wrong in opposite directions. The room corrects each.

- **Case A, 62M, fit.** Chart says primary-refractory aggressive lymphoma; a chart-only pass reaches for standard salvage. The room surfaces new back pain, leg weakness, and urinary hesitancy, which turn out to be **CNS involvement**, a variable that reroutes therapy entirely. Combined with his fitness and goals, the plan **escalates** to CNS-directed salvage plus intrathecal therapy with intent to reach CAR-T. Here the room escalates.
- **Case B, 86F, robust.** Chart says age 86, and a chart-only pass down-triages toward gentle or palliative therapy (and may wrongly surface tafasitamab-lenalidomide). The room reveals **robust performance status** (still gardening, independent, wants to fight). The biology (**primary-refractory excludes tafa-len**) and logistics (**too old and too far for CAR-T**) then narrow the choice to **epcoritamab + GemOx**, a deliberately off-guideline but appropriate choice. Here the room corrects an age-based under-read.

## Why this reframes the product

The real decision in Case B was **deliberately off strict NCCN guidance**. That is the point, not a bug. Consilium is not a guideline-enforcement robot; it is a considerations-surfacing tool. It should:

1. Build a pre-visit differential from the chart, ranked, each option with its evidence and the attributes it depends on.
2. Re-rank as the conversation surfaces variables the chart missed (performance status beyond ECOG, CNS symptoms, patient goals, logistics, caregiver).
3. When the clinician's emerging choice diverges from a guideline default, **explain the tradeoff and ground it** (for example: "tafa-len excluded here: primary-refractory"; "epcoritamab + GemOx is off strict guideline for this age, supported by X, chosen for robust performance status"), and let the human make the call.

See `../Drafts/Project Brief - Consilium.md`, the shareable visual, and `../Drafts/Decision Variables Rubric.md` for the full list of what has to be weighed in the room.

---
Back to [[Abridge x Anthropic Hackathon]]
