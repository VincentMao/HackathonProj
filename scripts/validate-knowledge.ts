/**
 * Validate the knowledge assets before wiring the pipeline to them:
 *  - rules.json parses against RuleTable
 *  - evidence-pack.json parses; citation_id values are unique
 *  - every citation_id referenced by a rule exists in the pack (fail loud)
 *  - every REGIMEN_ATTRS.therapy string used by a rule literal is spelled consistently
 *
 * Run: npm run validate:knowledge
 */
// TODO(pipeline): implement the checks above and exit non-zero on any failure.
export {};
