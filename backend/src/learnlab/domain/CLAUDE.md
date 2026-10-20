# domain/ — Pure business rules

Inherits [root CLAUDE.md](../../../../CLAUDE.md) and [backend/CLAUDE.md](../../../CLAUDE.md). Layer 4 — the heart of LearnLab.

## Purity (ARCH-02)

- **Standard library only.** No FastAPI, Pydantic, SQLAlchemy, logging, `core`, `integrations`, `repositories`, `services` or `api` imports.
- No I/O, no clock, no randomness. Callers pass in everything the rule needs (states, counts, answers, timestamps).
- Every function is deterministic: same input → same output (DR-18).

## The six rule files

| File | Owns | Rules | Exact rule |
|---|---|---|---|
| `course_state_machine.py` | `CourseStateMachine.transition(state, action)` | DR-01 – DR-04, DR-06, CL-1 | 4 allowed cells: DRAFT–publish→PUBLISHED, PUBLISHED–unpublish→UNPUBLISHED, UNPUBLISHED–publish→PUBLISHED, UNPUBLISHED–archive→ARCHIVED. Other 8 cells raise `InvalidCourseStateException(from_state, action)`. Publish needs ≥1 module with ≥1 lesson → `CourseNotReadyError`. |
| `published_content_guard.py` | `PublishedContentGuard.ensure_editable(state)`, `ensure_deletable(state)` | DR-05, CA-3, CA-7 | Editable only in DRAFT / UNPUBLISHED (`ContentLockedError`); deletable only in DRAFT (`DeleteNotAllowedError`). |
| `enrollment_policy.py` | `EnrollmentPolicy.check(course_state, already_enrolled)` | DR-07 – DR-10, EN-6 | Not PUBLISHED → `CourseNotPublishedError`; already enrolled → `AlreadyEnrolledError`. |
| `progress_calculator.py` | `percent`, `band`, `next_lesson`, `completion_rate` | DR-11 – DR-15, PR-1 – PR-10, WB-6 | `(completed * 100) // total`, 0 if total = 0. Bands `[0,25)`, `[25,50)`, `[50,75)`, `[75,100]` → `0-24 / 25-49 / 50-74 / 75-100`. Order = module position, then lesson position. |
| `quiz_grader.py` | `QuizGrader.grade(questions, answers)`, question-shape validation | DR-16 – DR-21, QZ-2 – QZ-4, GR-1 – GR-6 | `(correct * 100) // total`; unanswered = wrong; option from another question → `ValidationError`. MCQ 2–6 options, exactly 1 correct; TRUE_FALSE expands to True/False. |
| `role_boundary_policy.py` | `RoleBoundaryPolicy` role and ownership checks | DR-22 – DR-26 | Learner sees only own records; instructor only own courses; nobody but the grader writes scores. Raises `AccessDeniedError`. |

Plus `exceptions.py` (all domain exceptions above) and small value objects (e.g. `GradeResult`).

## Integer maths (NFR-01, ARCH-06)

Never use `float`, true division `/`, `round(`, `math.floor` on a float, or `Decimal`. Use `//` on integers only. `tests/architecture/test_no_float_math.py` scans this folder.

## Tests

Every rule is tested in `backend/tests/unit/domain/test_<file>.py`, parametrised from the spec tables and `specs/fixtures/golden_cases.json` (sections `quiz_grading`, `progress_percent`, `progress_bands`, `course_lifecycle`, `enrollment`, `completion_rate`). Coverage target ≥ 90% (NFR-11).

## Don't

- Don't duplicate a rule in a service or controller — call it from here.
- Don't change a table or formula without a spec change first (Spec-Is-Truth).

Specs: [business-case.md](../../../../docs/business-case.md) §5, [catalog_spec](../../../../specs/catalog_spec.md) §3.1, [progress-tracker_spec](../../../../specs/progress-tracker_spec.md) §3, [quiz-engine_spec](../../../../specs/quiz-engine_spec.md) §3.
