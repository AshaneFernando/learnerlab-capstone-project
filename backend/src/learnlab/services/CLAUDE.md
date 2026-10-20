# services/ — Application orchestration

Inherits [root CLAUDE.md](../../../../CLAUDE.md) and [backend/CLAUDE.md](../../../CLAUDE.md). Layer 2 — use cases.

## Services

| Service | Feature spec | Domain rules it calls |
|---|---|---|
| `CourseAuthoringService` | course-authoring_spec | `PublishedContentGuard`, `RoleBoundaryPolicy` |
| `CatalogService` | catalog_spec | `CourseStateMachine` |
| `EnrollmentService` | enrollment_spec | `EnrollmentPolicy` |
| `ProgressTrackerService` | progress-tracker_spec | `ProgressCalculator` |
| `QuizEngineService` | quiz-engine_spec | `QuizGrader`, `PublishedContentGuard` |
| `AnalyticsService` | instructor-workbench_spec | `ProgressCalculator`, `RoleBoundaryPolicy` |

## Rules

| Rule | Detail | Id |
|---|---|---|
| Orchestrate only | Load via repositories → apply the domain rule → persist. The rule itself lives in `domain/`, never here. | ARCH-01 |
| One transaction per use case | A completion and its progress snapshot commit together; a state change and its audit record commit together. | PR-12, CL-5 |
| Ownership | Check ownership with `RoleBoundaryPolicy` (instructor owns course; learner owns enrolment / attempt). Raise `AccessDeniedError` → 403. | DR-22 – DR-26 |
| Content lock | Every content-changing method calls `PublishedContentGuard` before writing. | DR-05, NFR-08 |
| Conditional state change | `UPDATE course SET state=:to WHERE id=:id AND state=:from`; 0 rows → `InvalidCourseStateException`, no audit record. | CL-6, AC-08.6 |
| Duplicate enrolment | `IntegrityError` on (learner, course) → `AlreadyEnrolledError` (409), never 500. | EN-3, AC-01.6 |
| Duplicate completion | `IntegrityError` on (learner, lesson) → return current progress (200), never 409 / 500. | PR-6, AC-07.12 |
| Integrations via interfaces | Depend on `VideoProvider` / `PaymentProvider` Protocols, injected; never import a stub module. | ARCH-07 |
| Time | Use the injected `Clock`. | app_spec §8.6 |

## The `course-publish-gate` hook

In `course_authoring_service.py` and `quiz_engine_service.py`, every public method named `add_*`, `update_*`, `delete_*`, `replace_*`, `edit_*`, `rename_*`, `patch_*` or `set_*` must reference `PublishedContentGuard` in its body, or the write is blocked. `create_course` is exempt (new courses are DRAFT). Name content-changing methods with these prefixes so the hook can see them.

## Don't

- Don't import FastAPI or build HTTP responses.
- Don't compute percentages inline — call `ProgressCalculator` / `QuizGrader`.
- Don't catch broad `Exception`; catch the specific integrity error you expect.
- Don't log learner identifiers together with scores or progress (`pii-log-guard`).

Specs: feature spec §3 (business rules) of each service's spec; [architecture.md](../../../../docs/architecture.md) §3.
