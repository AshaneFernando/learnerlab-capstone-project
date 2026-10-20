---
description: Report every LearnLab acceptance criterion (AC-NN) and scenario, and the tests tagged with it
argument-hint: "[AC-NN | --deep]"
allowed-tools: Bash(python scripts/ac_audit.py:*), Bash(python -I scripts/ac_audit.py:*), Read, Grep, Glob
---

Produce an acceptance-criteria coverage report for LearnLab.

1. Run the audit script:
   - If `$ARGUMENTS` contains `--deep`: `python scripts/ac_audit.py --deep` (adds the Claude Agent SDK semantic review; costs API tokens).
   - Otherwise: `python scripts/ac_audit.py`.
2. Read `specs/reviews/ac-audit.md`.
3. If `$ARGUMENTS` names one AC (for example `AC-05`), show only that AC's rows: its scenarios from the feature spec, the tagged test files, and for each scenario whether a test references it.
4. Summarise for the engineer:
   - ACs with a tagged test: N / 10
   - Scenarios referenced by a test: N / total
   - Every AC or scenario with **no** test, grouped by feature spec, with the test file the spec's *Test traceability* table says it belongs in
   - For `--deep`: every scenario judged `partial` or `missing_assertion`
5. Do not write or change any test, spec or code. If coverage is missing, recommend the next red test to write (file, test name, `@pytest.mark.ac("AC-NN")` tag) using the `spec-to-test-generator` skill.
