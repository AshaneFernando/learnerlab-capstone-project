# PRD: LearnLab — Lightweight Learning Management System

| Field | Value |
|---|---|
| Spec ID | APP |
| Status | Draft for review |
| Source | [docs/business-case.md](../docs/business-case.md) (DR-xx rules), [docs/architecture.md](../docs/architecture.md) |
| Harness entry | `/brd --prd specs/app_spec.md` |
| Rule | **Spec-is-truth.** If code and this spec disagree, the spec wins. Change the spec deliberately, then regenerate code. |

This is the root specification. It lists every functional requirement (FR-NN) and non-functional requirement (NFR-NN) with a stable ID. The detailed behaviour and Given-When-Then acceptance scenarios live in the feature specs:

| Feature spec | Owns | Sprint |
|---|---|---|
| [course-authoring_spec.md](course-authoring_spec.md) | FR-06 – FR-11 · AC-02, AC-03 | 1–2 |
| [catalog_spec.md](catalog_spec.md) | FR-12 – FR-18 · AC-04, AC-08, AC-10 (catalog part) | 1 |
| [enrollment_spec.md](enrollment_spec.md) | FR-01, FR-19 – FR-22 · AC-01 | 1 |
| [progress-tracker_spec.md](progress-tracker_spec.md) | FR-23 – FR-27, FR-40 · AC-07 | 2 |
| [quiz-engine_spec.md](quiz-engine_spec.md) | FR-28 – FR-34 · AC-05, AC-06 | 3 |
| [instructor-workbench_spec.md](instructor-workbench_spec.md) | FR-35 – FR-38 · AC-09, AC-10 (analytics part) | 2–3 |

Platform requirements (FR-02 – FR-05, FR-39 and all NFRs) are owned by this document and delivered in Sprint 0.

---

## 1. Problem & Goal

An online learning provider needs a small, trustworthy platform for the core learning loop: **publish → enrol → learn → assess → track**. Instructors build courses from modules and lessons, an admin controls what goes live, learners enrol and work through lessons in order, quizzes are marked instantly and consistently, and instructors and admins can see how learners are progressing.

Success means every acceptance criterion AC-01 – AC-10 passes as an automated test, quiz grading is 100% deterministic, duplicate enrolments are impossible, and the whole application starts locally with one command and synthetic seed data.

## 2. Users & Jobs-to-be-done

| Role | Jobs-to-be-done |
|---|---|
| **Learner** | Find a course by category and difficulty; enrol once; complete lessons in order; take quizzes as many times as they like; see their own progress and best scores. |
| **Instructor** | Create a course; structure it into modules and lessons; write quiz questions; see how learners in their own courses are progressing. |
| **Admin** | Publish, unpublish and archive courses; see the whole catalog in every state; monitor enrolment and engagement across the platform. |

Learners self-register. Instructor and admin accounts come from seed data. Each user has exactly one role.

## 3. Functional Requirements

### 3.1 Platform (Sprint 0)

- **FR-01** A visitor can register as a learner with name, email and password. *(see enrollment_spec)*
- **FR-02** A registered user can log in with email and password and receive a bearer token that carries their user ID and role.
- **FR-03** Every endpoint except register, login and health requires a valid token; a request with a missing or invalid token is rejected with 401, and a request from the wrong role is rejected with 403.
- **FR-04** `GET /health` returns 200 with `{"status": "ok"}`.
- **FR-05** On first start, the application applies database migrations and loads synthetic seed data: at least 1 admin, 2 instructors, 5 learners, 4 courses across at least 2 categories and all 3 difficulties (covering DRAFT, PUBLISHED and UNPUBLISHED states), and at least 2 quizzes.

### 3.2 Course authoring — [course-authoring_spec.md](course-authoring_spec.md)

- **FR-06** An instructor can create a course with title, description, category and difficulty; it is created in DRAFT and owned by that instructor.
- **FR-07** An instructor can edit the details of a course they own while it is DRAFT or UNPUBLISHED.
- **FR-08** An instructor can add modules to a course they own while it is DRAFT or UNPUBLISHED; modules are ordered by position.
- **FR-09** An instructor can add lessons to a module of a course they own while it is DRAFT or UNPUBLISHED; lessons are ordered by position within the module.
- **FR-10** Any change to the content of a PUBLISHED or ARCHIVED course is rejected with 409 `CONTENT_LOCKED`.
- **FR-11** An instructor cannot change a course they do not own (403).

### 3.3 Catalog & course lifecycle — [catalog_spec.md](catalog_spec.md)

- **FR-12** Any authenticated user can list PUBLISHED courses, filtered by category and/or difficulty and searched by keyword in the title.
- **FR-13** Any authenticated user can view the outline (modules and lesson titles) of a PUBLISHED course.
- **FR-14** An admin can publish a course that is DRAFT or UNPUBLISHED, provided it has at least one module containing at least one lesson.
- **FR-15** An admin can unpublish a PUBLISHED course.
- **FR-16** An admin can archive an UNPUBLISHED course.
- **FR-17** Any other lifecycle transition raises `InvalidCourseStateException`, is rejected with 409 `INVALID_COURSE_STATE`, and leaves the course state unchanged.
- **FR-18** An admin can list all courses in any state, filtered by state, with an indicator showing whether each DRAFT course is ready to publish.

### 3.4 Enrolment — [enrollment_spec.md](enrollment_spec.md)

- **FR-19** A learner can enrol in a PUBLISHED course.
- **FR-20** A learner who is already enrolled in a course cannot enrol again (409 `ALREADY_ENROLLED`); repeated or concurrent requests produce exactly one enrolment record.
- **FR-21** Enrolment in a course that is not PUBLISHED is rejected with 409 `COURSE_NOT_PUBLISHED`.
- **FR-22** A learner can list their own enrolments with each course's current progress percentage.

### 3.5 Progress tracking — [progress-tracker_spec.md](progress-tracker_spec.md)

- **FR-23** An enrolled learner can mark a lesson complete in a PUBLISHED course.
- **FR-24** A learner can only complete the next lesson in course order (module position, then lesson position); any other lesson is rejected with 409 `LESSON_OUT_OF_ORDER`.
- **FR-25** Marking an already-completed lesson complete again succeeds (200) and creates no new record.
- **FR-26** Course progress is `completed_lessons × 100 ÷ total_lessons` using integer division; a course with no lessons is 0%.
- **FR-27** A learner can view their own progress for an enrolled course; viewing another learner's progress is rejected with 403.
- **FR-40** Every successful new lesson completion appends a progress snapshot (enrolment, completed lessons, total lessons, progress percent, timestamp); snapshots are never updated or deleted.

### 3.6 Quiz engine — [quiz-engine_spec.md](quiz-engine_spec.md)

- **FR-28** An instructor can define one quiz per module, made of MCQ questions (2–6 options, exactly one correct) and TRUE/FALSE questions, while the course is DRAFT or UNPUBLISHED.
- **FR-29** An enrolled learner can retrieve a quiz; the response never reveals which option is correct.
- **FR-30** An enrolled learner can submit answers to a quiz in a PUBLISHED course and immediately receives an integer score, their best score, and whether each question was answered correctly.
- **FR-31** A learner may attempt a quiz any number of times; each attempt is stored with a timestamp and is never updated or deleted.
- **FR-32** A learner's recorded result for a quiz is the highest score across all their attempts.
- **FR-33** A learner can list their own attempts for a quiz, newest first.
- **FR-34** A learner who is not enrolled cannot retrieve or attempt the quiz (403); a quiz with no questions cannot be attempted (409 `QUIZ_EMPTY`).

### 3.7 Instructor workbench & admin analytics — [instructor-workbench_spec.md](instructor-workbench_spec.md)

- **FR-35** The owning instructor, or an admin, can view for a course the number of enrolled learners and the number of learners in each progress band: 0–24%, 25–49%, 50–74%, 75–100%.
- **FR-36** An instructor cannot view workbench data for a course they do not own (403).
- **FR-37** No endpoint lets any user create, change or delete a quiz attempt or score other than by submitting an attempt as the learner.
- **FR-38** An admin can view platform analytics: course count by state, total learners, total enrolments, and per course the number of enrolments, number of learners at 100%, and completion rate as an integer percentage.

### 3.8 Frontend

- **FR-39** The web UI provides these screens, each usable at 375 px (mobile) and 1280 px (desktop) widths: Login/Register, Catalog, Course detail, Lesson, Quiz, My Learning, Instructor Workbench, Admin Console.

## 4. Non-Functional Requirements

- **NFR-01** Quiz scores and progress percentages are computed with integer arithmetic only; no floating-point values are used in these calculations.
- **NFR-02** Quiz attempts, lesson completions and enrolments are append-only: no code path updates or deletes these records.
- **NFR-03** Learner PII (email, phone) and performance data (scores, progress) never appear in logs in plaintext.
- **NFR-04** Authentication and role checks are enforced at the controller layer; learner, instructor and admin permissions are separate.
- **NFR-05** Database migrations are append-only: an existing migration file is never modified.
- **NFR-06** All logs are structured JSON and include a request correlation ID (`X-Correlation-ID`, generated if absent and returned on every response).
- **NFR-07** `GET /health` returns 200 within 1 second of a successful startup.
- **NFR-08** These rules are enforced by automated architecture tests: an instructor cannot grade or change grades of learners in their own courses; a learner cannot access another learner's progress; a published course cannot be changed without first being unpublished.
- **NFR-09** The application starts locally with one command (migrations, seed data, API and UI) on a clean checkout.
- **NFR-10** Only synthetic data is used anywhere in code, seed data, tests and fixtures.
- **NFR-11** Backend line coverage is at least 80% overall and at least 90% for `domain/`; the report is committed as `backend/coverage.xml`. Frontend coverage is committed as `frontend/coverage/lcov.info`.

## 5. Out of Scope

These are forbidden actions for this release. Agents must not build them.

- Real video streaming, CDN or media upload — lessons hold text and an optional placeholder video reference from a stub `VideoProvider`.
- Real payment gateway or paid courses — a stub `PaymentProvider` treats every course as free.
- Live virtual classes (WebRTC), proctoring or anti-cheat.
- Certificate generation or external verification.
- Instructor or admin self-registration, password reset, SSO or external identity providers.
- Reordering or deleting modules and lessons after a course has been published once.
- Production deployment, secret management, multi-region hosting.
- Use of any real or customer data.

## 6. Acceptance / Done

One observable postcondition per functional requirement. Detailed scenarios are in the feature specs.

| FR | Done when |
|---|---|
| FR-01 | `POST /api/auth/register` with valid data returns 201 and a user with role LEARNER exists |
| FR-02 | `POST /api/auth/login` with valid credentials returns 200 and a token; `GET /api/auth/me` with it returns the user's role |
| FR-03 | A protected endpoint returns 401 without a token and 403 with a token of the wrong role |
| FR-04 | `GET /health` returns 200 `{"status":"ok"}` |
| FR-05 | After a clean start, the catalog returns at least one PUBLISHED course and seeded users can log in |
| FR-06 | `POST /api/courses` returns 201 with `state = "DRAFT"` and `instructor_id` = caller |
| FR-07 | `PATCH /api/courses/{id}` on an owned DRAFT course returns 200 with the new values |
| FR-08 | `POST /api/courses/{id}/modules` returns 201 and the module appears in the outline at the next position |
| FR-09 | `POST /api/modules/{id}/lessons` returns 201 and the lesson appears in the module at the next position |
| FR-10 | Any content-change request on a PUBLISHED course returns 409 `CONTENT_LOCKED` and nothing changes |
| FR-11 | A content-change request on another instructor's course returns 403 |
| FR-12 | `GET /api/catalog/courses?category=X&difficulty=Y` returns only PUBLISHED courses matching both filters |
| FR-13 | `GET /api/catalog/courses/{id}` returns modules and lesson titles in order for a PUBLISHED course, and 404 otherwise |
| FR-14 | `POST /api/admin/courses/{id}/publish` returns 200 with `state = "PUBLISHED"`; returns 409 `COURSE_NOT_READY` if it has no lessons |
| FR-15 | `POST /api/admin/courses/{id}/unpublish` on a PUBLISHED course returns 200 with `state = "UNPUBLISHED"` |
| FR-16 | `POST /api/admin/courses/{id}/archive` on an UNPUBLISHED course returns 200 with `state = "ARCHIVED"` |
| FR-17 | Archiving a DRAFT course returns 409 `INVALID_COURSE_STATE` and the course is still DRAFT |
| FR-18 | `GET /api/admin/courses?state=DRAFT` returns only DRAFT courses, each with a `ready_to_publish` boolean |
| FR-19 | `POST /api/courses/{id}/enrollments` on a PUBLISHED course returns 201 |
| FR-20 | Two enrolment requests for the same learner and course give one 201 and one 409, and exactly one enrolment row exists |
| FR-21 | Enrolling in a DRAFT course returns 409 `COURSE_NOT_PUBLISHED` |
| FR-22 | `GET /api/me/enrollments` lists only the caller's enrolments, each with an integer `progress_percent` |
| FR-23 | `POST /api/lessons/{id}/completion` for the next lesson returns 200 with updated `progress_percent` |
| FR-24 | Completing a lesson out of order returns 409 `LESSON_OUT_OF_ORDER` and no completion row is created |
| FR-25 | Completing the same lesson twice returns 200 both times and exactly one completion row exists |
| FR-26 | With 3 of 7 lessons complete, `progress_percent` is 42 |
| FR-27 | `GET /api/enrollments/{id}/progress` for another learner's enrolment returns 403 |
| FR-28 | `PUT /api/modules/{id}/quiz` with valid questions returns 200; an MCQ with two correct options returns 422 |
| FR-29 | `GET /api/quizzes/{id}` returns questions and options with no `is_correct` field anywhere |
| FR-30 | `POST /api/quizzes/{id}/attempts` returns 201 with integer `score_percent`, `best_score_percent` and per-question `correct` flags |
| FR-31 | After three submissions, three attempt rows exist, ordered by `attempted_at` then `id`, and none has been modified |
| FR-32 | Attempts scoring 40, 80, 60 give `best_score_percent = 80` |
| FR-33 | `GET /api/quizzes/{id}/attempts` returns only the caller's attempts, newest first |
| FR-34 | A non-enrolled learner gets 403 on quiz retrieval and submission; attempting a quiz with no questions returns 409 `QUIZ_EMPTY` |
| FR-35 | `GET /api/instructor/courses/{id}/progress-bands` returns `enrolled` and four band counts that add up to `enrolled` |
| FR-36 | The same request for another instructor's course returns 403 |
| FR-37 | The route table contains no PUT, PATCH or DELETE route on attempts or scores (architecture test) |
| FR-38 | `GET /api/admin/analytics` returns state counts, totals, and per-course integer completion rates |
| FR-39 | Playwright tests pass for each listed screen at 375 px and 1280 px, with committed snapshots |
| FR-40 | After completing 2 lessons, 2 `progress_snapshot` rows exist for the enrolment with percents matching `ProgressCalculator`; a repeat completion adds none |

### 6.1 NFR and UI acceptance

| ID | Given / When / Then | Proven by |
|---|---|---|
| NFR-01.1 | **Given** the source of `QuizGrader`, `ProgressCalculator` and the repositories **When** the architecture test scans them **Then** there is no `float`, true division `/`, `round(`, SQL `AVG(` or `REAL` cast, and every percentage field in a response model is typed `int` | `backend/tests/architecture/test_no_float_math.py` |
| NFR-02.1 | **Given** the enrolment, completion, attempt, snapshot and state-change repositories **When** the architecture test inspects them **Then** none exposes an update or delete method | `backend/tests/architecture/test_append_only_repos.py` |
| NFR-03.1 | **Given** log capture is on **When** a learner registers, logs in, submits a quiz attempt, completes a lesson, and a request triggers an unhandled error **Then** no captured log line contains the email, phone, password, score or progress value | `backend/tests/unit/core/test_log_redaction.py` |
| NFR-03.2 | **Given** a registration with an invalid password **When** the API returns 422 **Then** the body names the field but contains neither the submitted password nor the email | `backend/tests/api/test_error_format.py` |
| NFR-04.1 | **Given** the route table **When** the architecture test inspects it **Then** every route except register, login and health depends on an auth guard | `backend/tests/architecture/test_route_guards.py` |
| NFR-05.1 | **Given** a change to an existing file in `backend/migrations/versions/` **When** the hook or CI check runs **Then** it is rejected | hook `attempt-immutability-check` + CI job `migrations-append-only` |
| NFR-06.1 | **Given** a request without `X-Correlation-ID` **When** it is handled **Then** the response carries a generated `X-Correlation-ID` and every log line for that request is JSON containing the same id; a supplied id is echoed back unchanged | `backend/tests/api/test_correlation_id.py` |
| NFR-07.1 | **Given** the application has completed startup **When** `GET /health` is called **Then** it returns 200 in under 1 second | `backend/tests/api/test_health.py` |
| NFR-08.1 | See AC-06.5, AC-07.9, AC-09.7 and AC-03.3 | `backend/tests/architecture/test_nfr08_boundaries.py` |
| NFR-09.1 | **Given** a clean checkout **When** the single start command runs **Then** migrations apply, seed data loads, and both `/health` and the UI respond | CI job `smoke-start` |
| NFR-10.1 | **Given** seed data and fixtures **When** scanned **Then** every email ends in `@example.test` | `backend/tests/unit/test_synthetic_data.py` |
| NFR-11.1 | **Given** the CI test job **When** it finishes **Then** `coverage.xml` shows ≥ 80% overall and ≥ 90% for `domain/`, otherwise the job fails | CI job `test-backend` (`--cov-fail-under`) |
| UI-AC.1 | **Given** each screen listed in FR-39 **When** rendered at 375 px and 1280 px **Then** there is no horizontal scroll and the snapshot matches | `e2e/responsive.spec.ts` |
| UI-AC.2 | **Given** a logged-in learner on the Catalog **When** they open a course, enrol and open the first lesson **Then** the journey takes at most 3 page navigations | `e2e/learner-enrol.spec.ts` |

## 7. Acceptance criteria (AC-NN)

These are the brief's acceptance criteria. Every AC has at least one automated test tagged with its ID (`@pytest.mark.ac("AC-NN")` for backend tests, `AC-NN` in the test title for Vitest and Playwright).

| AC | Criterion | FRs | Detailed in |
|---|---|---|---|
| AC-01 | Learner can register and enrol in any PUBLISHED course; a learner cannot enrol twice in the same course | FR-01, FR-19 – FR-21 | enrollment_spec |
| AC-02 | Instructor can create a course with title, description, category and difficulty; courses start in DRAFT | FR-06, FR-07 | course-authoring_spec |
| AC-03 | Instructor can add modules and nested lessons to a draft course (course → modules → lessons) | FR-08 – FR-11 | course-authoring_spec |
| AC-04 | Admin can publish (DRAFT → PUBLISHED) or unpublish (PUBLISHED → UNPUBLISHED) a course; learners can enrol only in PUBLISHED courses | FR-14, FR-15, FR-21 | catalog_spec |
| AC-05 | Quiz supports MCQ (single correct) and TRUE/FALSE; quizzes are auto-graded by a deterministic rule | FR-28 – FR-30 | quiz-engine_spec |
| AC-06 | Learner can attempt a quiz multiple times; best score is recorded; each attempt is timestamped and append-only | FR-31 – FR-33 | quiz-engine_spec |
| AC-07 | Learner can mark a lesson complete; course progress = completed_lessons / total_lessons | FR-23 – FR-27, FR-40 | progress-tracker_spec |
| AC-08 | Lifecycle DRAFT → PUBLISHED → UNPUBLISHED → ARCHIVED is enforced; invalid transitions raise `InvalidCourseStateException` | FR-14 – FR-17 | catalog_spec |
| AC-09 | Instructor can view learner progress aggregated by course in bands 0–25%, 25–50%, 50–75%, 75–100% | FR-35, FR-36 | instructor-workbench_spec |
| AC-10 | Admin can manage the catalog, approve published courses and monitor enrolment analytics | FR-12, FR-18, FR-38 | catalog_spec, instructor-workbench_spec |

## 8. Shared conventions

### 8.1 API

- Base path `/api`, JSON request and response bodies, `snake_case` field names.
- Authentication: `Authorization: Bearer <token>`.
- Every response includes `X-Correlation-ID`.
- Error body for every 4xx/5xx:

  ```json
  { "error": { "code": "ALREADY_ENROLLED", "message": "Learner is already enrolled in this course." } }
  ```

| HTTP | Code | Used when |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired token; wrong login credentials |
| 403 | `FORBIDDEN` | Wrong role, or the caller does not own the resource |
| 404 | `NOT_FOUND` | Resource does not exist, or a non-published course requested from the catalog |
| 409 | `INVALID_COURSE_STATE` | Lifecycle transition not allowed |
| 409 | `COURSE_NOT_READY` | Publishing a course with no lessons |
| 409 | `CONTENT_LOCKED` | Changing content of a PUBLISHED or ARCHIVED course |
| 409 | `COURSE_NOT_PUBLISHED` | Enrolling, completing a lesson or attempting a quiz on a non-PUBLISHED course |
| 409 | `ALREADY_ENROLLED` | Duplicate enrolment |
| 409 | `EMAIL_TAKEN` | Registering with an email that already exists |
| 409 | `LESSON_OUT_OF_ORDER` | Completing a lesson that is not the next one |
| 409 | `QUIZ_EMPTY` | Attempting a quiz with no questions |
| 409 | `DELETE_NOT_ALLOWED` | Deleting a module or lesson when the course is not DRAFT |
| 405 | `METHOD_NOT_ALLOWED` | HTTP method not supported on the path |
| 422 | `VALIDATION_ERROR` | Request body or query fails validation (including an empty PATCH body) |
| 500 | `INTERNAL_ERROR` | Unhandled error — generic message, no stack trace, no request data |

**Error rules**

- Every error, including framework-generated 404, 405 and 422 and any unhandled 500, uses the error body above. No FastAPI default error shape is ever returned.
- `VALIDATION_ERROR` bodies list field names and messages only: `{"error": {"code": "VALIDATION_ERROR", "message": "...", "fields": [{"field": "password", "message": "..."}]}}`. Submitted values are **never** echoed back.
- **403 vs 404:** a resource that exists but belongs to someone else, or that the caller's role may not access, returns 403. A resource that does not exist returns 404. Exception: the public catalog returns 404 for courses that are not PUBLISHED (catalog_spec CT-4).
- Request and response bodies are never logged.

### 8.2 Enumerations

| Name | Values |
|---|---|
| Role | `LEARNER`, `INSTRUCTOR`, `ADMIN` |
| Course state | `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED` |
| Difficulty | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| Category | Free text, 2–50 characters (seed data uses e.g. `Programming`, `Data`, `Design`, `Business`) |
| Question type | `MCQ`, `TRUE_FALSE` |
| Progress band | `0-24`, `25-49`, `50-74`, `75-100` |

### 8.3 Progress bands

The brief writes the bands as 0–25%, 25–50%, 50–75%, 75–100%, which overlap at the boundaries. LearnLab uses half-open ranges so every learner is in exactly one band: **[0, 25)**, **[25, 50)**, **[50, 75)**, **[75, 100]**. A learner at exactly 25% is in the `25-49` band.

### 8.4 Authentication

- Tokens are signed JWTs (HS256) with claims `sub` (user id), `role` and `exp`.
- Lifetime: 60 minutes. No refresh tokens.
- The signing secret comes from the `LEARNLAB_JWT_SECRET` environment variable; a clearly marked synthetic development default is used when it is unset.
- Expired, tampered or malformed tokens return 401 `UNAUTHENTICATED`.
- Passwords are hashed with bcrypt.

### 8.5 Numeric rules

- Every percentage (score, progress, completion rate) is computed in Python by `QuizGrader` or `ProgressCalculator` using `(n × 100) // total`, never in SQL and never with `float`, `/` or `round()`.
- Every percentage field in a Pydantic response model is typed `int`.

### 8.6 Time

- All timestamps are UTC, stored with microsecond precision, and generated by the server through an injectable `Clock` (`core/clock.py`) so tests can control time.
- Client-supplied timestamps are ignored.
- Lists ordered by time use the timestamp then `id` as a tie-breaker.

## 9. Assumptions

These come from [business-case.md §9](../docs/business-case.md) and are binding for this spec.

| # | Assumption |
|---|---|
| A-1 | UNPUBLISHED → PUBLISHED (republish) is allowed. |
| A-2 | "Instructors cannot grade their own courses' learners" means no user except the quiz engine can create or change a score. |
| A-3 | One optional quiz per module, authored by the course owner. |
| A-4 | Lessons are completed in order across the whole course. |
| A-5 | An admin publishing a course is the approval step. |
| A-6 | Email + password login with role-scoped tokens; instructors and admins are seeded. |
| A-7 | Video is a stub placeholder reference. |
| A-8 | Payments are a stub; every course is free. |
| A-9 | Quizzes do not count towards course progress; progress is based on lessons only. |
| A-10 | A learner can attempt a module's quiz at any time while enrolled in a PUBLISHED course; finishing the module's lessons first is not required. |
| A-11 | While a course is UNPUBLISHED or ARCHIVED, enrolled learners can still view their progress, attempts and lesson content but cannot complete lessons or attempt quizzes. |
| A-12 | When a quiz is replaced, earlier attempts keep their own scores and per-question results; best score is the maximum over attempts on every version of the quiz. |
