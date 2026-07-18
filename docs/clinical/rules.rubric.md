---
title: "Decision Variables Rubric, R/R aggressive B-cell lymphoma"
type: reference
tags: [hackathon, hackathon/build, hackathon/clinical]
created: 2026-07-18
---

# Decision Variables Rubric

The exhaustive list of what has to be weighed in the clinic room to choose treatment and its intensity for relapsed/refractory aggressive B-cell lymphoma (DLBCL, transformed FL). This is the clinical brain behind [[Project Brief - Consilium|Consilium]]: it defines the `VisitSignals` fields the ambient agent should extract, how each variable shifts the plan, and the exclusions/flags the verifier should encode. Fact-checked against 2025-2026 evidence; verify specifics against current NCCN before the demo.

Every variable is tagged **chart** (already documented), **room** (surfaced only in conversation/exam), or **both**. The "room" variables are the product's whole reason to exist.

## The governing stance: explain, don't block

Consilium explains tradeoffs; it never blocks a licensed clinician's choice. When the clinician selects an option outside a guideline or label boundary, the agent must (1) name the exact boundary being crossed and why it exists (the trial population, the label wording, the negative study, or the sequencing hazard), (2) present the best available grounding for the off-guideline choice, including the strength and limits of that evidence, and the concrete tradeoff being accepted, and (3) proceed, recording the rationale. A hard stop is reserved only for choices that are affirmatively unsafe or evidence-contradicted (e.g., tafasitamab-lenalidomide in primary-refractory disease where there is no efficacy evidence and an explicit trial exclusion; bendamustine immediately before planned apheresis; presenting a CRL'd or negative-trial regimen as an approved standard), and even then the agent surfaces a hard flag with rationale rather than silently overriding. The paradigm case is epcoritamab+GemOx in 2L: off-label because only epcoritamab monotherapy is approved (at 3L+), yet a reasonable, evidence-supported (EPCORE NHL-2) choice for a fit, transplant-ineligible elderly patient not pursuing CAR-T, the agent explains 'this is off-label in 2L, here is the NHL-2 basis and the tradeoff,' and lets the clinician proceed, as in CASE B.

## How the two cases calibrate the extremes

Consilium's decision model has two stages. Stage 1: from the chart the agent forms a pre-visit differential of viable regimens for R/R aggressive B-cell lymphoma (DLBCL, transformed FL), ranked by the structured, largely objective variables that are already documented (biology, extent, refractoriness pattern, prior lines, organ function, labeled eligibility). Stage 2: the ambient clinic conversation surfaces "read-the-room" signals that the chart cannot hold, goals of care, risk tolerance, caregiver reliability, real functional narrative, distance and site-of-care logistics, falls/cognition, and these RE-RANK the options, sometimes decisively (e.g., steering a fit 86-year-old away from a technically feasible CAR-T toward an off-the-shelf bispecific delivered under a shared-care model). The rubric therefore tags every variable as CHART-derived, CONVERSATION-surfaced, or BOTH, and states how each shifts choice-of-regimen and intensity. The governing product stance is explain-not-block: when the clinician selects an off-guideline option (e.g., epcoritamab+GemOx in 2L, which is off-label), the agent must name the exact guideline boundary being crossed, ground the tradeoff in evidence, and let the clinician proceed, it must never hard-stop a licensed physician's judgment. The two anchor cases calibrate the extremes: CASE A (fit ~66M, primary-refractory tFL, double-hit-LIKE, secondary CNS disease → maximal curative intent: CNS-directed R-DHAP + IT therapy + bridge + liso-cel, ~4-yr CR) and CASE B (robust 86F, primary-refractory GCB DLBCL, distant → deliberately-not-under-treated with epcoritamab+GemOx, ramp-up at center then hand-back).

## The 11 domains

### Disease biology & extent

| Variable | Source | How it shifts the decision |
|---|---|---|
| Tumor bulk | both | Bulky disease argues against under-treating and against the 'gentler' fork; it favors an active regimen and raises CRS risk with T-cell engagers (front-load monitoring). Chart holds imaging bulk; conversation can surface rapid clinical growth or B-symptoms not yet imaged. |
| LDH | chart | Elevated LDH marks tumor burden/proliferation, worsens prognosis, and predicts higher CRS severity with bispecifics/CAR-T; pushes toward closer ramp-up monitoring and away from watchful lower-intensity paths. |
| Ann Arbor stage | chart | Advanced stage (III/IV) confirms systemic disease requiring systemic therapy and raises baseline risk; interacts with bulk and extranodal sites. |
| Cell-of-origin (GCB vs ABC/non-GCB) | chart | Informs biology but must NOT be used to downgrade risk when disease is primary-refractory, primary-refractoriness dominates. GCB is not 'low-risk' here. |
| MYC status, rearrangement vs amplification | chart | True 'double-hit' (HGBCL with MYC and BCL2 rearrangements) requires a MYC TRANSLOCATION by break-apart FISH. MYC amplification (copy-number gain) is 'double-hit-LIKE,' with less-established prognostic weight. Distinguish before labeling; both push toward intensified, CNS-inclusive management but the certainty differs. |
| BCL2 / BCL6 rearrangement | chart | Co-occurring MYC+BCL2 rearrangement defines true double-hit → intensified frontline (DA-EPOCH-R) with CNS prophylaxis rather than R-CHOP; drives CNS-relapse vigilance. |
| TP53 mutation/deletion | chart | Chemoresistance marker; lowers expected benefit of intensive salvage chemo and strengthens the case for T-cell-directed therapy (CAR-T/bispecific). |
| Double-expressor phenotype (MYC+BCL2 by IHC) | chart | Adverse but distinct from double-hit; do not conflate with rearrangement. Adds to overall aggressive-biology weighting. |
| Transformation history (transformed FL) | chart | t(14;18)/IGH-BCL2 founding lesion plus acquired MYC yields a chemoresistant, CNS-relapse-prone phenotype justifying intensified, CNS-inclusive curative intent. |
| Diagnostic/histologic certainty at relapse | both | Preserve real-world uncertainty: an equivocal re-biopsy does not veto treatment when clinical + serial-PET gestalt is convincing. Conversation surfaces the clinician's confidence level; the agent should not demand histologic confirmation to proceed. |

### Refractoriness pattern & relapse timing

| Variable | Source | How it shifts the decision |
|---|---|---|
| Primary-refractory status | both | The single most consequential switch: a fit primary-refractory patient belongs on 2L CAR-T (axi-cel or liso-cel), full stop. It also EXCLUDES tafasitamab-lenalidomide (L-MIND excluded primary-refractory) and excludes ASCT (needs chemosensitivity). Chart holds end-of-treatment PET; conversation can confirm the clinician's interpretation when biopsy is equivocal. |
| Relapse timing (<=12 months vs >12 months) | chart | Early treatment failure (primary-refractory or relapse within 12 months) is the ZUMA-7/TRANSFORM population → 2L CAR-T over salvage-chemo/ASCT. Late relapse re-opens chemosensitive salvage/ASCT consideration. |
| Chemosensitivity | both | Chemorefractory disease removes ASCT from the differential (transplant requires a chemosensitive response) and lowers expected benefit of intensive platinum salvage as a destination therapy. |
| Number/pattern of prior failures | chart | Distinguishes 2L from 3L+ decision spaces and thereby which regimens are on-label (see line-number variable). |

### CNS involvement

| Variable | Source | How it shifts the decision |
|---|---|---|
| Compartment, parenchymal vs leptomeningeal/CSF | chart | Parenchymal/bulky CNS disease (e.g., posterior fossa) needs CNS-penetrant SYSTEMIC therapy; intrathecal drug reaches only a few millimeters from the CSF surface and cannot treat parenchymal disease. Leptomeningeal disease is where IT therapy adds value as an adjunct. |
| CSF flow cytometry / cytology | chart | Positive monoclonal B-cells confirm leptomeningeal involvement and trigger CNS-directed rerouting away from the R-CHOP backbone (its components do not achieve cytotoxic CSF/parenchymal levels). |
| New neurologic symptoms | both | Back pain, lower-extremity weakness, urinary difficulty are often surfaced in the room/exam before imaging and should prompt CNS staging and rerouting. |
| CNS-penetrant systemic drug selection | chart | Effective agents are HD-methotrexate (>=3 g/m2), high-dose cytarabine, thiotepa. R-DHAP (ara-C + dexamethasone) is more CNS-active than R-ICE (poor penetration); MATRix/MARIETTA-type HD-MTX/thiotepa backbones are the canonical choice for parenchymal SCNSL, making R-DHAP+IT a defensible-not-canonical route worth flagging. |
| CAR-T product choice with active CNS disease | chart | Favor liso-cel/tisa-cel over axi-cel for lower ICANS given baseline CNS disease; note that support is registry/real-world plus TRANSCEND (which uniquely permitted secondary CNS lymphoma), not routine on-label indication. |

### Prior therapy, antigen exposure & sequencing hazards

| Variable | Source | How it shifts the decision |
|---|---|---|
| Line number / prior lines of therapy | chart | Gates label eligibility: epcoritamab monotherapy and glofitamab monotherapy are 3L+; tafa-len and 2L CAR-T are 2L constructs. A 2L decision cannot borrow a 3L+ monotherapy label without flagging it as off-guideline. |
| Prior anti-CD19 / anti-CD20 exposure | chart | Prior CD19 (tafasitamab, CAR-T) or CD20 exposure raises antigen-escape concern for subsequent CD19/CD20-directed therapy and influences target selection and sequencing. |
| Bendamustine exposure or planned bendamustine (pola-BR) | both | Bendamustine is profoundly T-cell-depleting: giving pola-BR (or any bendamustine regimen) before apheresis/CAR-T/bispecific impairs T-cell fitness, apheresis yield, manufacturing, and downstream efficacy. Do not burn it ahead of planned T-cell-engaging therapy. Conversation may reveal an outside plan to give it. |
| Polatuzumab/vincristine cumulative neuropathy | both | Polatuzumab's MMAE payload causes peripheral neuropathy that compounds prior vincristine; pre-existing grade 2+ neuropathy argues against pola-containing regimens. Symptom severity is often better captured in the room than the chart. |
| Cumulative anthracycline dose | chart | Limits re-treatment with anthracyclines and factors into cardiac tolerability of intensive salvage. |
| Recent heavy chemo / steroids near apheresis | chart | Can compromise CAR-T product quality; affects timing of apheresis and choice of bridging. |

### Organ function & comorbidity

| Variable | Source | How it shifts the decision |
|---|---|---|
| Renal function | chart | Gates HD-MTX (needs adequate clearance, leucovorin rescue, urine alkalinization/hydration; glucarpidase for delayed clearance). Poor renal function reroutes CNS-directed therapy. |
| Third-spacing (ascites/effusions) | chart | Prolongs HD-MTX clearance and raises toxicity, a contraindication/precaution for HD-MTX-based CNS therapy. |
| Interacting concomitant drugs (NSAIDs, PPIs, penicillins) | chart | Delay HD-MTX clearance; must be reconciled before HD-MTX. Autoimmune patients on NSAIDs are a specific hazard. |
| Cardiac function | chart | Constrains anthracycline re-exposure and weighs into CAR-T/CRS hemodynamic tolerability. |
| Specific high-stakes comorbidity (e.g., cerebral aneurysm) | chart | Feeds the CAR-T/bispecific neurotoxicity-risk composite; a vascular CNS lesion raises the stakes of ICANS and contributes to judging CAR-T unsuitable. |
| Anticoagulation | chart | Bleeding risk around procedures (LP/apheresis/IT therapy) and with thrombocytopenia; modifies deliverability. |
| Autoimmune disease / baseline immunosuppression | chart | Alters infection risk, may complicate T-cell-engaging therapy and HD-MTX; drug-interaction and immunosuppression review needed. |
| Prior/second malignancy | chart | Affects prognosis, marrow reserve, and regimen selection but is rarely prohibitive on its own. |
| Baseline cytopenias / marrow reserve | chart | Informs tolerability of myelosuppressive salvage and lymphodepletion; mild cytopenias are not prohibitive. |
| Endocrine/metabolic (thyroid, obesity, OSA, on GLP-1/GIP) | chart | Modifies perioperative/anesthesia and tolerability considerations; generally supportive-care rather than choice-of-regimen drivers. |

### Geriatric fitness beyond ECOG

| Variable | Source | How it shifts the decision |
|---|---|---|
| ADL / IADL function | both | IADL deficits reclassify patients who look fit by PS toward attenuated therapy; intact IADLs support full-intensity treatment. Often surfaced by narrative in the room. |
| Gait speed / Timed-Up-and-Go / falls history | both | Falls and slow gait predict toxicity/mortality independent of age and argue for dose attenuation; no falls supports active therapy. |
| Cognition (Mini-Cog / MoCA) | both | Impaired cognition threatens informed consent and safe CRS/ICANS self-monitoring, a real barrier to CAR-T/bispecific ramp-up; usually detected in conversation, not the chart. |
| Polypharmacy | both | High pill burden predicts toxicity and drug interactions; prompts medication reconciliation before HD-MTX or T-cell-engaging therapy. |
| Nutrition / unintentional weight loss | both | Malnutrition predicts poor tolerance; may trigger prehabilitation or attenuation. |
| Mood / psychological status | room | Depression/anxiety affect adherence and the ability to sustain a demanding cellular-therapy course; surfaced only in the room. |
| Comorbidity indices (CIRS-G / Charlson) | chart | Quantify burden feeding the FIL sGA classification. |
| FIL simplified Geriatric Assessment (fit/unfit/frail) | both | Integrates age + ADL + IADL + CIRS-G to classify older DLBCL patients; FIT → curative-intent full-dose therapy, FRAIL → attenuation (e.g., R-miniCHOP for >=80). Frailty, not chronologic age, predicts survival/tolerability. |

### Performance status

| Variable | Source | How it shifts the decision |
|---|---|---|
| ECOG performance status | chart | Necessary but not sufficient: a single global axis systematically under-detects vulnerability (a patient can be ECOG 0-1 with IADL deficits, falls, cognitive impairment, polypharmacy). Use as a floor, then require geriatric-domain corroboration before calling a patient fit. |

### Patient goals, values & risk tolerance

| Variable | Source | How it shifts the decision |
|---|---|---|
| Treatment intent (curative vs disease-control vs palliative) | room | The top-level fork: curative intent supports maximal multimodal therapy and cellular therapy; disease-control intent favors gentler, outpatient-friendly regimens; palliative intent reframes toward symptom control. |
| Risk tolerance for toxicity | room | Willingness to accept CRS/ICANS, cytopenias, and hospitalization re-ranks CAR-T/bispecific vs chemo-light options. |
| Willingness for prolonged hospitalization / intensive monitoring | room | Low willingness disfavors CAR-T and center-bound ramp-up; favors off-the-shelf, community-deliverable regimens. |
| Gentler-vs-active preference at an explicit fork | room | When two evidence-supported paths exist, patient preference is the tie-breaker, but must be balanced against the risk of under-treating a fit patient with aggressive disease. |

### Caregiver & social support

| Variable | Source | How it shifts the decision |
|---|---|---|
| Caregiver availability & reliability | both | A robust caregiver who can recognize and promptly report CRS/ICANS is a hard requirement for CAR-T and for bispecific ramp-up. Absent/unreliable support disqualifies center-intensive paths regardless of disease fit. |
| Caregiver ability to return promptly to the center | room | Concretely determines whether the CRS/ICANS window can be monitored; interacts with distance. |
| Home environment / living situation | room | Stable, supervised home supports outpatient bispecific delivery and CAR-T aftercare; instability pushes toward inpatient or lower-intensity plans. |

### Logistics, access, distance & site of care

| Variable                                                        | Source | How it shifts the decision                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Distance to a certified cellular-therapy center                 | both   | Long distance disfavors CAR-T (which requires apheresis, weeks of lead time, and sustained proximity for the CRS/ICANS window) and favors an off-the-shelf bispecific. Partly in the chart (address), confirmed in the room.                                             |
| Shared-care feasibility (ramp-up at center, hand-back to local) | both   | Bispecific CRS/ICANS risk is front-loaded to cycle-1 ramp-up; that phase is done at the academic center and later cycles handed back to the community, enabling treatment of distant patients. The verifier must not imply the community handles the highest-risk doses. |
| Community oncologist relationship / referral pattern            | chart  | A capable local oncologist makes shared-care viable; its absence keeps care center-bound.                                                                                                                                                                                |
| Financial / insurance / access barriers                         | room   | Coverage and out-of-pocket cost can render an otherwise-preferred regimen undeliverable; surfaced in the room.                                                                                                                                                           |
| Ability to relocate/stay near center for the monitoring window  | both   | Lodging and time-away feasibility directly gate CAR-T and center-intensive bispecific ramp-up.                                                                                                                                                                           |

### Cellular-therapy & transplant eligibility

| Variable                                          | Source | How it shifts the decision                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAR-T fitness composite (NOT age)                 | both   | Eligibility is a composite of physiologic fitness + organ function + performance status + comorbidity + logistics + caregiver, never a numeric age cutoff. A robust older patient can be a candidate; the same patient can be excluded by distance/caregiver/comorbidity, not by age.          |
| CAR-T product selection (axi-cel vs liso-cel)     | chart  | Liso-cel carries lower grade >=3 CRS/ICANS and is preferred for older/comorbid patients and for baseline CNS disease; axi-cel (ZUMA-7) carries the 2L OS signal. Tisa-cel is NOT a 2L option (BELINDA negative).                                                                               |
| Apheresis feasibility & T-cell fitness            | chart  | Adequate T-cell collection is a prerequisite; recent bendamustine/heavy chemo/steroids compromise it and must be avoided pre-apheresis.                                                                                                                                                        |
| Bridging need & agent choice                      | both   | Disease pace during the manufacturing window dictates bridging; the bridge must control disease while preserving T-cell fitness and avoiding lymphodepleting agents. Copanlisib is no longer a valid option (US market withdrawal Nov 2023; weak CNS penetration).                             |
| ASCT eligibility (requires chemosensitivity)      | chart  | Primary-refractory/chemorefractory disease removes ASCT from the differential; 2L CAR-T is superior in that population.                                                                                                                                                                        |
| Allogeneic transplant as reserved salvage         | chart  | Reasonably reserved for post-CAR-T relapse rather than used upfront.                                                                                                                                                                                                                           |
| Transplant-ineligibility as a positive indication | chart  | Being ASCT-ineligible is itself the INDICATION that opens tafa-len (in R/R non-primary-refractory), liso-cel PILOT (2L regardless of timing), and mosun-pola (SUNMO). Do not conflate transplant-ineligibility with primary-refractoriness, they route to opposite conclusions about tafa-len. |

## Guideline nuances (get these right on stage)

- Tafasitamab-lenalidomide (L-MIND) is NCCN-preferred 2L ONLY for ASCT-INELIGIBLE R/R DLBCL and is NOT appropriate in primary-refractory disease, L-MIND excluded primary-refractory patients (protocol: no response to, or progression/relapse within ~6 months of, frontline; originally 3 mo, amended to 6). The exclusion in CASE B is because the disease is primary-refractory, NOT because of age and NOT because she is transplant-ineligible (transplant-ineligibility alone is actually an indication). L-MIND efficacy in its intended population: ORR ~60%, CR ~43%, median DoR ~21.7 mo (5-yr final data).
- 2L CAR-T for early treatment failure (primary-refractory or relapse <=12 mo, cell-therapy-fit): axi-cel (ZUMA-7; positive EFS AND statistically significant OS) and liso-cel (TRANSFORM; positive EFS) beat salvage chemo + ASCT. This is the correct home for the fit primary-refractory patient, full stop.
- Tisagenlecleucel is NOT a 2L option, BELINDA was negative for EFS. Never lump all three CAR-T products together for 2L; only axi-cel and liso-cel have positive 2L data.
- Liso-cel has TWO 2L indications: early-relapse (TRANSFORM) and transplant-ineligible regardless of relapse timing (PILOT, single-arm). Liso-cel/tisa-cel carry lower CRS/ICANS than axi-cel, the usual choice for older/comorbid patients and for baseline CNS disease; TRANSCEND uniquely permitted secondary CNS lymphoma.
- Mosunetuzumab + polatuzumab vedotin (mosun-pola) is now backed by positive phase 3 SUNMO (June 2025) in ASCT-ineligible R/R LBCL: median PFS 11.5 vs 3.8 mo, HR 0.41 (95% CI 0.28-0.61), p<0.0001; CRS ~16-17%, mostly low grade; chemo-light, outpatient-friendly. A legitimate 'gentler' 2L option for transplant-ineligible patients, but it can under-treat a phenotypically fit patient with bulky, primary-refractory disease.
- Epcoritamab is FDA-approved as MONOTHERAPY for R/R DLBCL after >=2 prior lines (3L+). Epcoritamab + GemOx (EPCORE NHL-2, phase 1/2, high complete metabolic response in transplant-ineligible R/R DLBCL) is therefore an OFF-LABEL / off-strict-guideline combination in 2L, not a guideline-endorsed 2L regimen. It is a defensible off-guideline choice for a robust, fit, elderly, transplant-ineligible patient wanting a highly active chemoimmunotherapy combo and not pursuing CAR-T. Name it EPCORE NHL-2, never 'EPCORE DLBCL-2.'
- Phase 3 EPCORE DLBCL-1 (epcoritamab monotherapy vs investigator-choice chemo) reported topline Jan 2026: improved PFS, CR, DoR, time-to-next-treatment, but OS did NOT reach statistical significance. In March 2026 FDA removed the 24-hour hospitalization requirement after the first 48 mg dose.
- Glofitamab + GemOx (STARGLO, phase 3 vs R-GemOx) received an FDA COMPLETE RESPONSE LETTER on July 18, 2025 (enrollment heavily Asia-weighted, applicability concerns), it is NOT an available US 2L option. Glofitamab RETAINS US accelerated approval as MONOTHERAPY for R/R DLBCL/LBCL after >=2 lines (3L+). The glofit-GemOx combo is approved in 35+ countries ex-US after 1 prior line, but not in the US.
- Pola-BR (polatuzumab-bendamustine-rituximab, GO29365) is approved 3L+ for transplant-ineligible R/R DLBCL. Two sequencing hazards: (1) bendamustine is profoundly T-cell-depleting, do NOT give before planned apheresis/CAR-T/bispecific (impairs T-cell fitness, apheresis yield, manufacturing, efficacy); (2) polatuzumab MMAE neuropathy overlaps and compounds prior vincristine.
- R-miniCHOP is a validated, evidence-based age-attenuated frontline regimen for patients >=80, appropriate under-dosing by design, not an error. Progression shortly after it reflects refractory biology, not inadequate dosing.
- For parenchymal (plus leptomeningeal) secondary CNS disease, a systemic HD-MTX- or thiotepa-based backbone (MATRix/MARIETTA-type) is the canonical choice; R-DHAP (ara-C-containing) + IT therapy is CNS-active and defensible but not canonical, and IT therapy cannot reach parenchymal disease. IT rituximab is off-label/investigational.
- Copanlisib was voluntarily withdrawn from the US market (Nov 2023, confirmatory PFS failure) and has limited/uncertain CNS penetration, not a current standard bridging option.
- MYC amplification is NOT MYC rearrangement. True double-hit (HGBCL with MYC and BCL2 rearrangements) requires a MYC TRANSLOCATION by break-apart FISH; MYC amplification + IGH/BCL2 is 'double-hit-LIKE' with less-established prognostic weight.

## `VisitSignals` fields the ambient agent should extract

These are the concrete conversation-surfaced fields to add to the ambient-signal contract. Each should carry a verbatim `evidence_span`.

```
treatment_intent: enum {curative, disease_control, palliative}, patient/clinician-stated goal that sets the top-level fork
risk_tolerance: enum {high, moderate, low}, willingness to accept CRS/ICANS, cytopenias, hospitalization
gentler_vs_active_preference: enum {prefers_gentler, prefers_active, undecided}, stance at an explicit two-path fork
willingness_prolonged_hospitalization: bool, tolerance for center-bound monitoring windows
functional_narrative: free_text, real-world function (e.g., 'still gardening', 'stopped driving') beyond ECOG
adl_iadl_deficits: list<enum>, specific ADL/IADL impairments surfaced in conversation
falls_history_12mo: bool + count, falls not usually in the chart
cognition_flag: enum {none, mild_concern, impaired}, clinician/family-observed cognitive concern affecting consent and CRS self-report
polypharmacy_count: int + high_risk_interactions: list, medication burden and HD-MTX-interacting agents (NSAIDs/PPIs/penicillins)
mood_psych_flag: enum {none, anxiety, depression}, affects adherence to demanding courses
caregiver_available: bool
caregiver_reliability: enum {robust, limited, none}, ability to recognize/report CRS/ICANS and return promptly
caregiver_can_return_promptly: bool, feasibility of the CRS/ICANS monitoring window given travel
home_environment_stability: enum {stable_supervised, stable_alone, unstable}
distance_to_center_minutes: int, travel time to the certified cellular-therapy center
can_stay_near_center: bool, lodging/time-away feasibility for CAR-T and ramp-up
shared_care_feasible: bool + local_oncologist_identified: bool, viability of ramp-up-then-hand-back model
financial_access_barrier: enum {none, moderate, prohibitive}
transportation_access: enum {reliable, limited, none}
new_neuro_symptoms: list<free_text>, back pain, limb weakness, urinary/bowel change reported in room before imaging
neuropathy_severity_reported: enum {none, grade1, grade2plus}, patient-reported, gates pola/vincristine
clinician_relapse_confidence: enum {biopsy_confirmed, imaging_clinical_gestalt, uncertain}, preserves diagnostic-certainty nuance when re-biopsy is equivocal
prior_therapy_tolerance_narrative: free_text, how the patient handled prior lines
outside_treatment_plan_mentioned: free_text, e.g., a referring plan for bendamustine that would be a sequencing hazard
```

## Verifier rules (exclusions and flags to encode)

The safety/verification agent reads these as a local rule table. `explain, don't block` applies: off-guideline choices get a required-explanation flag, not a hard stop; only affirmatively unsafe/evidence-contradicted choices get a hard flag.

- IF disease is primary-refractory THEN EXCLUDE tafasitamab-lenalidomide and hard-flag if selected (L-MIND excluded primary-refractory; no efficacy evidence). State the reason is primary-refractoriness, not age and not transplant-ineligibility.
- IF (primary-refractory OR relapse <=12 months) AND cell-therapy-fit THEN surface 2L CAR-T (axi-cel or liso-cel) as the preferred option, and EXCLUDE ASCT as a destination (requires chemosensitivity).
- NEVER present tisagenlecleucel as a 2L option (BELINDA negative for EFS). Only axi-cel and liso-cel have positive 2L data.
- NEVER present glofitamab + GemOx (STARGLO) as an approved/available US 2L regimen (FDA CRL July 18, 2025). Glofitamab is US-approved only as monotherapy at 3L+.
- FLAG epcoritamab + GemOx and glofitamab + GemOx as OFF-LABEL in 2L; require the explain-tradeoff workflow (name the boundary, cite EPCORE NHL-2 for epcor+GemOx / STARGLO CRL for glofit+GemOx) before allowing selection. Only epcoritamab monotherapy (3L+) and glofitamab monotherapy (3L+) are on-label.
- IF a planned/recent bendamustine-containing regimen (e.g., pola-BR) precedes planned apheresis/CAR-T/bispecific THEN hard-flag the sequencing hazard (T-cell depletion compromises collection, manufacturing, efficacy).
- FLAG cumulative MMAE (polatuzumab) + prior vincristine neuropathy overlap when a pola-containing regimen is proposed with reported grade 2+ neuropathy.
- DO NOT encode any numeric age cutoff for CAR-T. Require a composite eligibility check (fitness + organ function + PS + comorbidity + logistics + caregiver). Represent 'too old for CAR-T' only as the failing composite, never as an age rule.
- IF a geriatric-assessment domain is missing for a patient broadly >=65-70 THEN flag ECOG-alone as insufficient and request GA fields (ADL/IADL, falls, cognition, polypharmacy, comorbidity index / FIL sGA).
- IF MYC is reported positive THEN require the FISH method (break-apart translocation vs amplification/copy-number) before labeling 'double-hit'; block auto-upgrade of 'double-hit-like' (amplification) to true double-hit.
- IF secondary CNS involvement with a parenchymal component THEN require a CNS-penetrant systemic backbone (HD-MTX >=3 g/m2, high-dose cytarabine, or thiotepa) and flag intrathecal-only or R-ICE-type regimens as insufficient for parenchymal disease.
- IF CNS disease AND CAR-T is chosen THEN prefer liso-cel/tisa-cel (lower ICANS) and note the basis is TRANSCEND/registry data, not a routine on-label CNS indication.
- FLAG copanlisib as unavailable (US market withdrawal Nov 2023) and a weak CNS-penetration bridge; do not offer it as current standard bridging.
- IF HD-MTX is planned THEN require checks for adequate renal function, absence of third-spacing (ascites/effusions), and reconciliation of clearance-delaying drugs (NSAIDs/PPIs/penicillins); flag missing leucovorin-rescue/hydration/alkalinization plan.
- IF a bispecific is selected for a distant patient THEN require that cycle-1 ramp-up be assigned to the academic center and hand-back only AFTER the ramp-up window; flag any plan that assigns the highest-risk ramp-up doses to the community.
- IF CAR-T or bispecific ramp-up is proposed THEN require caregiver_reliability = robust and a viable monitoring-window plan (proximity/lodging/prompt-return); flag if absent.
- DO NOT down-rank an active regimen solely because biology is GCB / not double-hit when disease is primary-refractory, primary-refractoriness is the dominant adverse driver; flag under-treatment of a phenotypically fit patient.
- PRESERVE diagnostic uncertainty: do NOT require histologic confirmation to proceed when clinician_relapse_confidence = imaging_clinical_gestalt; treat an equivocal/necrotic re-biopsy as non-vetoing.
- ENFORCE correct trial nomenclature: epcoritamab+GemOx = EPCORE NHL-2 (never 'EPCORE DLBCL-2'); EPCORE DLBCL-1 is the separate epcoritamab-monotherapy phase 3.

---
Back to [[Abridge x Anthropic Hackathon]] · cases in [[Synthetic Cases/README|Synthetic Cases]]
