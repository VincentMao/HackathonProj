/**
 * Deterministic FHIR -> ChartExtract normalizer (NO LLM).
 *
 * The case JSON is already structured, so this is a pure flatten that also yields
 * stable chart.* provenance refs. It MUST read `patient_context.longitudinal_summary`
 * (incl. condition_labels) as well as `encounter_fhir.related_resources` — e.g. Case B's
 * cerebral aneurysm lives only in condition_labels, and the CAR-T exclusion must be
 * reconstructable as a composite from it rather than from age.
 */
import type { ChartExtract } from "./rules";

// Shape of the raw case file (data/cases/*.json), conforms to
// data/knowledge/schema/encounter-schema.json.
export interface RawCase {
  id: string;
  metadata: Record<string, unknown>;
  patient_context: Record<string, unknown>;
  encounter_fhir: Record<string, unknown>;
  transcript: string;
  note: string; // NEVER passed to the reasoner — validation target only
  after_visit_summary: string; // NEVER passed to the reasoner
  after_visit_summary_provenance: Record<string, unknown>;
}

// TODO(pipeline): map RawCase -> ChartExtract deterministically; attach chart.* refs.
export function extractChart(_raw: RawCase): ChartExtract {
  throw new Error("extractChart() not yet implemented — see docs/design/build-plan.md");
}
