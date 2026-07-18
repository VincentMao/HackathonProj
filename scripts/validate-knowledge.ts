/**
 * Validate the knowledge assets before wiring the pipeline to them.
 * Run: npm run validate:knowledge
 */
import { loadRuleTable, loadEvidencePack, loadFixture, citationIds } from "../src/lib/data";
import { REGIMEN_ATTRS } from "../src/lib/rules";

const problems: string[] = [];

const rules = loadRuleTable();
const pack = loadEvidencePack();
const ids = citationIds();

// 1. Unique citation_ids in the pack.
const seen = new Set<string>();
for (const e of pack.entries) {
  if (seen.has(e.citation_id)) problems.push(`duplicate citation_id in pack: ${e.citation_id}`);
  seen.add(e.citation_id);
}

// 2. Every citation_id referenced by a rule exists in the pack.
for (const r of rules.rules) {
  for (const c of r.citation_ids) {
    if (!ids.has(c)) problems.push(`rule ${r.rule_id} references missing citation_id: ${c}`);
  }
}

// 3. Therapy-string vocabulary: literals matched by `therapy ==`/`therapy in [...]` must be
//    a known REGIMEN_ATTRS.therapy or a known therapy class.
const knownTherapies = new Set<string>(Object.values(REGIMEN_ATTRS).map((a) => a.therapy));
const knownClasses = new Set<string>(Object.values(REGIMEN_ATTRS).map((a) => a.class));
const literalRe = /therapy(?:\.class)?\s*(?:==|in)\s*\[?\s*'([^']+)'/g;
for (const r of rules.rules) {
  let m: RegExpExecArray | null;
  while ((m = literalRe.exec(r.condition))) {
    const lit = m[1];
    if (!knownTherapies.has(lit) && !knownClasses.has(lit)) {
      problems.push(`rule ${r.rule_id}: therapy literal '${lit}' matches no REGIMEN_ATTRS therapy/class`);
    }
  }
}

// 4. Baked fixtures parse against the contract (loadFixture validates).
for (const caseId of ["SYN-A-0001::SYN-A-ENC-0001", "SYN-B-0001::SYN-B-ENC-0001"]) {
  try {
    if (!loadFixture(caseId)) problems.push(`missing fixture for ${caseId}`);
  } catch (e) {
    problems.push(`fixture ${caseId}: ${(e as Error).message}`);
  }
}

// 5. Every citation_id used in a fixture exists in the pack.
for (const caseId of ["SYN-A-0001::SYN-A-ENC-0001", "SYN-B-0001::SYN-B-ENC-0001"]) {
  const fx = loadFixture(caseId);
  if (!fx) continue;
  const cites = [
    ...fx.verifier.rule_checks.map((c) => c.citation_id),
    ...fx.verifier.groundings.map((g) => g.citation_id),
    ...fx.recommendations.pre.options.flatMap((o) => (o.off_guideline ? [o.off_guideline.citation_id] : [])),
    ...fx.recommendations.post.options.flatMap((o) => (o.off_guideline ? [o.off_guideline.citation_id] : [])),
  ].filter((c): c is string => !!c);
  for (const c of cites) if (!ids.has(c)) problems.push(`fixture ${caseId}: unknown citation_id ${c}`);
}

if (problems.length) {
  console.error(`✗ validate-knowledge: ${problems.length} problem(s):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✓ validate-knowledge: ${rules.rules.length} rules, ${pack.entries.length} evidence entries, fixtures OK.`);
