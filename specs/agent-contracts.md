# Agent Contracts

| Field | Value |
|---|---|
| Spec ID | AGENTS |
| Prompt | Prompt 06 — Define Agent Contracts |
| Parent | [app_spec.md](app_spec.md) · [CLAUDE.md](../CLAUDE.md) |
| Related | [docs/architecture.md](../docs/architecture.md) · [docs/test-strategy.md](../docs/test-strategy.md) |
| Harness source | `cwijayasundara/claude_harness_eng_v5` → `.claude/agents/*.md` (read 2026-10-20) |
| Status | Draft — project agent files are created in Prompt 10 |

LearnLab has **no runtime AI agents**. These contracts govern the agents that **build** the repository: the Claude Harness Engine agents and the three LearnLab project agents. Every agent also obeys root `CLAUDE.md`, the folder `CLAUDE.md` files, and the global rules in §1.

---

## 1. Rules for every agent

### 1.1 Forbidden actions

| # | Forbidden action | Enforced by |
|---|---|---|
| F-01 | Commit or push to `main`; merge without `--no-ff` | GitLab protected branch on `main` · harness `git-safety` / `pre-bash-gate` hook · human review of the MR |
| F-02 | Edit, rename or delete an existing migration in `backend/migrations/versions/` | hook `attempt-immutability-check` · CI job `migrations-append-only` (NFR-05.1) |
| F-03 | Add update or delete methods to append-only repositories: `EnrollmentRepository`, `CompletionRepository`, `AttemptRepository`, `ProgressSnapshotRepository`, `CourseStateChangeRepository` | hook `attempt-immutability-check` · `tests/architecture/test_append_only_repos.py` (NFR-02.1) |
| F-04 | Use `float`, true division `/` or `round()` in `QuizGrader` or `ProgressCalculator`; compute percentages in SQL; type a percentage field as anything but `int` | `tests/architecture/test_no_float_math.py` (ARCH-06, NFR-01.1) · `quiz-grader-agent` review |
| F-05 | Change a spec, AC or golden case to make a failing test pass | Spec-Is-Truth rule · `specs/` changes require engineer approval in MR review · CODEOWNERS on `specs/` |
| F-06 | Skip, delete, `xfail` or weaken a failing test; lower a coverage threshold | CI job `test-backend` (`--cov-fail-under`, NFR-11.1) · `code-reviewer` · harness ratchet (quality never goes down) |
| F-07 | Use real, customer or Virtusa confidential data; any email not ending in `@example.test` | `tests/unit/test_synthetic_data.py` (NFR-10.1) · harness `secrets` scan / gitleaks |
| F-08 | Log email, phone, password, scores or progress; echo submitted values in error bodies | hook `pii-log-guard` · `tests/unit/core/test_log_redaction.py` (NFR-03.1) · `tests/api/test_error_format.py` (NFR-03.2) |
| F-09 | Edit harness-supplied files (`.claude/` files that came from the plugin) | harness `artifact-guard` hook · MR review — LearnLab additions live in their own files |
| F-10 | Import upward across layers, or import anything non-stdlib into `domain/` | import-linter contracts (ARCH-01 – ARCH-03) · harness `layers.js` via `project-manifest.json` |
| F-11 | Add a route that creates, changes or deletes a score, attempt, completion or enrolment outside the specified endpoints | `tests/architecture/test_nfr08_boundaries.py` (AC-06.5, AC-09.7) |
| F-12 | Build anything in `app_spec.md` §5 Out of Scope | harness BRD forbidden-actions list · `evaluator` · MR review |
| F-13 | Hand-written production code by the engineer | No-Hand-Coding rule · git history (agent commits only) |

### 1.2 Escalate to the engineer (always)

Stop and ask when: a spec is ambiguous or contradicts code; a change needs a requirement, endpoint, table or dependency not in the specs; a test can pass only by weakening it; a hook blocks work and the agent believes the hook is wrong; any action would touch `main`, an existing migration or real data; the same evaluator criterion fails twice in a row.

### 1.3 Reporting

Every agent that changes files reports: files changed · FR / AC / DR ids addressed · tests run and results · open risks. Commit messages follow `TASK-Sn-nn: <summary> (AC-NN)`.

---

## 2. Brief vs actual harness agents

The capstone brief lists seven base agents. The harness repository ships a different set. Contracts below cover what actually ships.

| Brief name | Actual harness agent | Notes |
|---|---|---|
| planner | `planner` | Same |
| generator | `generator` (lead) + `implementer` (per-story worker) | Brief allows renaming generator → implementer; harness uses both |
| evaluator | `evaluator` | Runtime mode (running app + Playwright MCP) and artifact mode (scores BRD/spec/design docs) |
| security-reviewer | `security-reviewer` | Same |
| test-engineer | **not shipped** | Covered by the `/test` skill (runs as `generator`) and test-first `implementer`; LearnLab adds `archtest-author-agent` |
| design-critic | `design-critic` | Same |
| ui-designer | **not shipped** | Covered by the `/design` skill (UI mockups, `aesthetic-direction.md`) and `design-critic` scoring |
| — | `code-reviewer` | Extra: fresh-context structure + correctness review at `/gate` |
| — | `advisor` | Extra: read-only checkpoint advisor (`continue` / `pivot` / `stop_for_human`) |
| — | `codebase-explorer` | Extra: read-only repo mapping |
| — | `modularity-reviewer` | Extra: coupling / duplication review (`/brownfield --full`) |

---

## 3. Harness agents

### 3.1 planner

| Aspect | Contract |
|---|---|
| Purpose | Turn `specs/app_spec.md` into the BRD, epics, stories, dependency graph, design schemas and `features.json` |
| Inputs | `specs/app_spec.md` (via `/brd --prd`), feature specs, `docs/business-case.md`, `docs/architecture.md`, `CONTEXT.md` if present |
| Outputs | `specs/brd/*`, `specs/stories/*`, `specs/design/*`, `features.json` |
| Allowed tools | Read, Write, Glob, Grep, Bash (read-only commands) |
| Forbidden | F-01 – F-13; inventing requirements with no trace to an FR/NFR/AC; renaming FR/AC/DR ids; editing `specs/app_spec.md` or feature specs; writing code |
| Failure behaviour | Mark unclear stories `needs_breakdown`; list open questions instead of guessing |
| Escalate when | §1.2, or the grounding gate reports `net_new` / `dropped` items |
| Evaluated by | `evaluator` artifact mode (`specs/reviews/phase-*-eval.json`) + `brd-grounding.json` / `spec-grounding.json` hard gates; engineer approval at each pipeline gate |

### 3.2 generator (lead)

| Aspect | Contract |
|---|---|
| Purpose | Implement a story group: negotiate the sprint contract, dispatch `implementer` teammates or implement solo, integrate, hand off to the evaluator |
| Inputs | Sprint contract, stories, owning feature specs, folder `CLAUDE.md` files, `specs/agent-contracts.md`, `docs/tdd.md`, `.claude/state/learned-rules.md` |
| Outputs | Commits on a `feature/*` branch (failing test → implementation → refactor), `sprint-contracts/sprint-N.md`, iteration log |
| Allowed tools | Read, Write, Edit, Glob, Grep, Bash, Agent (spawn `implementer` only) |
| Forbidden | F-01 – F-13; self-evaluating ("never self-evaluate"); writing production code for stories assigned to teammates in team mode |
| Failure behaviour | On evaluator FAIL, read `specs/reviews/eval-failures-NNN.json`, fix and re-submit (ratchet); never relax a criterion |
| Escalate when | §1.2, or `advisor` returns `stop_for_human` |
| Evaluated by | `evaluator` runtime mode, `code-reviewer`, `security-reviewer`, CI, engineer MR review |

### 3.3 implementer (per-story worker)

| Aspect | Contract |
|---|---|
| Purpose | Implement a single story test-first under strict file ownership |
| Inputs | Story ACs and file ownership from the lead; stack references (`stack-python-fastapi.md`, `stack-react-typescript.md`); folder `CLAUDE.md`; learned rules |
| Outputs | Commits for owned files only; summary back to the lead |
| Allowed tools | Read, Write, Edit, Glob, Grep, Bash |
| Forbidden | F-01 – F-13; editing files outside its ownership; spawning agents; invoking the evaluator; grading its own work |
| Failure behaviour | If the story is too big for one worker, report it to the lead instead of fanning out |
| Escalate when | To the lead (who escalates per §1.2) |
| Evaluated by | The lead's integration run, then `evaluator` |

### 3.4 evaluator

| Aspect | Contract |
|---|---|
| Purpose | Independently verify sprint-contract criteria against the running app (API + Playwright MCP + schema), or score planning documents |
| Inputs | Sprint contract, feature-spec AC scenarios, running app, `.mcp.json` (Playwright MCP), `specs/reviews/security-verdict.json` |
| Outputs | `specs/reviews/sprint-N-evaluation.md`, `specs/reviews/eval-failures-NNN.json`, `specs/reviews/phase-*-eval.json` |
| Allowed tools | Read, Write (reports only), Glob, Grep, Bash, Playwright MCP browser tools |
| Forbidden | F-01 – F-13; writing or fixing code; passing a criterion by reading source instead of running it; accepting partial passes |
| Failure behaviour | Record each failing check with evidence; overall FAIL if any criterion or the security verdict fails |
| Escalate when | A criterion cannot be checked as written (spec defect), or the same criterion fails twice |
| Evaluated by | Engineer reviews the report in the MR; reports are committed as rubric evidence |

### 3.5 security-reviewer

| Aspect | Contract |
|---|---|
| Purpose | Find OWASP-class vulnerabilities in the changed files and their data-flow neighbours |
| Inputs | Diff / changed files, `specs/reviews/review-context-pack.md`, threat model, `security-python.md`, `security-react-typescript.md` |
| Outputs | `specs/reviews/security-verdict.json` |
| Allowed tools | Read, Write (verdict only), Grep, Glob, Bash (read-only) |
| Forbidden | F-01 – F-13; editing code; scanning outside the change set |
| LearnLab focus | Role guards and ownership (DR-22 – DR-26), IDOR on enrolments/attempts, JWT handling (app_spec §8.4), XSS via lesson Markdown and `video_ref` (AC-03.7), PII in logs and 422 bodies (NFR-03), `LIKE` escaping (CT-2) |
| Failure behaviour | Any BLOCK / critical / high finding → `pass: false` |
| Escalate when | A finding needs a spec change (e.g. new auth rule) |
| Evaluated by | Folded into the evaluator verdict; engineer MR review |

### 3.6 code-reviewer

| Aspect | Contract |
|---|---|
| Purpose | Fresh-context review of a diff for structure and correctness |
| Inputs | Diff and touched files only (never the builder's conversation) |
| Outputs | Findings with severity, confidence and axis in `specs/reviews/` |
| Allowed tools | Read, Write (report only), Grep, Glob, Bash |
| Forbidden | F-01 – F-13; editing code; vulnerability hunting (security-reviewer owns it) |
| LearnLab focus | Business rules leaking out of the six domain files; missing edge cases from spec tables (zero, boundary, duplicate, concurrent); weakened tests (F-06) |
| Failure behaviour | Report every finding; the `/gate` policy decides what blocks |
| Evaluated by | Engineer MR review |

### 3.7 design-critic

| Aspect | Contract |
|---|---|
| Purpose | Score UI screenshots on design quality, originality, craft and functionality |
| Inputs | Running UI via Playwright MCP, `specs/design/mockups/aesthetic-direction.md`, `calibration-profile.json` |
| Outputs | Scored critique in `specs/reviews/` |
| Allowed tools | Read, Write (report only), Bash, Playwright MCP browser tools |
| Forbidden | F-01 – F-13; editing code |
| LearnLab focus | Every FR-39 screen at 375 px and 1280 px (UI-AC.1); no horizontal scroll; read-only state on published course editors |
| Failure behaviour | Below-threshold score sends frontend work back to the generator |
| Evaluated by | Engineer review. Visual polish is not graded by the capstone rubric — responsiveness is |

### 3.8 advisor · codebase-explorer · modularity-reviewer

| Agent | Purpose | Tools | Outputs | Forbidden / limits |
|---|---|---|---|---|
| `advisor` | Checkpoint advice after repeated FAILs or mid-epic | Read, Grep, Glob | JSON verdict: `continue` / `pivot` / `stop_for_human` | Read-only; never implements; F-01 – F-13 |
| `codebase-explorer` | Map subsystems and trace dependencies | Read, Glob, Grep, Bash (read-only), LSP | Findings report | Must not modify any file |
| `modularity-reviewer` | Judge coupling hubs and duplication | Read, Grep, Glob, Bash, Write (report) | Modularity findings | Never flag on fan-in alone; no code edits |

---

## 4. LearnLab project agents (created in Prompt 10)

### 4.1 quiz-grader-agent

| Aspect | Contract |
|---|---|
| Purpose | Guard the correctness of quiz grading and integer maths (AC-05, AC-06, NFR-01) |
| Inputs | `specs/quiz-engine_spec.md` (QZ, GR, AT rules; GR-4 table), `specs/fixtures/golden_cases.json` (grading cases), `QuizGrader` and `ProgressCalculator` source, their tests, any diff touching them |
| Outputs | `specs/reviews/quiz-grader-review.md`: each GR / AT rule → implemented? tested? which test; missing golden cases; integer-maths violations |
| Allowed tools | Read, Grep, Glob, Bash (run `pytest` on grading tests and `test_no_float_math.py` only) |
| Forbidden | F-01 – F-13; editing production code or specs; changing the GR-4 table or golden cases; marking a rule satisfied without a passing test |
| Failure behaviour | List each mismatch with the rule id, file and line; recommend the failing test the generator should write |
| Escalate when | Spec and golden cases disagree, or a rule cannot be tested as written |
| Evaluated by | Every GR-4 / PR-7 row and AT-1 – AT-7 has a passing tagged test; report reviewed in the MR |

### 4.2 course-state-validator-agent

| Aspect | Contract |
|---|---|
| Purpose | Prove the course lifecycle and content lock match the spec exactly (AC-04, AC-08, DR-05, NFR-08) |
| Inputs | `specs/catalog_spec.md` §3.1 transition table and CL-1 – CL-6, `specs/course-authoring_spec.md` CA-3 / CA-7, `CourseStateMachine` and `PublishedContentGuard` source, their tests, any diff touching course state |
| Outputs | `specs/reviews/course-state-review.md`: all 12 state × action cells (4 allowed, 8 forbidden) → code matches? test exists? ; every content-changing service method → calls `PublishedContentGuard`? |
| Allowed tools | Read, Grep, Glob, Bash (run state-machine, guard and lifecycle API tests only) |
| Forbidden | F-01 – F-13; changing the transition table; editing production code; marking a forbidden transition as allowed |
| Failure behaviour | Report the exact cell or method that diverges and the missing test |
| Escalate when | Spec and code disagree on any cell — the engineer decides whether the spec changes |
| Evaluated by | 12/12 cells covered by AC-08.1 / AC-08.2 parametrised tests; CL-6 covered by AC-08.6; report reviewed in the MR |

### 4.3 archtest-author-agent

| Aspect | Contract |
|---|---|
| Purpose | Write and maintain architecture tests and import-linter contracts (ARCH-01 – ARCH-07, NFR-01.1, NFR-02.1, NFR-04.1, NFR-08.1) |
| Inputs | `docs/architecture.md` §3.3, `CLAUDE.md` architecture rules, `docs/test-strategy.md`, `backend/` package layout |
| Outputs | `backend/tests/architecture/*.py`, import-linter configuration in `backend/pyproject.toml`; each test tagged with its ARCH / NFR id |
| Allowed tools | Read, Write, Edit (only `backend/tests/architecture/` and the import-linter section), Glob, Grep, Bash (`pytest tests/architecture`, `lint-imports`) |
| Forbidden | F-01 – F-13; editing production code to make an architecture test pass; loosening a contract or adding an `ignore_imports` exception without engineer approval |
| Failure behaviour | Commit the failing architecture test first (red), report the violating module; the generator fixes production code |
| Escalate when | A rule in `architecture.md` cannot be expressed as a test, or a proposed exception is needed |
| Evaluated by | ≥ 3 structural tests (rubric) — target 7; each ARCH rule maps to a test; tests fail on a seeded violation; CI job `test-backend` |

---

## 5. Where contracts are enforced

| Mechanism | Covers |
|---|---|
| Agent definition `tools:` lists (`.claude/agents/*.md`) | Allowed tools per agent |
| Project hooks: `attempt-immutability-check`, `course-publish-gate`, `pii-log-guard` | F-02, F-03, F-08, DR-05 |
| Harness hooks: `pre-bash-gate`, `pre-write-gate`, `artifact-guard`, `verify-on-save`, layer check | F-01, F-09, F-10, lint/type on save |
| Architecture tests + import-linter | F-03, F-04, F-10, F-11 |
| CI jobs: `test-backend`, `migrations-append-only`, `smoke-start`, Claude Code review | F-02, F-06, NFR-09, NFR-11 |
| GitLab protected `main` + `--no-ff` MR merges | F-01 |
| Engineer MR review | F-05, F-12, F-13 and every escalation |
