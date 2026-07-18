# Coverage check — the two cases against rules + evidence

Every recommendation, exclusion, and off-guideline rationale in `Synthetic Cases/consilium-case-A.json` and `consilium-case-B.json`, mapped to the `rule_id` that fires and the `citation_id` that grounds it. A claim with **no rule and no citation** is a red flag (the verifier would fail it live). Two claims are intentionally partial and are called out at the end; neither is fully uncovered.

`citation_id` values are the committed enum shared with `rules.json` and `evidence-pack.json`.

## Case A — 62M, primary-refractory transformed high-grade BCL, secondary CNS involvement

| # | Claim in the case | Type | Rule | Citation(s) | Status |
|---|---|---|---|---|---|
| A1 | CNS-directed salvage (R-DHAP) + intrathecal MTX/rituximab, because new neuro symptoms indicate parenchymal + leptomeningeal CNS disease | recommendation | R14 | MARIETTA, MATRix, CNS-PHARM | covered |
| A2 | Intent to proceed to CD19 CAR-T (curative intent) in a fit primary-refractory patient | recommendation | R03 | ZUMA-7, TRANSFORM | covered |
| A3 | CAR-T product should be liso-cel (lower ICANS given baseline CNS disease) | recommendation | R15 | TRANSCEND, CART-CNS | covered |
| A4 | ASCT excluded (chemorefractory / primary-refractory) | exclusion | R02 | PARMA | covered |
| A5 | Aggressive path is justified by fitness, goals, and caregiver — not blocked by anything; "if you were frail I'd have a different conversation" | rationale | R11, R19 | CART-OLDER, PILOT | covered |
| A6 | double-hit-LIKE biology (MYC amplification + IGH/BCL2), not true double-hit | rationale | R13 | WHO-HAEM5, ICC | covered |
| A7 | Allogeneic transplant reserved for post-CAR-T relapse, not upfront | plan (forward sequencing) | — | ALLO-POST-CART | citation only (see notes) |

## Case B — 86F, primary-refractory DLBCL (GCB), robust performance status, distant

| # | Claim in the case | Type | Rule | Citation(s) | Status |
|---|---|---|---|---|---|
| B1 | Chosen regimen: epcoritamab + GemOx, acknowledged off-label in 2L | recommendation (off-guideline) | R06 | EPCORE-NHL-2, EPCORE-NHL-1 | covered |
| B2 | Tafasitamab-lenalidomide excluded because the disease is primary-refractory (not because of age) | exclusion (hard) | R01 | L-MIND | covered |
| B3 | CAR-T not feasible — a composite of comorbidity + distance + caregiver, explicitly NOT a numeric age rule | exclusion / rationale | R11, R18, R19 | CART-OLDER, PILOT | covered |
| B4 | Mosun-pola (gentler) was weighed but declined to avoid under-treating a phenotypically fit patient | rationale | R20 | SUNMO, SCHOLAR-1, FIL-sGA | covered |
| B5 | Robust performance status despite age 86 (still gardening, independent) — fitness, not age, drives the plan | rationale | R12 | FIL-sGA, ASCO-GA-2018, ASCO-GA-2023, ECOG-FRAILTY | covered |
| B6 | Shared-care delivery: bispecific ramp-up at the academic center, then hand-back to the local oncologist (patient 90 min away) | plan | R18 | EPCORE-NHL-1, GLOFIT-MONO | covered |
| B7 | Treated as refractory on serial-PET + clinical gestalt despite an equivocal necrotic re-biopsy | rationale | R21 | — | rule only (see notes) |
| B8 | The prior "mini-R-CHOP" was a valid age-attenuated 1L, so early progression reflects refractory biology, not under-dosing | rationale | R22 | R-miniCHOP | covered |

## The two partial claims (transparent, not red)

- **A7 (allo reserved post-CAR-T):** has a citation (`ALLO-POST-CART`) but no deterministic rule. This is a forward-sequencing plan detail, not an eligibility/sequencing gate the verifier must enforce, so it is intentionally left as citation-grounded without a rule. Add a rule later only if the reasoning agent needs to surface it as a gate.
- **B7 (treat despite equivocal re-biopsy):** fires rule **R21** but that rule has empty `citation_ids` — the basis is clinical-practice consensus (treat on convincing serial imaging + clinical picture), not a single primary paper. This is the one claim resting on practice standard rather than a citable trial; the UI should render it as "clinical-judgment rule, no trial citation," which is honest rather than fabricating a source.

## Result

No claim in either case is fully uncovered (no rule **and** no citation). Every recommendation and every exclusion maps to at least one rule and at least one citation in the committed enum. The two partials above are deliberate and defensible; everything else is fully grounded, so the verifier should return green (or amber "off-guideline, explained" for B1) rather than red on the twin demo.
