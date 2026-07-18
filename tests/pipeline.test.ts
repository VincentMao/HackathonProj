import { describe, it, expect } from "vitest";
import { PipelineResult } from "../src/lib/contracts";
import { evaluateCondition } from "../src/lib/condition";
import { extractChart, chartSummary, type RawCase } from "../src/lib/chart";
import { loadCase, loadFixture, loadRuleTable } from "../src/lib/data";
import { runRuleChecks, baseContext, withCandidate } from "../src/lib/rules";

const CASE_A = "SYN-A-0001::SYN-A-ENC-0001";
const CASE_B = "SYN-B-0001::SYN-B-ENC-0001";

describe("contracts / fixtures", () => {
  it("both baked fixtures validate against PipelineResult", () => {
    for (const id of [CASE_A, CASE_B]) {
      const fx = loadFixture(id);
      expect(fx, `fixture ${id}`).not.toBeNull();
      expect(() => PipelineResult.parse(fx)).not.toThrow();
    }
  });

  it("Case B fixture: EPCOR_GEMOX is rank-1 and off_guideline with a citation", () => {
    const fx = loadFixture(CASE_B)!;
    const top = fx.recommendations.options.find((o) => o.rank === 1);
    expect(top?.regimen).toBe("EPCOR_GEMOX");
    expect(top?.status).toBe("off_guideline");
    expect(top?.off_guideline?.citation_id).toBe("EPCORE-NHL-2");
    // Verifier flags the off-label boundary on that plan.
    const v = fx.verifier.plans.find((p) => p.regimen === "EPCOR_GEMOX");
    expect(v?.verdict).toBe("off_guideline_explained");
    expect(v?.flags.length).toBeGreaterThan(0);
  });

  it("Case A fixture: CNS-directed salvage is the top plan, driven by the room", () => {
    const fx = loadFixture(CASE_A)!;
    const top = fx.recommendations.options.find((o) => o.rank === 1);
    expect(top?.regimen).toBe("CNS_SALVAGE_MATRIX");
    expect(top?.rationale.some((r) => r.ref === "visit.new_neuro_symptoms")).toBe(true);
    // Every included plan has a verification entry.
    const included = fx.recommendations.options.filter((o) => o.status !== "excluded");
    expect(fx.verifier.plans.length).toBe(included.length);
  });
});

describe("condition evaluator", () => {
  const ctx = {
    line: 2,
    "refractoriness.primary_refractory": true,
    "disease.cns_compartment": ["leptomeningeal", "parenchymal"],
    "visit.neuropathy_severity_reported": "grade2plus",
    therapy: "epcoritamab+GemOx",
    "therapy.class": "bispecific",
  };
  it("handles ==, &&, ||, contains, in, and ordered enums", () => {
    expect(evaluateCondition("line == 2 && refractoriness.primary_refractory == true", ctx)).toBe(true);
    expect(evaluateCondition("disease.cns_compartment contains 'parenchymal'", ctx)).toBe(true);
    expect(evaluateCondition("disease.cns_compartment contains 'csf_positive'", ctx)).toBe(false);
    expect(evaluateCondition("therapy in ['epcoritamab+GemOx','glofitamab+GemOx']", ctx)).toBe(true);
    expect(evaluateCondition("visit.neuropathy_severity_reported >= 'grade2'", ctx)).toBe(true);
    expect(evaluateCondition("therapy.class in ['CD19-CAR-T','bispecific']", ctx)).toBe(true);
  });
});

describe("chart normalizer", () => {
  it("Case A: primary-refractory, CNS-involved, MYC amplification", () => {
    const chart = extractChart(loadCase(CASE_A) as RawCase);
    expect(chart.refractoriness.primary_refractory).toBe(true);
    expect(chart.disease.cns_involvement).toBe(true);
    expect(chart.disease.molecular.myc_method).toBe("amplification");
    expect(chart.fitness.age).toBe(62);
  });

  it("Case B: GCB, age 86, transplant-ineligible", () => {
    const chart = extractChart(loadCase(CASE_B) as RawCase);
    expect(chart.disease.cell_of_origin).toBe("GCB");
    expect(chart.fitness.age).toBe(86);
    expect(chart.transplant_intent).toBe("ineligible");
  });

  it("the reasoner's chart summary never leaks the gold note or AVS", () => {
    const raw = loadCase(CASE_A) as RawCase;
    const summary = chartSummary(extractChart(raw));
    expect(summary).not.toContain("Assessment:");
    expect(summary).not.toContain(raw.after_visit_summary.slice(0, 40));
  });
});

describe("deterministic rule checks", () => {
  it("Case B fires R01 (tafa-len excluded) when tafa-len is a candidate", () => {
    const chart = extractChart(loadCase(CASE_B) as RawCase);
    const checks = runRuleChecks(loadRuleTable(), chart, null, ["TAFA_LEN", "EPCOR_GEMOX"]);
    const r01 = checks.find((c) => c.rule_id === "R01");
    expect(r01).toBeTruthy();
    expect(r01?.citation_id).toBe("L-MIND");
  });

  it("withCandidate exposes therapy facets for candidate-scoped rules", () => {
    const chart = extractChart(loadCase(CASE_B) as RawCase);
    const ctx = withCandidate(baseContext(chart, null), "EPCOR_GEMOX");
    expect(ctx["therapy.is_bispecific"]).toBe(true);
    expect(ctx["therapy"]).toBe("epcoritamab+GemOx");
  });
});
