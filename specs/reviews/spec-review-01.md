# Spec Review 01 — Hostile Architecture Review

| Field | Value |
|---|---|
| Prompt | Prompt 02 — Hostile Architecture Review of the Specifications |
| Scope | `specs/app_spec.md`, the six feature specs, `docs/business-case.md`, `docs/architecture.md`, `CLAUDE.md`, capstone brief BC-AINE-011 |
| Specs modified | None (review only) |
| Date | 2026-10-20 |
| Outcome | 30 findings — 8 High, 12 Medium, 10 Low. Resolved in Prompt 03 (see the resolution log at the end). |

Severity: **High** = an agent could build the wrong thing or a rubric item / NFR could fail; **Medium** = ambiguity an agent would have to guess; **Low** = wording or consistency.

---

## 1. Ambiguous requirements or acceptance criteria

### R-01 · Medium — Best score after a quiz is replaced
- **Problem:** `quiz-engine_spec` QZ-7 keeps earlier attempts when a quiz is replaced, and AT-6 says best score is the maximum over *all* attempts. It is not stated whether attempts against the old questions still count, nor how an old attempt's per-question results stay meaningful once its questions are deleted.
- **Why it matters:** two agents could implement this two ways; an old attempt could show results for questions that no longer exist.
- **Recommended change:** state explicitly that best score is the maximum over all attempts for that quiz, including earlier versions; store each attempt's per-question results (`results_json`) with the attempt so it stays self-contained; add a `quiz_version` integer that increments on every replace and is stored on each attempt.

### R-02 · Medium — Lesson reading on UNPUBLISHED / ARCHIVED courses
- **Problem:** business-case DR-10 and A-11 say enrolled learners keep read access to their history. `progress-tracker_spec` does not say whether `GET /api/courses/{id}/learn` and `GET /api/lessons/{id}` work when the course is no longer PUBLISHED. `catalog_spec` CT-4 returns 404 for such courses in the catalog.
- **Why it matters:** an agent could reuse the catalog's 404 rule and lock enrolled learners out.
- **Recommended change:** in `progress-tracker_spec` add a rule that enrolled learners can read the learn view and lesson content of any course state, with every lesson `locked = true` when the course is not PUBLISHED; add scenario AC-07.11.

### R-03 · Low — Who may browse the catalog
- **Problem:** `app_spec` FR-12/FR-13 say "a learner can list…", while `catalog_spec` §2 allows any authenticated role.
- **Recommended change:** FR-12/FR-13 → "any authenticated user".

### R-04 · Medium — Token lifetime and format unspecified
- **Problem:** FR-02 issues "a bearer token" with no format, lifetime or behaviour on expiry.
- **Why it matters:** expiry tests (FR-03 says "expired") cannot be written without a lifetime.
- **Recommended change:** specify a signed JWT (HS256) with `sub`, `role` and `exp`; 60-minute lifetime; signing secret from an environment variable with a synthetic development default; expired or tampered tokens → 401 `UNAUTHENTICATED`.

## 2. Contradictions between documents

### R-05 · High — The brief requires progress snapshots; the spec forbids them
- **Problem:** brief §6.2 says the Progress Tracker must "compute and **snapshot** course progress for each learner". `progress-tracker_spec` §8 lists "stored progress snapshots" as out of scope.
- **Why it matters:** the reviewer reads the brief; a missing snapshot is a visible gap.
- **Recommended change:** add an append-only `progress_snapshot` record (enrolment, completed, total, percent, timestamp) written on every successful new completion. The computed value stays the source of truth; the snapshot is history. Add FR-40 and scenario AC-07.13.

### R-06 · Medium — Lesson preview permission vs API table
- **Problem:** `progress-tracker_spec` §2 lets the owning instructor read lesson content ("preview"), but §4 restricts `GET /api/lessons/{id}` to enrolled learners.
- **Recommended change:** remove the instructor preview row; instructors already read lesson content through `GET /api/instructor/courses/{id}` (`CourseOutline` includes full `Lesson`).

### R-07 · Low — Admin access to progress bands
- **Problem:** `instructor-workbench_spec` allows ADMIN on `/progress-bands`; `app_spec` FR-35 mentions only instructors.
- **Recommended change:** FR-35 → "the owning instructor or an admin".

### R-08 · Low — What `domain/` may import
- **Problem:** root `CLAUDE.md` says `domain/` imports only the standard library (not even `core`); `architecture.md` ARCH-02 forbids `api`, `services`, `repositories`, `fastapi`, `sqlalchemy` but not `core` or `integrations`.
- **Recommended change:** ARCH-02 → `domain` imports nothing from any other LearnLab package and no third-party package.

## 3. Requirements that cannot be verified automatically

### R-09 · Medium — Product metrics in the business case
- **Problem:** business-case §8.1 targets "author a 3-module course in under 15 minutes" and "find → enrol → first lesson in 3 screens or fewer" are not automatable as written.
- **Recommended change:** label §8.1 as product goals (not merge gates); convert the second into a Playwright check that the journey needs at most 3 page navigations.

### R-10 · Medium — NFR-07 measurement point
- **Problem:** "within 1 second of a successful startup" does not say when the clock starts.
- **Recommended change:** measure from the end of the application's startup (lifespan) to the first `/health` 200; test with the FastAPI test client and a timer; add NFR scenario NFR-07.1.

### R-11 · High — NFRs have no acceptance scenarios
- **Problem:** FRs have "Acceptance / Done" rows but NFR-01 – NFR-10 do not. Several (NFR-03, NFR-05, NFR-06, NFR-09) would have no test.
- **Recommended change:** add `app_spec` §6.1 "NFR acceptance" with one or more verifiable scenarios per NFR and the test that proves it.

## 4. ACs without concrete Given-When-Then scenarios

### R-12 · Low — AC coverage check
- **Problem:** none — every AC-01 … AC-10 has at least one GWT scenario. However FR-39 (responsive UI) has only an "Acceptance / Done" row and no scenario in any feature spec.
- **Recommended change:** add UI scenario UI-AC.1 (each screen renders without horizontal scroll at 375 px and 1280 px) in `app_spec` §6.1.

## 5. Lifecycle states or transitions not covered

### R-13 · High — Concurrent transitions
- **Problem:** two admins publishing the same DRAFT course at once could both read DRAFT and both succeed, writing two DRAFT→PUBLISHED audit records.
- **Recommended change:** add CL-6 — the state change is a conditional update (`… WHERE id = ? AND state = <expected>`); if no row changes, return 409 `INVALID_COURSE_STATE`. Add scenario AC-08.6.

### R-14 · Low — Delete error code is confusing
- **Problem:** deleting a lesson from an UNPUBLISHED (editable) course returns `CONTENT_LOCKED`, which reads as wrong because the course is editable.
- **Recommended change:** keep 409 but use a distinct code `DELETE_NOT_ALLOWED` for deletes outside DRAFT.

## 6. Floating-point or rounding leaks

### R-15 · High — Percentages computed in SQL or in response models
- **Problem:** nothing prevents an agent computing completion rate or progress in SQL (`AVG`, `* 1.0`, `CAST(... AS REAL)`) or declaring a response field as `float`.
- **Recommended change:** add to `app_spec` §8: all percentages are computed only by `ProgressCalculator` / `QuizGrader` in Python; every percentage field in a response model is typed `int`; architecture test ARCH-06 also scans repositories for `AVG(`, `REAL` and `float`.

## 7. Append-only gaps

### R-16 · High — Replacing a quiz deletes the questions attempts point to
- **Problem:** `PUT /api/modules/{id}/quiz` "replaces all questions", which deletes question and option rows referenced by earlier attempts' `answers_json`.
- **Recommended change:** resolved together with R-01: attempts store `results_json` and `quiz_version`, so attempts never depend on question rows that may be replaced.

### R-17 · Medium — Double-submit of a lesson completion
- **Problem:** PR-5 makes a repeat completion idempotent, but two simultaneous requests for the same lesson will make the second insert hit the unique constraint.
- **Recommended change:** PR-6 — a unique-constraint violation on completion returns 200 with current progress (not 500, not 409). Add scenario AC-07.12.

## 8. Role-boundary gaps

### R-18 · Medium — 403 vs 404 for other learners' resources
- **Problem:** the specs mix 403 (another learner's enrolment) and 404 (missing resource) without a rule, so agents will choose inconsistently.
- **Recommended change:** `app_spec` §8.1 rule — a resource that exists but belongs to someone else returns 403; a resource that does not exist returns 404. Accepted trade-off: existence of IDs is revealed (synthetic data only).

### R-19 · Low — Instructors and admins enrolling
- **Problem:** covered (AC-01.8 returns 403) — no gap. Listed for completeness.

## 9. Concurrency and retry risks

### R-20 · High — SQLite "database is locked" under concurrent writes
- **Problem:** AC-01.6 sends 5 concurrent enrolments. SQLite can raise `OperationalError: database is locked`, which would surface as 500 and fail "no response is 5xx".
- **Recommended change:** enrolment spec EN-3 — enable WAL mode and a busy timeout (5 s) on every connection; map `IntegrityError` on the unique key to 409 `ALREADY_ENROLLED`. Record this as an environment-first item in the test strategy.

### R-21 · Medium — Identical timestamps
- **Problem:** `app_spec` FR-31 "Done" requires "three attempt rows with distinct timestamps"; fast successive inserts can share a timestamp.
- **Recommended change:** store timestamps with microsecond precision; order by `attempted_at` then `id`; FR-31 Done → "three attempt rows exist, ordered, none modified". Inject a clock (`core.clock.Clock`) so tests control time.

## 10. PII or performance data reaching logs or responses

### R-22 · High — FastAPI's default 422 echoes submitted values
- **Problem:** FastAPI's default validation error body includes an `input` field containing the submitted value — a rejected registration would echo the password and email back, and request-logging middleware could log it.
- **Recommended change:** `app_spec` §8.1 — a custom validation handler returns `VALIDATION_ERROR` with field names and messages only, never input values; request/response bodies are never logged.

### R-23 · Medium — PII in exception tracebacks
- **Problem:** NFR-03 is tested only at registration. Unhandled exceptions can log local variables or request data.
- **Recommended change:** NFR-03 scenarios cover register, login, attempt submission, lesson completion and an unhandled error; the redaction filter applies to every log handler.

## 11. Error codes and status consistency

### R-24 · Medium — FastAPI defaults vs our error format
- **Problem:** without custom handlers, 404/405/422/500 come back in FastAPI's own shape, not `{"error": {"code", "message"}}`.
- **Recommended change:** `app_spec` §8.1 — all errors, including framework 404, 405, 422 and unhandled 500 (`INTERNAL_ERROR`, no stack trace), use the standard shape; add codes `INTERNAL_ERROR`, `METHOD_NOT_ALLOWED`, `DELETE_NOT_ALLOWED`.

### R-25 · Low — Empty PATCH body
- **Problem:** `PATCH /api/courses/{id}` with `{}` is undefined.
- **Recommended change:** an empty PATCH returns 422 `VALIDATION_ERROR`.

## 12. Security risks not in the specs

### R-26 · High — Stored XSS through lesson content and `video_ref`
- **Problem:** lesson content is Markdown and `video_ref` is "stored as given". Rendering Markdown as raw HTML, or `video_ref` as a link, allows script injection (e.g. `javascript:` URLs).
- **Recommended change:** `course-authoring_spec` CA-6 — `video_ref` must be an `https://` URL or empty; the UI renders Markdown with raw HTML disabled and never renders `video_ref` as a clickable link (placeholder only). Add scenario AC-03.7.

### R-27 · Low — LIKE wildcards in catalog search
- **Problem:** `q=%` or `q=_` would match everything if passed straight into `LIKE`.
- **Recommended change:** CT-2 — escape `%` and `_` in `q`; maximum length 100.

## 13. Capstone rubric coverage gaps

### R-28 · Medium — Coverage targets not stated in the specs
- **Problem:** the business case sets ≥90% domain coverage but no spec or gate states it.
- **Recommended change:** `app_spec` §4 add NFR-11 — backend line coverage ≥ 80% overall and ≥ 90% for `domain/`; report committed as `coverage.xml`.

### R-29 · Low — Seed data and golden cases not yet specified
- **Problem:** FR-05 lists seed counts but no concrete data; there are no golden expected-result fixtures.
- **Recommended change:** create `specs/seed-data.md` and `specs/fixtures/golden_cases.json` (Prompt 05).

### R-30 · Low — Agent permissions not specified
- **Problem:** the rubric requires project agents; their allowed and forbidden actions are not written down.
- **Recommended change:** create `specs/agent-contracts.md` (Prompt 06).

---

## Resolution log

Filled in by Prompt 03.

| Finding | Resolution | Files |
|---|---|---|
| R-01, R-16 | Attempts store `quiz_version` and `results_json`; best score = max over all versions (QZ-7, AT-4, AT-6, AC-06.4) | quiz-engine_spec |
| R-02 | Rule PR-11 + AC-07.11: read access in every state; all lessons locked when not PUBLISHED | progress-tracker_spec |
| R-03 | FR-12/FR-13 → any authenticated user | app_spec |
| R-04 | §8.4 Authentication: JWT HS256, 60 min, env secret | app_spec |
| R-05 | FR-40 + PR-12 + AC-07.13: append-only `progress_snapshot` | app_spec, progress-tracker_spec, architecture |
| R-06 | Instructor preview removed from progress-tracker permissions | progress-tracker_spec |
| R-07 | FR-35 includes admin | app_spec |
| R-08 | ARCH-02 widened | architecture |
| R-09 | §8.1 marked as product goals; journey check added to UI-AC.2 | business-case, app_spec |
| R-10, R-11, R-12, R-23, R-28 | New §6.1 NFR acceptance (NFR-01.1 … NFR-11.1, UI-AC.1, UI-AC.2); NFR-11 added | app_spec |
| R-13 | CL-6 + AC-08.6: conditional state update | catalog_spec |
| R-14 | `DELETE_NOT_ALLOWED` | course-authoring_spec, app_spec |
| R-15 | §8.5 Numeric rules; ARCH-06 extended | app_spec, architecture |
| R-17 | PR-6 + AC-07.12 | progress-tracker_spec |
| R-18, R-22, R-24, R-25 | §8.1 extended: 403/404 rule, validation handler, standard error shape, new codes | app_spec, course-authoring_spec |
| R-20 | EN-3 extended: WAL + busy timeout | enrollment_spec |
| R-21 | Microsecond timestamps, `Clock`, ordering; FR-31 Done reworded | app_spec, quiz-engine_spec |
| R-26 | CA-6 + AC-03.7 | course-authoring_spec |
| R-27 | CT-2 extended | catalog_spec |
| R-29, R-30 | Delivered by Prompts 05 and 06 | — |
| R-19 | No change needed | — |
