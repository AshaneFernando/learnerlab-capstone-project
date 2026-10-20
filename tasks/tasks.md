# LearnLab — Task List

| Field | Value |
|---|---|
| Prompt | Prompt 09 — Convert the Plan into Tasks and Harness Stories |
| Source plan | [plans/implementation-plan.md](../plans/implementation-plan.md) |
| Specs | [app_spec.md](../specs/app_spec.md) and the six feature specs |
| Test conventions | [docs/test-strategy.md](../docs/test-strategy.md) §2, [docs/tdd.md](../docs/tdd.md) |
| Agent rules | [specs/agent-contracts.md](../specs/agent-contracts.md) |

**How to read a task.** Each task is one vertical, independently testable slice. Acceptance criteria are condensed from the owning feature spec; the spec text wins if they differ (Spec-Is-Truth). Every acceptance scenario is owned by exactly one task (see §6).

**Commit sequence for every task** (docs/tdd.md): for each scenario group —
1. `TASK-Sn-nn: red — <failing test> (AC-NN)` — tests only, must fail
2. `TASK-Sn-nn: green — <minimal implementation> (AC-NN)` — tests pass
3. `TASK-Sn-nn: refactor — <cleanup> (AC-NN)` — optional, tests still pass

**Tagging.** pytest: `@pytest.mark.ac("AC-NN")` (or `"NFR-NN.x"`) plus the scenario id in the test name, e.g. `test_ac_01_6_concurrent_enrolment`. Vitest / Playwright: the scenario id at the start of the test title.

**Branches.** Task branches `feature/TASK-S<n>-<nn>-<short-name>` merge into the sprint branch `feature/sprint-<n>-<name>`; the sprint branch merges to `main` with `git merge --no-ff` after CI and engineer approval.

---

## 1. Summary

| ID | Sprint | Objective | Scenarios owned | Depends on |
|---|---|---|---|---|
| TASK-S0-01 | 0 | Scaffold, layer config, health endpoint | NFR-07.1 | — |
| TASK-S0-02 | 0 | Architecture tests and import-linter contracts | ARCH-01, -02, -03, -07 | S0-01 |
| TASK-S0-03 | 0 | Standard error handling | NFR-03.2 | S0-01 |
| TASK-S0-04 | 0 | Registration, login, JWT, role guards | AC-01.1, AC-01.2, NFR-04.1 | S0-03, S0-06 |
| TASK-S0-05 | 0 | JSON logs, correlation id, PII redaction | NFR-06.1, NFR-03.1 | S0-01 |
| TASK-S0-06 | 0 | Alembic baseline, append-only migrations | NFR-05.1 | S0-01 |
| TASK-S0-07 | 0 | Seed loader (users) and synthetic-data check | NFR-10.1 | S0-04, S0-06 |
| TASK-S0-08 | 0 | GitLab CI pipeline, one-command start, login E2E | NFR-09.1, NFR-11.1 | S0-01 – S0-07 |
| TASK-S1-01 | 1 | `CourseStateMachine` domain rule | AC-08.1, AC-08.2 | S0-02 |
| TASK-S1-02 | 1 | Create and edit course details | AC-02.1 – AC-02.4 | S0-04, S1-01 |
| TASK-S1-03 | 1 | Catalog browse and search | CT-AC.1 – CT-AC.3 | S1-02 |
| TASK-S1-04 | 1 | Admin lifecycle transitions with audit | AC-04.1 – AC-04.4, AC-08.3 – AC-08.6 | S1-01, S1-02 |
| TASK-S1-05 | 1 | Admin course list and ready-to-publish | AC-10.1 – AC-10.3 | S1-04 |
| TASK-S1-06 | 1 | `EnrollmentPolicy` and enrolment API | AC-01.3 – AC-01.8, AC-04.5, NFR-02.1 | S1-04 |
| TASK-S1-07 | 1 | Catalog, admin and My Learning UI + E2E | UI-AC.2 | S1-03 – S1-06 |
| TASK-S2-01 | 2 | Modules and lessons authoring | AC-03.1 – AC-03.7 | S1-02 |
| TASK-S2-02 | 2 | `ProgressCalculator` domain rule | AC-07.2, AC-07.10, NFR-01.1 | S0-02 |
| TASK-S2-03 | 2 | Lesson completion, order, snapshots | AC-07.1, AC-07.3 – AC-07.8, AC-07.12, AC-07.13 | S2-01, S2-02, S1-06 |
| TASK-S2-04 | 2 | Learn view, lesson view, progress read | AC-07.9, AC-07.11 | S2-03 |
| TASK-S2-05 | 2 | Instructor progress bands | AC-09.1 – AC-09.6 | S2-02, S2-03 |
| TASK-S2-06 | 2 | NFR-08 boundary tests + authoring / learning / dashboard UI | AC-09.7, NFR-08.1 | S2-01 – S2-05 |
| TASK-S3-01 | 3 | `QuizGrader` domain rule | AC-05.4 – AC-05.6 | S0-02 |
| TASK-S3-02 | 3 | Quiz authoring with versions | AC-05.1, AC-05.2, AC-05.8 | S2-01, S3-01 |
| TASK-S3-03 | 3 | Learner quiz view and attempts | AC-05.3, AC-05.7, AC-06.1 – AC-06.3, AC-06.6, AC-06.7 | S3-02, S1-06 |
| TASK-S3-04 | 3 | Replace keeps attempts; no score-writing routes | AC-06.4, AC-06.5 | S3-03 |
| TASK-S3-05 | 3 | Admin analytics | AC-10.4 – AC-10.6 | S2-02, S1-06 |
| TASK-S3-06 | 3 | Quiz and analytics UI + responsive pass | UI-AC.1 | S3-03 – S3-05 |
| TASK-FIX-01 | Fix | Autonomous fix loop + knowledge deposit | — (re-proves an existing scenario) | Sprint 3 merged |

Totals: Sprint 0 — 8 · Sprint 1 — 7 · Sprint 2 — 6 · Sprint 3 — 6 · Fix — 1 · **28 tasks**.

---

## 2. Sprint 0 — Foundation (`feature/sprint-0-foundation`)

### TASK-S0-01 — Scaffold, layer config, health endpoint

| Field | Value |
|---|---|
| Objective | Run `/scaffold` (FastAPI + React/Vite + SQLite), restore root `CLAUDE.md` and `.claude/settings.json`, set `project-manifest.json` layers, create the `backend/src/learnlab/{api,services,repositories,domain,integrations,core}` packages, `core/clock.py`, SQLite engine with WAL + 5 s busy timeout, and `GET /health` |
| Spec reference | FR-04 · NFR-07 · app_spec §8.6 · CLAUDE.md "Harness layer hook" |
| Depends on | — |
| Branch | `feature/TASK-S0-01-scaffold-health` |

**Acceptance criteria**
- **NFR-07.1** Given the application has completed startup, when `GET /health` is called, then it returns 200 `{"status": "ok"}` in under 1 second.

**Tests to write first:** `backend/tests/api/test_health.py` — `@pytest.mark.ac("NFR-07.1")`.
**Architecture rules:** ARCH-01 (layout must match `project-manifest.json`).
**Security:** no secrets in the scaffold; `.env` git-ignored; synthetic JWT default only.
**Guarding hooks:** harness `pre-write-gate` (secrets), `verify-on-save`.

### TASK-S0-02 — Architecture tests and import-linter contracts

| Field | Value |
|---|---|
| Objective | Add import-linter contracts and the first architecture tests so layer violations fail from day one (owned by `archtest-author-agent`) |
| Spec reference | ARCH-01, ARCH-02, ARCH-03, ARCH-07 · architecture.md §3.3, §12 |
| Depends on | TASK-S0-01 |
| Branch | `feature/TASK-S0-02-archtests` |

**Acceptance criteria**
- **ARCH-01** Given the backend package, when `lint-imports` runs, then no module imports a higher layer (api → services → repositories).
- **ARCH-02** Given `domain/`, when scanned, then it imports only the standard library.
- **ARCH-03** Given `api/`, when scanned, then it never imports `repositories`.
- **ARCH-07** Given `services/`, when scanned, then integrations are imported only through their interfaces.
- Each contract fails on a deliberately seeded violation (demonstrated in the red commit).

**Tests to write first:** `backend/tests/architecture/test_layering.py`, `backend/tests/architecture/test_domain_purity.py`; import-linter config in `backend/pyproject.toml`.
**Architecture rules:** ARCH-01 – ARCH-03, ARCH-07.
**Security:** —
**Guarding hooks:** harness `layers.js` via `verify-on-save`.

### TASK-S0-03 — Standard error handling

| Field | Value |
|---|---|
| Objective | Exception handlers so every error (404, 405, 422, 500 and domain errors) uses `{"error": {"code", "message"}}`; 422 lists fields without echoing input |
| Spec reference | app_spec §8.1 (error table and rules) · spec-review R-22, R-24 · NFR-03 |
| Depends on | TASK-S0-01 |
| Branch | `feature/TASK-S0-03-error-format` |

**Acceptance criteria**
- **NFR-03.2** Given a registration with an invalid password, when the API returns 422, then the body names the field but contains neither the submitted password nor the email.
- Framework 404 / 405 and an unhandled 500 return the standard shape with `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR` and no stack trace.

**Tests to write first:** `backend/tests/api/test_error_format.py` — `@pytest.mark.ac("NFR-03.2")`.
**Architecture rules:** ARCH-01 (handlers live in `api/` or `core/`).
**Security:** no stack traces or request data in responses.
**Guarding hooks:** `pii-log-guard`.

### TASK-S0-04 — Registration, login, JWT and role guards

| Field | Value |
|---|---|
| Objective | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, bcrypt hashing, HS256 JWT (60 min), `require_role(...)` guards, `RoleBoundaryPolicy` role checks |
| Spec reference | FR-01 – FR-03 · AC-01.1, AC-01.2 · RG-1 – RG-5 · app_spec §8.4 · DR-22 · NFR-04 |
| Depends on | TASK-S0-03, TASK-S0-06 |
| Branch | `feature/TASK-S0-04-auth` |

**Acceptance criteria**
- **AC-01.1** Given no user with email `ada@example.test`, when a visitor registers with name "Ada Lovelace", that email and password "Passw0rd!", then 201 with `role = "LEARNER"` and no `password` / `password_hash` in the body.
- **AC-01.2** Given a user with `ada@example.test`, when a visitor registers with `ADA@example.test`, then 409 `EMAIL_TAKEN`.
- **NFR-04.1** Given the route table, when the architecture test inspects it, then every route except register, login and health depends on an auth guard.
- Expired, tampered or malformed tokens → 401 `UNAUTHENTICATED` (app_spec §8.4).

**Tests to write first:** `backend/tests/api/test_auth_api.py` — `@pytest.mark.ac("AC-01")`; `backend/tests/architecture/test_route_guards.py` — `@pytest.mark.ac("NFR-04.1")`.
**Architecture rules:** ARCH-04, ARCH-01.
**Security:** bcrypt, password ≤ 72 chars, `role` in request ignored (RG-3), secret from `LEARNLAB_JWT_SECRET`.
**Guarding hooks:** `pii-log-guard`, harness `pre-write-gate` (secrets).

### TASK-S0-05 — JSON logs, correlation id, PII redaction

| Field | Value |
|---|---|
| Objective | JSON log formatter, `X-Correlation-ID` middleware (generate or echo), redaction filter on every handler; request/response bodies never logged |
| Spec reference | NFR-03, NFR-06 · app_spec §8.1 error rules · spec-review R-23 |
| Depends on | TASK-S0-01 |
| Branch | `feature/TASK-S0-05-logging` |

**Acceptance criteria**
- **NFR-06.1** Given a request without `X-Correlation-ID`, when handled, then the response carries a generated id and every log line for that request is JSON with the same id; a supplied id is echoed unchanged.
- **NFR-03.1** Given log capture, when a learner registers, logs in, submits a quiz attempt, completes a lesson, and a request triggers an unhandled error, then no log line contains the email, phone, password, score or progress value. *(Attempt and completion paths are added to this test in S2-03 and S3-03.)*

**Tests to write first:** `backend/tests/api/test_correlation_id.py` — `@pytest.mark.ac("NFR-06.1")`; `backend/tests/unit/core/test_log_redaction.py` — `@pytest.mark.ac("NFR-03.1")`.
**Architecture rules:** ARCH-02 (domain never logs).
**Security:** redaction applies to exception tracebacks too.
**Guarding hooks:** `pii-log-guard`.

### TASK-S0-06 — Alembic baseline and append-only migrations

| Field | Value |
|---|---|
| Objective | Alembic setup, baseline revision with the `user` table, and the CI check that existing revisions never change |
| Spec reference | NFR-05 · architecture.md §6 |
| Depends on | TASK-S0-01 |
| Branch | `feature/TASK-S0-06-migrations` |

**Acceptance criteria**
- **NFR-05.1** Given a change to an existing file in `backend/migrations/versions/`, when the hook or CI check runs, then it is rejected.

**Tests to write first:** CI job `migrations-append-only` (diff of `migrations/versions/` against `main`: only added files allowed); hook test already in `.claude/hooks/tests/learnlab-hooks.test.js`.
**Architecture rules:** ARCH-05 (schema groundwork).
**Security:** —
**Guarding hooks:** `attempt-immutability-check`.

### TASK-S0-07 — Seed loader (users) and synthetic-data check

| Field | Value |
|---|---|
| Objective | Idempotent seed loader that runs only on an empty database, loading the users from `specs/seed-data.md` (courses, lessons and quizzes are added to the seed in S1-02, S2-01, S3-02) |
| Spec reference | FR-05 · NFR-10 · specs/seed-data.md |
| Depends on | TASK-S0-04, TASK-S0-06 |
| Branch | `feature/TASK-S0-07-seed` |

**Acceptance criteria**
- **NFR-10.1** Given seed data and fixtures, when scanned, then every email ends in `@example.test`.
- After a clean start, every seeded user can log in (FR-05 Done row, users part).

**Tests to write first:** `backend/tests/unit/test_synthetic_data.py` — `@pytest.mark.ac("NFR-10.1")`.
**Architecture rules:** seed loader lives outside `domain/`.
**Security:** seed password is the documented synthetic `Passw0rd!`; never logged.
**Guarding hooks:** `pii-log-guard`, harness secret scan.

### TASK-S0-08 — GitLab CI, one-command start, login E2E

| Field | Value |
|---|---|
| Objective | `.gitlab-ci.yml` with jobs `lint`, `test-backend` (coverage gate), `test-frontend`, `e2e`, `ac-audit`, `smoke-start`, `migrations-append-only`, `claude-review`; root one-command start; Playwright config at 375 / 1280 px with `e2e/__snapshots__/`; login page |
| Spec reference | NFR-09, NFR-11 · FR-39 (shell) · test-strategy §6, §8 |
| Depends on | TASK-S0-01 – TASK-S0-07 |
| Branch | `feature/TASK-S0-08-ci` |

**Acceptance criteria**
- **NFR-09.1** Given a clean checkout, when the single start command runs, then migrations apply, seed data loads, and both `/health` and the UI respond.
- **NFR-11.1** Given the CI test job, when it finishes, then `coverage.xml` shows ≥ 80% overall and ≥ 90% for `domain/`, otherwise the job fails.
- Login + role routing works in `e2e/login.spec.ts` at both widths.

**Tests to write first:** CI jobs `smoke-start`, `test-backend` (`--cov-fail-under`); `e2e/login.spec.ts`.
**Architecture rules:** all ARCH contracts run in CI.
**Security:** CI uses the synthetic JWT secret; no real credentials in variables.
**Guarding hooks:** harness `pre-bash-gate`.

---

## 3. Sprint 1 — Catalog + Enrolment (`feature/sprint-1-catalog-enrolment`)

### TASK-S1-01 — `CourseStateMachine` domain rule

| Field | Value |
|---|---|
| Objective | Pure `CourseStateMachine.transition(state, action)` over the 12-cell table, raising `InvalidCourseStateException(from_state, action)` |
| Spec reference | AC-08.1, AC-08.2 · CL-1 · DR-02, DR-03 · golden_cases `course_lifecycle` |
| Depends on | TASK-S0-02 |
| Branch | `feature/TASK-S1-01-state-machine` |

**Acceptance criteria**
- **AC-08.1** Given a course in the "from" state that meets CL-3, when the matching action is applied, then the new state equals the "to" state (4 allowed cells).
- **AC-08.2** Given a course in the "from" state, when a forbidden action is applied, then `InvalidCourseStateException` is raised naming the from-state and the action (8 forbidden cells).

**Tests to write first:** `backend/tests/unit/domain/test_course_state_machine.py` — `@pytest.mark.ac("AC-08")`, parametrised from `specs/fixtures/golden_cases.json`.
**Architecture rules:** ARCH-02.
**Security:** —
**Guarding hooks:** harness `layers.js`. Reviewed by `course-state-validator-agent`.

### TASK-S1-02 — Create and edit course details

| Field | Value |
|---|---|
| Objective | `POST /api/courses`, `PATCH /api/courses/{id}`, `GET /api/instructor/courses`, `CourseAuthoringService`, `PublishedContentGuard` (details), `course` table migration, seed courses |
| Spec reference | FR-06, FR-07, FR-11 · AC-02.1 – AC-02.4 · CA-1, CA-2, CA-3, CA-8, CA-10 · DR-01, DR-05 |
| Depends on | TASK-S0-04, TASK-S1-01 |
| Branch | `feature/TASK-S1-02-course-details` |

**Acceptance criteria**
- **AC-02.1** Given an authenticated instructor, when they create "Intro to Python" / "Learn Python basics" / Programming / BEGINNER, then 201, `state = "DRAFT"`, `instructor_id` = caller.
- **AC-02.2** Given an authenticated instructor, when they create a course with a 2-character title or difficulty "EXPERT", then 422 `VALIDATION_ERROR` and no course is created.
- **AC-02.3** Given a learner or admin, when they `POST /api/courses` with valid data, then 403.
- **AC-02.4** Given an owned DRAFT course, when the owner PATCHes difficulty "INTERMEDIATE", then 200 with the new difficulty and state still DRAFT.
- Empty PATCH body → 422 (CA-10).

**Tests to write first:** `backend/tests/unit/domain/test_published_content_guard.py` (details part), `backend/tests/unit/services/test_course_authoring_service.py`, `backend/tests/api/test_course_authoring_api.py` — `@pytest.mark.ac("AC-02")`.
**Architecture rules:** ARCH-01, ARCH-03, ARCH-04.
**Security:** ownership check via `RoleBoundaryPolicy`.
**Guarding hooks:** `course-publish-gate`, `attempt-immutability-check` (new migration only).

### TASK-S1-03 — Catalog browse and search

| Field | Value |
|---|---|
| Objective | `GET /api/catalog/courses` (filters, search, paging, sort), `GET /api/catalog/courses/{id}`, `GET /api/catalog/categories`, `CatalogService` |
| Spec reference | FR-12, FR-13 · CT-1 – CT-5 · CT-AC.1 – CT-AC.3 |
| Depends on | TASK-S1-02 |
| Branch | `feature/TASK-S1-03-catalog` |

**Acceptance criteria**
- **CT-AC.1** Given PUBLISHED "Intro to Python" (Programming, BEGINNER), "Advanced SQL" (Data, ADVANCED) and DRAFT "Rust Basics" (Programming, BEGINNER), when a learner filters `category=programming&difficulty=BEGINNER`, then only "Intro to Python" is returned.
- **CT-AC.2** Given the same courses, when a learner searches `q=sql`, then only "Advanced SQL" is returned.
- **CT-AC.3** Given seeded PUBLISHED courses with no `%` in titles, when a learner searches `q=%`, then no courses are returned.

**Tests to write first:** `backend/tests/unit/services/test_catalog_service.py`, `backend/tests/api/test_catalog_api.py` — `@pytest.mark.ac("AC-10")` and scenario ids in names.
**Architecture rules:** ARCH-03; no SQL percentage maths (ARCH-06).
**Security:** `LIKE` escaping, `q` ≤ 100 chars; non-PUBLISHED courses → 404 in catalog (CT-4).
**Guarding hooks:** `pii-log-guard`.

### TASK-S1-04 — Admin lifecycle transitions with audit

| Field | Value |
|---|---|
| Objective | `POST /api/admin/courses/{id}/publish|unpublish|archive`, publish precondition, `course_state_change` audit, conditional update for concurrency |
| Spec reference | FR-14 – FR-17 · AC-04.1 – AC-04.4, AC-08.3 – AC-08.6 · CL-2 – CL-6 · DR-02 – DR-04, DR-06 |
| Depends on | TASK-S1-01, TASK-S1-02 |
| Branch | `feature/TASK-S1-04-admin-lifecycle` |

**Acceptance criteria**
- **AC-04.1** Given a DRAFT course with 1 module of 2 lessons, when an admin publishes it, then 200, `state = "PUBLISHED"`, and it appears in the catalog. *(Module/lesson rows are created by test fixture until S2-01 ships the endpoints.)*
- **AC-04.2** Given a DRAFT course with no lessons, when an admin publishes it, then 409 `COURSE_NOT_READY` and the state is still DRAFT.
- **AC-04.3** Given a PUBLISHED course, when an admin unpublishes it, then 200, `state = "UNPUBLISHED"`, it is absent from the catalog and its catalog detail returns 404.
- **AC-04.4** Given the owning instructor or a learner, when they call publish, then 403 and the state is unchanged.
- **AC-08.3** Given a DRAFT course, when an admin archives it, then 409 `INVALID_COURSE_STATE` and it is still DRAFT.
- **AC-08.4** Given an ARCHIVED course, when an admin publishes, unpublishes or archives it, then each returns 409 `INVALID_COURSE_STATE`.
- **AC-08.5** Given a DRAFT course, when an admin publishes then unpublishes it, then two `course_state_change` records exist (DRAFT→PUBLISHED, PUBLISHED→UNPUBLISHED) with admin id and timestamp.
- **AC-08.6** Given a ready DRAFT course, when two publish requests are sent concurrently, then exactly one returns 200, the other 409 `INVALID_COURSE_STATE`, and exactly one audit record exists.

**Tests to write first:** `backend/tests/api/test_admin_lifecycle_api.py` — `@pytest.mark.ac("AC-04")`, `@pytest.mark.ac("AC-08")`; `backend/tests/api/test_lifecycle_concurrency.py` — `@pytest.mark.ac("AC-08")`.
**Architecture rules:** ARCH-04, ARCH-05 (`CourseStateChangeRepository` insert-only).
**Security:** admin-only (`require_role(ADMIN)`).
**Guarding hooks:** `attempt-immutability-check` (`course_state_change` repository). Reviewed by `course-state-validator-agent`.

### TASK-S1-05 — Admin course list and ready-to-publish

| Field | Value |
|---|---|
| Objective | `GET /api/admin/courses?state=` with `ready_to_publish`, counts and instructor name |
| Spec reference | FR-18 · AC-10.1 – AC-10.3 · A-5 |
| Depends on | TASK-S1-04 |
| Branch | `feature/TASK-S1-05-admin-courses` |

**Acceptance criteria**
- **AC-10.1** Given seeded DRAFT, PUBLISHED and UNPUBLISHED courses, when an admin lists courses, then all are listed with state and `?state=DRAFT` returns only DRAFT courses.
- **AC-10.2** Given one DRAFT course with lessons and one without, when an admin lists DRAFT courses, then `ready_to_publish` is true for the first and false for the second.
- **AC-10.3** Given a learner or instructor, when they call `GET /api/admin/courses`, then 403.

**Tests to write first:** `backend/tests/api/test_admin_lifecycle_api.py` — `@pytest.mark.ac("AC-10")`; `backend/tests/unit/services/test_catalog_service.py`.
**Architecture rules:** ARCH-04.
**Security:** admin-only.
**Guarding hooks:** —

### TASK-S1-06 — `EnrollmentPolicy` and enrolment API

| Field | Value |
|---|---|
| Objective | Pure `EnrollmentPolicy.check`, `enrollment` table with `UNIQUE (learner_id, course_id)`, insert-only `EnrollmentRepository`, `POST /api/courses/{id}/enrollments`, `GET /api/me/enrollments` |
| Spec reference | FR-19 – FR-22 · AC-01.3 – AC-01.8, AC-04.5 · EN-1 – EN-6 · DR-07 – DR-10 · NFR-02 |
| Depends on | TASK-S1-04 |
| Branch | `feature/TASK-S1-06-enrolment` |

**Acceptance criteria**
- **AC-01.3** Given a logged-in learner and a PUBLISHED course, when they enrol, then 201 and it appears in `GET /api/me/enrollments` with `progress_percent = 0`.
- **AC-01.4** Given a course in DRAFT, UNPUBLISHED or ARCHIVED, when a learner enrols, then 409 `COURSE_NOT_PUBLISHED` and no row exists.
- **AC-01.5** Given an enrolled learner, when they enrol again, then 409 `ALREADY_ENROLLED` and exactly one row exists.
- **AC-01.6** Given a learner not yet enrolled, when 5 enrolment requests are sent concurrently, then exactly one 201, four 409 `ALREADY_ENROLLED`, no 5xx, one row.
- **AC-01.7** Given an enrolled learner, when an admin unpublishes the course, then `GET /api/me/enrollments` still lists it with `course_state = "UNPUBLISHED"`.
- **AC-01.8** Given an instructor or admin, when they call the enrolment endpoint, then 403.
- **AC-04.5** Given a DRAFT, UNPUBLISHED or ARCHIVED course, when a learner tries to enrol, then 409 `COURSE_NOT_PUBLISHED`.
- **NFR-02.1** Given the append-only repositories, when the architecture test inspects them, then none exposes an update or delete method *(enrolment and state change now; completion, snapshot and attempt repositories are added to the same test in S2-03 and S3-03)*.

**Tests to write first:** `backend/tests/unit/domain/test_enrollment_policy.py`, `backend/tests/unit/services/test_enrollment_service.py`, `backend/tests/api/test_enrollment_api.py`, `backend/tests/api/test_enrollment_concurrency.py` — `@pytest.mark.ac("AC-01")` / `("AC-04")`; `backend/tests/architecture/test_append_only_repos.py` — `@pytest.mark.ac("NFR-02.1")`.
**Architecture rules:** ARCH-05, ARCH-02.
**Security:** learners see only their own enrolments (DR-23).
**Guarding hooks:** `attempt-immutability-check` (EnrollmentRepository). Environment-first: WAL + busy timeout, file-based DB for the concurrency test.

### TASK-S1-07 — Catalog, admin and My Learning UI + E2E

| Field | Value |
|---|---|
| Objective | React pages: Catalog (responsive grid, filters), Course detail with Enrol button, Admin Console → Courses (lifecycle buttons), My Learning list |
| Spec reference | FR-39 · catalog_spec §5 · enrollment_spec §5 · UI-AC.2 |
| Depends on | TASK-S1-03 – TASK-S1-06 |
| Branch | `feature/TASK-S1-07-catalog-ui` |

**Acceptance criteria**
- **UI-AC.2** Given a logged-in learner on the Catalog, when they open a course, enrol and open the first lesson, then the journey takes at most 3 page navigations. *(First lesson page is a stub until S2-04.)*
- Admin lifecycle buttons are enabled only for transitions allowed from the current state.

**Tests to write first:** `e2e/catalog.spec.ts`, `e2e/admin-console.spec.ts`, `e2e/learner-enrol.spec.ts` (title prefix `UI-AC.2`); Vitest component tests for Enrol button states.
**Architecture rules:** frontend calls the API only through `frontend/src/api/`.
**Security:** token stored in memory / session storage only; no PII in `console.*`.
**Guarding hooks:** `pii-log-guard`. Evaluated by the harness evaluator through Playwright MCP.

---

## 4. Sprint 2 — Modules, Lessons, Progress (`feature/sprint-2-lessons-progress`)

### TASK-S2-01 — Modules and lessons authoring

| Field | Value |
|---|---|
| Objective | Module and lesson create / edit / delete endpoints, `GET /api/instructor/courses/{id}` outline, `module` and `lesson` tables, `PublishedContentGuard` extended, `video_ref` validation, seed modules and lessons |
| Spec reference | FR-08 – FR-11 · AC-03.1 – AC-03.7 · CA-3 – CA-8 · DR-05 |
| Depends on | TASK-S1-02 |
| Branch | `feature/TASK-S2-01-modules-lessons` |

**Acceptance criteria**
- **AC-03.1** Given an owned DRAFT course with no modules, when the owner adds "Basics" then "Control Flow", then both 201 and positions 1 and 2.
- **AC-03.2** Given a DRAFT course with module "Basics", when the owner adds "Variables" then "Types", then they appear at positions 1 and 2.
- **AC-03.3** Given an owned PUBLISHED course, when the owner adds a module, adds a lesson, edits a lesson or edits details, then each is 409 `CONTENT_LOCKED` and the outline is unchanged.
- **AC-03.4** Given an owned UNPUBLISHED course, when the owner adds a lesson to an existing module, then 201 at the next position.
- **AC-03.5** Given instructor B and a DRAFT course owned by A, when B adds a module, then 403 and the outline is unchanged.
- **AC-03.6** Given an UNPUBLISHED course with one lesson, when the owner deletes it, then 409 `DELETE_NOT_ALLOWED` and it still exists.
- **AC-03.7** Given an owned DRAFT course with a module, when a lesson is added with `video_ref` `javascript:alert(1)` or `http://example.test/v.mp4`, then 422; with `https://video.example.test/v1` it is 201.

**Tests to write first:** `backend/tests/unit/domain/test_published_content_guard.py` (modules, lessons, delete), `backend/tests/unit/services/test_course_authoring_service.py`, `backend/tests/api/test_course_authoring_api.py` — `@pytest.mark.ac("AC-03")`.
**Architecture rules:** ARCH-01, ARCH-03, ARCH-04.
**Security:** XSS — `video_ref` https-only, Markdown rendered without raw HTML (UI in S2-06).
**Guarding hooks:** `course-publish-gate`, `attempt-immutability-check` (new migration only). Reviewed by `course-state-validator-agent`.

### TASK-S2-02 — `ProgressCalculator` domain rule

| Field | Value |
|---|---|
| Objective | Pure `ProgressCalculator.percent`, `band`, `completion_rate` and lesson-order helpers (`next_lesson`, `is_next`) |
| Spec reference | AC-07.2, AC-07.10 · PR-1, PR-4, PR-7, PR-9, PR-10 · DR-14, DR-15 · NFR-01 · golden_cases `progress_percent`, `progress_bands`, `lesson_order` |
| Depends on | TASK-S0-02 |
| Branch | `feature/TASK-S2-02-progress-calculator` |

**Acceptance criteria**
- **AC-07.2** Given `completed` and `total` from a PR-7 row, when `ProgressCalculator.percent` is called, then it returns the table value as an `int` (0/7→0, 1/3→33, 2/3→66, 3/7→42, 7/7→100, 0/0→0).
- **AC-07.10** Given percentages 0, 24, 25, 49, 50, 74, 75, 100, when `band` is called, then `0-24`, `0-24`, `25-49`, `25-49`, `50-74`, `50-74`, `75-100`, `75-100`.
- **NFR-01.1** Given the source of `QuizGrader`, `ProgressCalculator` and the repositories, when the architecture test scans them, then there is no `float`, `/`, `round(`, SQL `AVG(` or `REAL`, and every percentage field in a response model is `int` *(QuizGrader joins the scan in S3-01)*.

**Tests to write first:** `backend/tests/unit/domain/test_progress_calculator.py` — `@pytest.mark.ac("AC-07")`; `backend/tests/unit/domain/test_lesson_order.py`; `backend/tests/architecture/test_no_float_math.py` — `@pytest.mark.ac("NFR-01.1")`.
**Architecture rules:** ARCH-02, ARCH-06.
**Security:** —
**Guarding hooks:** harness `layers.js`. Reviewed by `quiz-grader-agent` (integer maths).

### TASK-S2-03 — Lesson completion, order and snapshots

| Field | Value |
|---|---|
| Objective | `POST /api/lessons/{id}/completion`, `lesson_completion` (unique, insert-only) and `progress_snapshot` (insert-only) tables, `ProgressTrackerService`, `GET /api/enrollments/{id}/progress/history` |
| Spec reference | FR-23 – FR-26, FR-40 · AC-07.1, AC-07.3 – AC-07.8, AC-07.12, AC-07.13 · PR-2 – PR-8, PR-12 · DR-11 – DR-14 |
| Depends on | TASK-S2-01, TASK-S2-02, TASK-S1-06 |
| Branch | `feature/TASK-S2-03-completion` |

**Acceptance criteria**
- **AC-07.1** Given an enrolled learner in a PUBLISHED 4-lesson course, when they complete the first lesson, then 200 with 1 / 4 / 25.
- **AC-07.3** Given lesson 1 of 4 complete, when they complete lesson 3, then 409 `LESSON_OUT_OF_ORDER` and no row for lesson 3.
- **AC-07.4** Given module 1 (A, B) and module 2 (C) with A complete, when they complete C, then 409 `LESSON_OUT_OF_ORDER`; after B, C succeeds.
- **AC-07.5** Given lesson 1 complete, when completed again, then 200 with unchanged progress and one row.
- **AC-07.6** Given 3 of 4 complete, when the 4th is completed, then `progress_percent = 100` and `next_lesson_id = null`.
- **AC-07.7** Given a learner not enrolled, when they complete a lesson, then 403.
- **AC-07.8** Given an enrolled learner on a course an admin unpublished, when they complete the next lesson, then 409 `COURSE_NOT_PUBLISHED` and their earlier progress is still returned.
- **AC-07.12** Given lesson 1 is next, when two completions are sent concurrently, then both 200, no 409 / 5xx, one row.
- **AC-07.13** Given a 4-lesson course, when the learner completes lesson 1, lesson 1 again, then lesson 2, then history returns exactly 2 snapshots: 25 then 50.

**Tests to write first:** `backend/tests/unit/services/test_progress_tracker_service.py`, `backend/tests/api/test_progress_api.py`, `backend/tests/api/test_progress_concurrency.py` — `@pytest.mark.ac("AC-07")`; extend `test_append_only_repos.py` (completion, snapshot) and `test_log_redaction.py` (completion path).
**Architecture rules:** ARCH-05, ARCH-06.
**Security:** enrolment check before any write.
**Guarding hooks:** `attempt-immutability-check` (CompletionRepository, ProgressSnapshotRepository), `pii-log-guard`.

### TASK-S2-04 — Learn view, lesson view, progress read

| Field | Value |
|---|---|
| Objective | `GET /api/courses/{id}/learn`, `GET /api/lessons/{id}` (with `locked`, prev/next), `GET /api/enrollments/{id}/progress`, readable in every course state |
| Spec reference | FR-27 · AC-07.9, AC-07.11 · PR-10, PR-11 · DR-23 · A-11 |
| Depends on | TASK-S2-03 |
| Branch | `feature/TASK-S2-04-learn-view` |

**Acceptance criteria**
- **AC-07.9** Given Ada and Ben enrolled in the same course, when Ben reads Ada's enrolment progress, then 403.
- **AC-07.11** Given 2 of 4 lessons complete and the course then unpublished, when the learner reads the learn view and a lesson, then both 200, every lesson `locked = true`, progress still 50.

**Tests to write first:** `backend/tests/api/test_progress_api.py` — `@pytest.mark.ac("AC-07")`.
**Architecture rules:** ARCH-04.
**Security:** IDOR — ownership via `RoleBoundaryPolicy`; 403 vs 404 rule (app_spec §8.1).
**Guarding hooks:** `pii-log-guard`.

### TASK-S2-05 — Instructor progress bands

| Field | Value |
|---|---|
| Objective | `GET /api/instructor/courses/{id}/progress-bands`, `GET /api/instructor/dashboard`, `AnalyticsService` reusing `ProgressCalculator.band` |
| Spec reference | FR-35, FR-36 · AC-09.1 – AC-09.6 · WB-1 – WB-4 · DR-15, DR-24 |
| Depends on | TASK-S2-02, TASK-S2-03 |
| Branch | `feature/TASK-S2-05-progress-bands` |

**Acceptance criteria**
- **AC-09.1** Given a 4-lesson course owned by A with learners at 0, 25, 50, 75, 100%, when A requests bands, then `enrolled = 5` and `{"0-24": 1, "25-49": 1, "50-74": 1, "75-100": 2}`.
- **AC-09.2** Given 3 learners all at 0%, when the owner requests bands, then `{"0-24": 3, "25-49": 0, "50-74": 0, "75-100": 0}`.
- **AC-09.3** Given no enrolments, when the owner requests bands, then `enrolled = 0` and all bands 0.
- **AC-09.4** Given instructor B and A's course, when B requests bands, then 403.
- **AC-09.5** Given an enrolled learner, when they request bands, then 403.
- **AC-09.6** Given any bands response, when inspected, then it has no learner ids, names, emails or individual percentages.

**Tests to write first:** `backend/tests/unit/services/test_analytics_service.py`, `backend/tests/api/test_workbench_api.py` — `@pytest.mark.ac("AC-09")`.
**Architecture rules:** ARCH-06 (no SQL percentages), ARCH-04.
**Security:** aggregates only (WB-4).
**Guarding hooks:** `pii-log-guard`.

### TASK-S2-06 — NFR-08 boundary tests + authoring / learning / dashboard UI

| Field | Value |
|---|---|
| Objective | `test_nfr08_boundaries.py`; React course editor, learning page (sidebar ✓ / ▶ / 🔒, Markdown without raw HTML, video placeholder), instructor dashboard band cards |
| Spec reference | NFR-08 · AC-09.7 · FR-39 · WB-5 · course-authoring §5, progress-tracker §5, workbench §5 |
| Depends on | TASK-S2-01 – TASK-S2-05 |
| Branch | `feature/TASK-S2-06-boundaries-ui` |

**Acceptance criteria**
- **AC-09.7** Given instructor A with learner attempts in an owned course, when the architecture test checks every INSTRUCTOR-callable route, then none writes to quiz attempts, lesson completions or enrolments.
- **NFR-08.1** The architecture test also asserts the published-content lock (every content-changing service method calls `PublishedContentGuard`) and the learner-isolation rule, referencing AC-03.3 and AC-07.9 (owned by S2-01 and S2-04).
- Editor is read-only with "Ask an admin to unpublish this course before editing." for PUBLISHED / ARCHIVED courses.

**Tests to write first:** `backend/tests/architecture/test_nfr08_boundaries.py` — `@pytest.mark.ac("AC-09")`, `@pytest.mark.ac("NFR-08.1")`; `e2e/instructor-authoring.spec.ts`, `e2e/learner-progress.spec.ts`, `e2e/instructor-dashboard.spec.ts`; Vitest for sidebar markers and read-only editor.
**Architecture rules:** ARCH-04, NFR-08.
**Security:** Markdown rendered with raw HTML disabled; `video_ref` never a link.
**Guarding hooks:** `course-publish-gate`, `pii-log-guard`. Reviewed by `archtest-author-agent`; evaluator via Playwright MCP.

---

## 5. Sprint 3 — Quiz Engine + Workbench (`feature/sprint-3-quiz-workbench`)

### TASK-S3-01 — `QuizGrader` domain rule

| Field | Value |
|---|---|
| Objective | Pure `QuizGrader.grade(questions, answers)` and quiz-structure validation (QZ-2 – QZ-4) |
| Spec reference | AC-05.4 – AC-05.6 · GR-1 – GR-6 · QZ-2 – QZ-4 · DR-16 – DR-18 · NFR-01 · golden_cases `quiz_grading` |
| Depends on | TASK-S0-02 |
| Branch | `feature/TASK-S3-01-quiz-grader` |

**Acceptance criteria**
- **AC-05.4** Given `total` questions with `correct` right, when graded, then `score_percent` equals the GR-4 value as an `int` (0/4→0, 1/3→33, 2/3→66, 3/4→75, 5/7→71, 4/4→100).
- **AC-05.5** Given a 4-question quiz, when only 2 are answered, both correctly, then 50 and the unanswered two are `correct = false`.
- **AC-05.6** Given a fixed set of answers, when graded 100 times, then every result is identical.
- `QuizGrader` added to the ARCH-06 scan (NFR-01.1, owned by S2-02).

**Tests to write first:** `backend/tests/unit/domain/test_quiz_grader.py` — `@pytest.mark.ac("AC-05")` (see the worked example in docs/tdd.md); `backend/tests/unit/domain/test_quiz_structure.py`.
**Architecture rules:** ARCH-02, ARCH-06.
**Security:** —
**Guarding hooks:** harness `layers.js`. Reviewed by `quiz-grader-agent` → `specs/reviews/quiz-grader-review.md`.

### TASK-S3-02 — Quiz authoring with versions

| Field | Value |
|---|---|
| Objective | `PUT` / `GET /api/modules/{id}/quiz`, `quiz` (with `version`), `question`, `option` tables, TRUE_FALSE expansion, seed quizzes |
| Spec reference | FR-28 · AC-05.1, AC-05.2, AC-05.8 · QZ-1 – QZ-7 · DR-05, DR-16 |
| Depends on | TASK-S2-01, TASK-S3-01 |
| Branch | `feature/TASK-S3-02-quiz-authoring` |

**Acceptance criteria**
- **AC-05.1** Given an owned DRAFT course with module "Basics", when the owner PUTs one MCQ (4 options, 1 correct) and one TRUE_FALSE (`correct_answer: true`), then 200 and the TRUE_FALSE question has exactly "True" (correct) and "False".
- **AC-05.2** Given an owned DRAFT course, when an MCQ has 0 correct, 2 correct, 1 option or 7 options, then 422 `VALIDATION_ERROR` and the existing quiz is unchanged.
- **AC-05.8** Given a PUBLISHED course, when its owner replaces a module quiz, then 409 `CONTENT_LOCKED`.

**Tests to write first:** `backend/tests/api/test_quiz_api.py` — `@pytest.mark.ac("AC-05")`; `backend/tests/unit/services/test_quiz_engine_service.py` (version increment).
**Architecture rules:** ARCH-01, ARCH-04.
**Security:** owner only; author view is the only place `is_correct` appears.
**Guarding hooks:** `course-publish-gate` (`replace_quiz`), `attempt-immutability-check` (new migration only).

### TASK-S3-03 — Learner quiz view and attempts

| Field | Value |
|---|---|
| Objective | `GET /api/quizzes/{id}` (no answers), `POST /api/quizzes/{id}/attempts`, `GET /api/quizzes/{id}/attempts`, `quiz_attempt` table (`quiz_version`, `results_json`, server `attempted_at`), insert-only `AttemptRepository` |
| Spec reference | FR-29 – FR-34 · AC-05.3, AC-05.7, AC-06.1 – AC-06.3, AC-06.6, AC-06.7 · AT-1 – AT-7 · GR-5 · DR-19 – DR-21 |
| Depends on | TASK-S3-02, TASK-S1-06 |
| Branch | `feature/TASK-S3-03-attempts` |

**Acceptance criteria**
- **AC-05.3** Given an enrolled learner, when they GET the quiz, then every question and option is present and no `is_correct` key exists at any depth.
- **AC-05.7** Given a quiz, when a learner submits an option id from a different question, then 422 and no attempt row.
- **AC-06.1** Given a 5-question quiz, when three attempts score 40, 80, 60, then all 201 and the history lists three, newest first (by `attempted_at`, then `id`).
- **AC-06.2** Given those attempts, when the learner reads attempts or submits a fourth scoring 20, then `best_score_percent = 80`.
- **AC-06.3** Given an attempt body containing `attempted_at`, when submitted, then the stored timestamp is the server's UTC time.
- **AC-06.6** Given a non-enrolled learner, or an enrolled learner on an UNPUBLISHED course, when they submit, then 403 and 409 `COURSE_NOT_PUBLISHED` respectively.
- **AC-06.7** Given a module quiz with no questions, when an enrolled learner submits, then 409 `QUIZ_EMPTY`.

**Tests to write first:** `backend/tests/api/test_quiz_api.py` — `@pytest.mark.ac("AC-05")`, `("AC-06")`; `backend/tests/unit/services/test_quiz_engine_service.py`; extend `test_append_only_repos.py` (attempts) and `test_log_redaction.py` (attempt path).
**Architecture rules:** ARCH-05, ARCH-06.
**Security:** answers never leak; injectable `Clock`; scores not logged.
**Guarding hooks:** `attempt-immutability-check` (AttemptRepository), `pii-log-guard`.

### TASK-S3-04 — Replace keeps attempts; no score-writing routes

| Field | Value |
|---|---|
| Objective | Prove attempts survive quiz replacement and that no route can change attempts or scores |
| Spec reference | FR-37 · AC-06.4, AC-06.5 · QZ-7, AT-5, AT-6 · A-12 · NFR-08 |
| Depends on | TASK-S3-03 |
| Branch | `feature/TASK-S3-04-attempt-immutability` |

**Acceptance criteria**
- **AC-06.4** Given existing attempts, when the instructor replaces the quiz while UNPUBLISHED, then `version` goes 1 → 2, earlier attempts keep `quiz_version = 1`, `score_percent`, `results_json`, `attempted_at`, and best score still includes them.
- **AC-06.5** Given the route table, when inspected, then there is no PUT / PATCH / DELETE under `/api/quizzes/*/attempts` or any score-writing route, and `AttemptRepository` has no update or delete method.

**Tests to write first:** `backend/tests/unit/services/test_quiz_engine_service.py` — `@pytest.mark.ac("AC-06")`; `backend/tests/architecture/test_nfr08_boundaries.py` — `@pytest.mark.ac("AC-06")`.
**Architecture rules:** ARCH-04, ARCH-05.
**Security:** NFR-08 "instructors cannot grade their own learners".
**Guarding hooks:** `attempt-immutability-check`. Reviewed by `quiz-grader-agent`.

### TASK-S3-05 — Admin analytics

| Field | Value |
|---|---|
| Objective | `GET /api/admin/analytics` with state counts, totals and per-course integer completion rate |
| Spec reference | FR-38 · AC-10.4 – AC-10.6 · WB-6, WB-7 · NFR-01 |
| Depends on | TASK-S2-02, TASK-S1-06 |
| Branch | `feature/TASK-S3-05-admin-analytics` |

**Acceptance criteria**
- **AC-10.4** Given seed data plus one learner who completed every lesson of a course with 4 enrolments, when an admin requests analytics, then 200, `courses_by_state` matches the database, and that course shows 4 / 1 / 25.
- **AC-10.5** Given a course with 3 enrolments and 1 learner at 100%, when analytics are computed, then `completion_rate_percent` is `33` (an `int`).
- **AC-10.6** Given a learner or instructor, when they request analytics, then 403.

**Tests to write first:** `backend/tests/unit/services/test_analytics_service.py`, `backend/tests/api/test_admin_analytics_api.py` — `@pytest.mark.ac("AC-10")`.
**Architecture rules:** ARCH-06 (rate via `ProgressCalculator.completion_rate`, not SQL).
**Security:** admin-only; counts only.
**Guarding hooks:** `pii-log-guard`.

### TASK-S3-06 — Quiz and analytics UI + responsive pass

| Field | Value |
|---|---|
| Objective | Learner quiz page (result panel, retry, history), instructor quiz editor, Admin Console → Analytics, responsive check over every FR-39 screen |
| Spec reference | FR-39 · UI-AC.1 · quiz-engine §5, workbench §5 |
| Depends on | TASK-S3-03 – TASK-S3-05 |
| Branch | `feature/TASK-S3-06-quiz-ui` |

**Acceptance criteria**
- **UI-AC.1** Given each FR-39 screen, when rendered at 375 px and 1280 px, then there is no horizontal scroll and the snapshot matches.
- Learner can take a quiz, see score, retry, and see best score in the UI.

**Tests to write first:** `e2e/learner-quiz.spec.ts`, `e2e/admin-analytics.spec.ts`, `e2e/responsive.spec.ts` (title prefix `UI-AC.1`); Vitest for the result panel.
**Architecture rules:** frontend uses `frontend/src/api/` only.
**Security:** no `console.*` of scores.
**Guarding hooks:** `pii-log-guard`. Evaluated by `design-critic` and the evaluator via Playwright MCP.

---

## 6. Fix loop — `TASK-FIX-01`

| Field | Value |
|---|---|
| Objective | Record one autonomous fix loop: detect → reproduce with a failing tagged test → environment-first root cause → fix → validate → MR (Prompt 13) |
| Spec reference | Re-proves an existing scenario (default: AC-01.6 duplicate enrolment under concurrency, owned by S1-06); test-strategy §9 |
| Depends on | Sprint 3 merged |
| Branch | `feature/TASK-FIX-01-duplicate-enrolment` (rename to the real failure) |

**Done when:** `docs/fix-loops/001-*.md` written; `docs/post-mortems/001-*.md` if the cause was environmental; `docs/knowledge-deposits.md` entry plus `.claude/state/learned-rules.md`; new hook / skill / rule / architecture test if the mistake can recur; MR merged with `--no-ff`.
**Guarding hooks:** whichever hook the knowledge deposit adds or tightens.

---

## 7. Coverage — scenario → task

Every acceptance scenario in the six feature specs and every NFR / UI scenario in app_spec §6.1 is owned by exactly one task.

| Scenario | Task | Scenario | Task | Scenario | Task |
|---|---|---|---|---|---|
| AC-01.1 | S0-04 | AC-04.5 | S1-06 | AC-07.7 | S2-03 |
| AC-01.2 | S0-04 | AC-05.1 | S3-02 | AC-07.8 | S2-03 |
| AC-01.3 | S1-06 | AC-05.2 | S3-02 | AC-07.9 | S2-04 |
| AC-01.4 | S1-06 | AC-05.3 | S3-03 | AC-07.10 | S2-02 |
| AC-01.5 | S1-06 | AC-05.4 | S3-01 | AC-07.11 | S2-04 |
| AC-01.6 | S1-06 | AC-05.5 | S3-01 | AC-07.12 | S2-03 |
| AC-01.7 | S1-06 | AC-05.6 | S3-01 | AC-07.13 | S2-03 |
| AC-01.8 | S1-06 | AC-05.7 | S3-03 | AC-08.1 | S1-01 |
| AC-02.1 | S1-02 | AC-05.8 | S3-02 | AC-08.2 | S1-01 |
| AC-02.2 | S1-02 | AC-06.1 | S3-03 | AC-08.3 | S1-04 |
| AC-02.3 | S1-02 | AC-06.2 | S3-03 | AC-08.4 | S1-04 |
| AC-02.4 | S1-02 | AC-06.3 | S3-03 | AC-08.5 | S1-04 |
| AC-03.1 | S2-01 | AC-06.4 | S3-04 | AC-08.6 | S1-04 |
| AC-03.2 | S2-01 | AC-06.5 | S3-04 | AC-09.1 | S2-05 |
| AC-03.3 | S2-01 | AC-06.6 | S3-03 | AC-09.2 | S2-05 |
| AC-03.4 | S2-01 | AC-06.7 | S3-03 | AC-09.3 | S2-05 |
| AC-03.5 | S2-01 | AC-07.1 | S2-03 | AC-09.4 | S2-05 |
| AC-03.6 | S2-01 | AC-07.2 | S2-02 | AC-09.5 | S2-05 |
| AC-03.7 | S2-01 | AC-07.3 | S2-03 | AC-09.6 | S2-05 |
| AC-04.1 | S1-04 | AC-07.4 | S2-03 | AC-09.7 | S2-06 |
| AC-04.2 | S1-04 | AC-07.5 | S2-03 | AC-10.1 | S1-05 |
| AC-04.3 | S1-04 | AC-07.6 | S2-03 | AC-10.2 | S1-05 |
| AC-04.4 | S1-04 | CT-AC.1 | S1-03 | AC-10.3 | S1-05 |
| CT-AC.2 | S1-03 | CT-AC.3 | S1-03 | AC-10.4 | S3-05 |
| AC-10.5 | S3-05 | AC-10.6 | S3-05 | UI-AC.1 | S3-06 |
| UI-AC.2 | S1-07 | NFR-01.1 | S2-02 | NFR-02.1 | S1-06 |
| NFR-03.1 | S0-05 | NFR-03.2 | S0-03 | NFR-04.1 | S0-04 |
| NFR-05.1 | S0-06 | NFR-06.1 | S0-05 | NFR-07.1 | S0-01 |
| NFR-08.1 | S2-06 | NFR-09.1 | S0-08 | NFR-10.1 | S0-07 |
| NFR-11.1 | S0-08 | | | | |

Totals: 72 AC scenarios + 3 catalog scenarios + 11 NFR scenarios + 2 UI scenarios = **88 scenarios, 88 owned**. Checked by script against the specs (Prompt 09 run, 2026-10-20): no scenario missing.

---

## 8. Harness commands

The same plan can be turned into harness stories. Run these inside Claude Code in the GitLab repository after `/scaffold` (Sprint 0).

| Step | Command | Produces |
|---|---|---|
| 1. BRD grounded in our PRD | `/brd --prd specs/app_spec.md` | `specs/brd/brd.md`, `brd-requirements.json`, grounding gate (no net-new / dropped requirements) |
| 2. Stories | `/spec specs/brd/brd.md` | `specs/stories/epics.md`, stories `E<n>-S<n>`, dependency graph, `features.json` |
| 3. Design | `/design` | `specs/design/*` (must stay consistent with `docs/architecture.md`) |
| 4. Test plan | `/test --plan-only` | Test plan and cases mapped to story ACs |
| 5. Build loop | `/auto` | Generator → evaluator → ratchet, one story group at a time |
| All-in-one | `/build specs/app_spec.md` | Steps 1–5 with human approval gates |
| Later sprints | `/sprint specs/sprints/sprint-<N>-prd.md` | Requirement delta vs the previous sprint, design amendment, then `/auto` |
| Pre-merge | `/gate` | Evaluator + code review + security review + quality card |

`/sprint` needs a PRD file per sprint. Create `specs/sprints/sprint-<N>-prd.md` as an excerpt of `app_spec.md` in the same PRD format (only that sprint's FR / NFR ids, Out of Scope, Acceptance / Done rows), keeping ids unchanged so the delta check can trace them.

### tasks.md vs harness stories

| Aspect | `tasks/tasks.md` | Harness stories |
|---|---|---|
| Purpose | Human-readable plan and cross-reference for the engineer and reviewer | Machine-executable units for the generator / evaluator |
| Ids | `TASK-S<n>-<nn>` | `E<n>-S<n>` (epics of 3–5 stories) |
| Acceptance criteria | All in-scope spec scenarios (up to 9 per task), referenced by AC-NN.x | 3–6 GWT criteria per story with ids `E1-S1-AC1`; larger tasks split into several stories |
| Layer | Vertical slice across layers | One `layer` per story (`Types`, `Config`, `Repository`, `Service`, `API`, `UI`) |
| Dependencies | Task ids | Typed edges (`contract`, `behavior`, …) and dependency groups A, B, C |
| Sizing | Hours in the plan | Story points from the harness rubric; `needs_breakdown` if > 13 |
| Tracking | Git branches and MRs | `features.json` pass/fail state across sessions |
| Source of truth | Specs (both derive from them) | Specs, via the BRD grounding gate |

When the harness generates stories, record the mapping `E<n>-S<n>` → `TASK-…` → AC-NN.x in each sprint contract so the reviewer can trace a story back to this list.
