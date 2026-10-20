---
description: Draft a new LearnLab feature spec in the house format, with stable ids and Given-When-Then acceptance scenarios
argument-hint: "<feature-name> \"<one-line purpose>\""
allowed-tools: Read, Write, Glob, Grep
---

Draft a new feature spec for LearnLab. Arguments: `$ARGUMENTS` (feature name, then a one-line purpose).

This writes a **spec**, not code. The engineer reviews and approves it before any agent implements it (Spec-Is-Truth).

1. Read `specs/app_spec.md`, `docs/business-case.md` and two existing feature specs (for example `specs/enrollment_spec.md` and `specs/quiz-engine_spec.md`) to copy the structure and conventions.
2. Check scope: if the feature is in `app_spec.md` §5 *Out of Scope*, stop and tell the engineer instead of drafting.
3. Pick the next free ids — FR numbers after the highest in `app_spec.md`, AC numbers after AC-10 — and never reuse or renumber existing ids.
4. Write `specs/<feature-name>_spec.md` with these sections, in this order:
   - Header table: Spec ID, Parent, Requirements, Acceptance criteria, Domain rules, Service, Domain files, Sprint
   - 1 Purpose · 2 Actors and permissions (matrix with expected HTTP status per role) · 3 Business rules (ids, source column) · 4 API contract (method, path, role, request, success, errors using codes from `app_spec.md` §8.1) · 5 UI (375 px and 1280 px) · 6 Acceptance criteria (**AC-NN.x** Given / When / Then with concrete values and status codes) · 7 Non-functional · 8 Out of scope · 9 Test traceability (test file → rules and scenarios)
5. List, without applying them, the edits `app_spec.md` would need (new FR rows, Acceptance / Done rows, AC table row, feature-spec table row).
6. Report: the file created, the new ids, open questions and assumptions.

Do not edit `app_spec.md`, other specs or any code.
