# api/ — Controllers

Inherits [root CLAUDE.md](../../../../CLAUDE.md) and [backend/CLAUDE.md](../../../CLAUDE.md). Layer 1 of 4 — the HTTP boundary.

## What belongs here

One router per feature: `auth_router`, `catalog_router`, `course_router`, `enrollment_router`, `lesson_progress_router`, `quiz_router`, `instructor_router`, `admin_router`, `health_router`, plus `deps.py` (auth + role guards) and Pydantic request/response models.

## Rules

| Rule | Detail | Id |
|---|---|---|
| Thin handlers | Validate (Pydantic) → check role → call **one** service method → map the result. No business rules. | ARCH-01 |
| Guard every route | Every route except `POST /api/auth/register`, `POST /api/auth/login` and `GET /health` declares `Depends(require_role(...))`. | NFR-04, ARCH-04 |
| No repository imports | Controllers never import `repositories/` or the ORM. | ARCH-03 |
| Integer percentages | Every `*_percent` / `completion_rate_percent` / band count field is typed `int`. | NFR-01, ARCH-06 |
| Hide answers | `QuizLearnerView` has no `is_correct` field at any depth. | AT-7, AC-05.3 |
| Never echo input | The custom validation handler returns field names + messages only, never submitted values. | NFR-03.2, app_spec §8.1 |
| Standard error body | Every error — including framework 404 / 405 / 422 / 500 — is `{"error": {"code", "message"}}`. No stack traces. | app_spec §8.1 |
| Status codes | Use the exact codes in the feature spec's API table (201 on create, 204 on delete). | — |

## Exception → HTTP mapping (one handler, in `main.py` or `api/errors.py`)

| Domain / service exception | HTTP | Code |
|---|---|---|
| `InvalidCourseStateException` | 409 | `INVALID_COURSE_STATE` |
| `CourseNotReadyError` | 409 | `COURSE_NOT_READY` |
| `ContentLockedError` | 409 | `CONTENT_LOCKED` |
| `DeleteNotAllowedError` | 409 | `DELETE_NOT_ALLOWED` |
| `CourseNotPublishedError` | 409 | `COURSE_NOT_PUBLISHED` |
| `AlreadyEnrolledError` | 409 | `ALREADY_ENROLLED` |
| `EmailTakenError` | 409 | `EMAIL_TAKEN` |
| `LessonOutOfOrderError` | 409 | `LESSON_OUT_OF_ORDER` |
| `QuizEmptyError` | 409 | `QUIZ_EMPTY` |
| `AccessDeniedError` (role or ownership) | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| Auth failure / expired token | 401 | `UNAUTHENTICATED` |
| `RequestValidationError` | 422 | `VALIDATION_ERROR` |
| Anything else | 500 | `INTERNAL_ERROR` |

403 vs 404: exists-but-not-yours → 403; does not exist → 404; catalog of a non-PUBLISHED course → 404 (CT-4).

## Don't

- Don't compute percentages, check state transitions or decide ownership here — call the service.
- Don't add a PUT / PATCH / DELETE route on attempts, scores, completions or enrolments (FR-37, AC-06.5).
- Don't log request bodies, emails or scores (`pii-log-guard`).

Specs: [app_spec.md](../../../../specs/app_spec.md) §8, each feature spec §4.
