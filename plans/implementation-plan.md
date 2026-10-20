# LearnLab — Implementation Plan

| Field | Value |
|---|---|
| Prompt | Prompt 08 — Build the Sprint Plan |
| Inputs | [app_spec.md](../specs/app_spec.md), the six feature specs, [architecture.md](../docs/architecture.md) §10–§12, [test-strategy.md](../docs/test-strategy.md), [tdd.md](../docs/tdd.md), [agent-contracts.md](../specs/agent-contracts.md) |
| Task list | [tasks/tasks.md](../tasks/tasks.md) |
| Capstone budget | 20 hours total |

## 1. Time budget

Foundation work (business case, specs, reviews, contracts, plan, substrate) is front-loaded so the remaining hours are agent-driven implementation and review.

| Phase | Hours | Cumulative | Output |
|---|---|---|---|
| Foundation (Prompts 01–10) | 5.0 | 5.0 | Docs, specs, reviews, contracts, plan, substrate |
| Sprint 0 — Foundation | 3.0 | 8.0 | Scaffold, auth, health, logging, migrations, CI — **MR 1** |
| Sprint 1 — Catalog + Enrolment | 3.5 | 11.5 | Course creation, lifecycle, catalog, enrolment — **MR 2** |
| Sprint 2 — Modules, Lessons, Progress | 3.5 | 15.0 | Authoring hierarchy, sequential progress, snapshots, bands — **MR 3** |
| Sprint 3 — Quiz Engine + Workbench | 3.5 | 18.5 | Quizzes, attempts, best score, workbench, admin analytics — **MR 4** |
| Fix loop + evidence (Prompt 13) | 1.0 | 19.5 | Fix-loop trace, post-mortem, knowledge deposits — **MR 5** |
| Buffer and final audit | 0.5 | 20.0 | `/ac-coverage`, `ac_audit.py`, rubric checklist |

Five merge requests are planned; the rubric needs at least three `--no-ff` merges.

## 2. How every sprint runs

```text
/sprint-start <N>                       # project command: loads contract template + scope
  → harness /build specs/app_spec.md    # sprint 1: BRD → stories → design → /auto
    or /sprint <prd-file>               # sprints 2+: delta against previous sprint
  → generator negotiates sprint contract → sprint-contracts/sprint-N.md (engineer approves)
  → per AC: red commit → green commit → refactor commit (docs/tdd.md)
  → hooks + verify-on-save on every write
  → project agents review: quiz-grader-agent / course-state-validator-agent / archtest-author-agent
  → evaluator (Playwright MCP) → specs/reviews/sprint-N-evaluation.md; FAIL → ratchet
  → /gate → MR → CI (lint, test-backend, test-frontend, e2e, ac-audit, smoke-start, claude-review)
  → engineer approval → git merge --no-ff feature/sprint-N-… into main
```

Every sprint branch is `feature/sprint-<N>-<name>`; task branches inside a sprint are optional (`feature/TASK-S<N>-<nn>-<name>`) and merge into the sprint branch.

## 3. Sprints

### Sprint 0 — Foundation

| Item | Detail |
|---|---|
| Goal | A running, empty-but-secure LearnLab: scaffold, layering enforced, login works, CI green |
| Branch | `feature/sprint-0-foundation` |
| FRs | FR-01 – FR-05, FR-39 (shell only) |
| ACs | AC-01.1, AC-01.2 (registration part of AC-01) |
| NFRs | NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-09, NFR-10, NFR-11 (gates wired) |
| Domain files | `RoleBoundaryPolicy` (role checks only; ownership added per sprint) |
| Unit / API tests | `test_auth_api.py`, `test_health.py`, `test_correlation_id.py`, `test_error_format.py`, `unit/core/test_log_redaction.py`, `unit/test_synthetic_data.py` |
| Architecture tests | `test_layering.py`, `test_domain_purity.py`, `test_route_guards.py`, import-linter contracts ARCH-01 – ARCH-03, ARCH-07 |
| Playwright | `e2e/login.spec.ts` (login + role routing at 375 / 1280 px) |
| Security risks | JWT secret handling, password hashing, 422 echoing input, PII in logs |
| Guarding hooks | `pii-log-guard`, `attempt-immutability-check`, harness `pre-write-gate` (secrets) |
| Done when | `/health` 200; register + login work; every guarded route returns 401 without a token; CI pipeline green with all jobs present; one-command start works on a clean checkout |

**Sprint contract** (`sprint-contracts/sprint-0.md`)
- *Scope in:* scaffold (FastAPI + React/Vite + SQLite), `project-manifest.json` layer config, Alembic baseline with `user` table, seed loader for users, auth, error handlers, logging middleware, health, CI.
- *Scope out:* any course, enrolment, lesson or quiz feature.
- *Done criteria:* FR-01 – FR-05 Done rows; NFR-03.1, 03.2, 04.1, 05.1, 06.1, 07.1, 09.1, 10.1 pass.

**Special steps:** commit root `CLAUDE.md` and `.claude/settings.json` before `/scaffold`; after it, restore them and merge only the harness sections (see `CLAUDE.md` header).

### Sprint 1 — Catalog + Enrolment

| Item | Detail |
|---|---|
| Goal | Instructors create courses, admins run the lifecycle, learners browse and enrol once |
| Branch | `feature/sprint-1-catalog-enrolment` |
| FRs | FR-06, FR-07, FR-11, FR-12 – FR-22 |
| ACs | AC-01, AC-02, AC-04, AC-08, AC-10 (catalog part: AC-10.1 – AC-10.3) |
| Domain files | `CourseStateMachine`, `PublishedContentGuard`, `EnrollmentPolicy` |
| Unit / API tests | `test_course_state_machine.py`, `test_published_content_guard.py`, `test_enrollment_policy.py`, `test_catalog_service.py`, `test_enrollment_service.py`, `test_course_authoring_api.py` (AC-02), `test_admin_lifecycle_api.py`, `test_catalog_api.py`, `test_enrollment_api.py`, `test_enrollment_concurrency.py`, `test_lifecycle_concurrency.py` |
| Architecture tests | `test_append_only_repos.py` (enrolment, state change), `test_nfr08_boundaries.py` (content lock) |
| Playwright | `catalog.spec.ts`, `admin-console.spec.ts`, `learner-enrol.spec.ts` (UI-AC.2) |
| Security risks | IDOR on enrolments, admin-only transitions, `LIKE` escaping, race on duplicate enrolment |
| Guarding hooks | `attempt-immutability-check` (EnrollmentRepository, CourseStateChangeRepository), `course-publish-gate` |
| Project agent review | `course-state-validator-agent` → `specs/reviews/course-state-review.md` |
| Done when | All AC-01, 02, 04, 08 scenarios and AC-10.1 – 10.3 pass; 12/12 lifecycle cells tested; evaluator PASS |

**Sprint contract** (`sprint-contracts/sprint-1.md`)
- *Scope in:* `course`, `course_state_change`, `enrollment` tables; course create/edit details; admin transitions; catalog search; enrolment; My Learning list (0% progress).
- *Scope out:* modules, lessons, quizzes, progress, analytics.
- *Done criteria:* scenarios AC-01.1 – 01.8, AC-02.1 – 02.4, AC-04.1 – 04.5, AC-08.1 – 08.6, AC-10.1 – 10.3, CT-AC.1 – 03.

### Sprint 2 — Modules, Lessons, Progress

| Item | Detail |
|---|---|
| Goal | Full course → module → lesson authoring; learners complete lessons in order and see progress; instructors see bands |
| Branch | `feature/sprint-2-lessons-progress` |
| FRs | FR-08 – FR-10, FR-23 – FR-27, FR-35, FR-36, FR-40 |
| ACs | AC-03, AC-07, AC-09 |
| Domain files | `ProgressCalculator` (percent, band, lesson order); `PublishedContentGuard` extended to modules and lessons |
| Unit / API tests | `test_progress_calculator.py`, `test_lesson_order.py`, `test_progress_tracker_service.py`, `test_analytics_service.py` (bands), `test_course_authoring_api.py` (AC-03), `test_progress_api.py`, `test_progress_concurrency.py`, `test_workbench_api.py` |
| Architecture tests | `test_no_float_math.py` (ProgressCalculator), `test_append_only_repos.py` (completion, snapshot), `test_nfr08_boundaries.py` (AC-07.9, AC-09.7) |
| Playwright | `instructor-authoring.spec.ts`, `learner-progress.spec.ts`, `instructor-dashboard.spec.ts` |
| Security risks | Learner reading another learner's progress; XSS through lesson Markdown / `video_ref` |
| Guarding hooks | `attempt-immutability-check` (CompletionRepository, ProgressSnapshotRepository), `course-publish-gate`, `pii-log-guard` (progress values) |
| Project agent review | `quiz-grader-agent` (integer maths in ProgressCalculator), `archtest-author-agent` |
| Done when | AC-03.1 – 03.7, AC-07.1 – 07.13, AC-09.1 – 09.7 pass; evaluator PASS |

**Sprint contract** (`sprint-contracts/sprint-2.md`)
- *Scope in:* `module`, `lesson`, `lesson_completion`, `progress_snapshot` tables; authoring endpoints; learn view; lesson view; completion; progress and history; progress bands; instructor dashboard.
- *Scope out:* quizzes, admin analytics.

### Sprint 3 — Quiz Engine + Instructor Workbench + Admin Analytics

| Item | Detail |
|---|---|
| Goal | Module quizzes with deterministic grading, unlimited attempts, best score; admin analytics |
| Branch | `feature/sprint-3-quiz-workbench` |
| FRs | FR-28 – FR-34, FR-37, FR-38 |
| ACs | AC-05, AC-06, AC-10 (analytics part: AC-10.4 – AC-10.6) |
| Domain files | `QuizGrader`; `ProgressCalculator.completion_rate` |
| Unit / API tests | `test_quiz_grader.py`, `test_quiz_structure.py`, `test_quiz_engine_service.py`, `test_quiz_api.py`, `test_admin_analytics_api.py` |
| Architecture tests | `test_no_float_math.py` (QuizGrader), `test_append_only_repos.py` (attempts), `test_nfr08_boundaries.py` (AC-06.5) |
| Playwright | `learner-quiz.spec.ts`, `admin-analytics.spec.ts`, `responsive.spec.ts` (UI-AC.1, all screens) |
| Security risks | Answers leaking in learner view; score-writing routes; option ids from other questions |
| Guarding hooks | `attempt-immutability-check` (AttemptRepository), `course-publish-gate` (quiz replace), `pii-log-guard` (scores) |
| Project agent review | `quiz-grader-agent` → `specs/reviews/quiz-grader-review.md` |
| Done when | AC-05.1 – 05.8, AC-06.1 – 06.7, AC-10.4 – 10.6 pass; every FR-39 screen passes UI-AC.1; coverage gates met; evaluator PASS |

**Sprint contract** (`sprint-contracts/sprint-3.md`)
- *Scope in:* `quiz`, `question`, `option`, `quiz_attempt` tables (with `version`, `quiz_version`, `results_json`); quiz authoring; learner quiz view; attempts; history; admin analytics; responsive pass over all screens.
- *Scope out:* question types beyond MCQ / TRUE_FALSE, timed quizzes, quiz statistics.

### Evidence sprint — Fix loop (Prompt 13)

| Item | Detail |
|---|---|
| Branch | `feature/fix-001-duplicate-enrolment` (or the real failure found) |
| Output | `docs/fix-loops/001-*.md`, `docs/post-mortems/001-*.md`, `docs/knowledge-deposits.md`, entry in `.claude/state/learned-rules.md` |
| Done when | Failing test → fix → green suite → MR merged with `--no-ff` |

## 4. Merge requests

| MR | Branch | Contains | Merge |
|---|---|---|---|
| MR 0 *(optional)* | `feature/foundation-docs` | Docs, specs, reviews, contracts, plan, substrate | `--no-ff` |
| MR 1 | `feature/sprint-0-foundation` | Sprint 0 | `--no-ff` |
| MR 2 | `feature/sprint-1-catalog-enrolment` | Sprint 1 | `--no-ff` |
| MR 3 | `feature/sprint-2-lessons-progress` | Sprint 2 | `--no-ff` |
| MR 4 | `feature/sprint-3-quiz-workbench` | Sprint 3 | `--no-ff` |
| MR 5 | `feature/fix-001-*` | Fix loop + evidence | `--no-ff` |

## 5. Risks to the plan

| Risk | Mitigation |
|---|---|
| `/scaffold` overwrites `CLAUDE.md` and `.claude/settings.json` | Commit both first; restore and merge after scaffold (Sprint 0 special step) |
| Harness layer hook ignores `backend/src/learnlab/` | Set `project-manifest.json` `architecture.layers` / `layer_roots` in Sprint 0 |
| SQLite locking under concurrency tests | WAL + busy timeout; file-based test DB for concurrency tests (test-strategy §9) |
| Sprint overruns | Each sprint's scope-out list is strict; the buffer covers one overrun; AC-10 analytics can move to the fix-loop MR if needed |
| Evaluator FAIL loops | `advisor` checkpoint after two consecutive FAILs on the same criterion; escalate to engineer |
| Line-count target (≥ 3000 generated lines) | Expected ~4–6k lines across backend, frontend and tests by Sprint 3; checked at the final audit |
