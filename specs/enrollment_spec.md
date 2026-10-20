# Feature Spec: Registration & Enrolment

| Field | Value |
|---|---|
| Spec ID | ENROLL |
| Parent | [app_spec.md](app_spec.md) |
| Requirements | FR-01, FR-19 – FR-22 |
| Acceptance criteria | AC-01 |
| Domain rules | DR-07 – DR-10 (business-case §5.2) |
| Service | `EnrollmentService` (enrolment), auth service in `core/` (registration) |
| Domain files | `EnrollmentPolicy`, `RoleBoundaryPolicy` |
| Sprint | 0 (registration) · 1 (enrolment) |

## 1. Purpose

Let a visitor become a learner and join any live course — exactly once. Enrolment is the gate to lessons and quizzes, so it must be correct even when requests are retried or arrive at the same time.

## 2. Actors and permissions

| Action | Visitor | Learner | Instructor | Admin |
|---|---|---|---|---|
| Register | ✅ | — | — | — |
| Enrol in a course | 401 | ✅ | 403 | 403 |
| List own enrolments | 401 | ✅ | 403 | 403 |

## 3. Business rules

### 3.1 Registration

| ID | Rule |
|---|---|
| RG-1 | Required fields: `name` (2–80 characters), `email` (valid format, stored lower-case), `password` (8–72 characters, at least one letter and one digit). Optional: `phone`. |
| RG-2 | Email must be unique (case-insensitive); a duplicate returns 409 `EMAIL_TAKEN`. |
| RG-3 | Self-registered users always get role `LEARNER`; a `role` field in the request is ignored. |
| RG-4 | Passwords are stored only as a salted hash (bcrypt). The password, email and phone are never logged (NFR-03). |
| RG-5 | The response never contains the password or its hash. |

### 3.2 Enrolment (`EnrollmentPolicy`)

| ID | Rule | Source |
|---|---|---|
| EN-1 | A learner may enrol only in a PUBLISHED course; otherwise 409 `COURSE_NOT_PUBLISHED`. | DR-07 |
| EN-2 | At most one enrolment per (learner, course). A second request returns 409 `ALREADY_ENROLLED`. | DR-08 |
| EN-3 | Uniqueness is guaranteed by a database `UNIQUE (learner_id, course_id)` constraint, not only by a check before inserting. If the insert hits the constraint, the service returns 409 `ALREADY_ENROLLED` — never a 500. Every SQLite connection enables WAL mode and a 5-second busy timeout so concurrent writers wait instead of failing with "database is locked". | DR-08, spec-review R-20 |
| EN-4 | Enrolment records are insert-only; there is no un-enrol in this release. | DR-09 |
| EN-5 | Unpublishing or archiving a course keeps existing enrolments; they appear in the learner's list with the course's current state. | DR-10 |
| EN-6 | `EnrollmentPolicy.check(course_state, already_enrolled)` is a pure function returning *allowed* or the specific rejection reason. | — |

## 4. API contract

| Method | Path | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | public | `{name, email, password, phone?}` | 201 `User` | 409 `EMAIL_TAKEN`, 422 |
| POST | `/api/auth/login` | public | `{email, password}` | 200 `{access_token, token_type, user: User}` | 401 |
| GET | `/api/auth/me` | any authenticated | — | 200 `User` | 401 |
| POST | `/api/courses/{course_id}/enrollments` | LEARNER | — | 201 `Enrollment` | 403, 404, 409 `COURSE_NOT_PUBLISHED` / `ALREADY_ENROLLED` |
| GET | `/api/me/enrollments` | LEARNER | — | 200 `EnrollmentSummary[]` | 403 |

```text
User               { id, name, email, role }
Enrollment         { id, learner_id, course_id, enrolled_at }
EnrollmentSummary  { enrollment_id, course_id, course_title, course_state, enrolled_at, progress_percent }
```

`progress_percent` is computed by `ProgressCalculator` (see [progress-tracker_spec.md](progress-tracker_spec.md)).

## 5. UI

- **Register / Login page:** simple forms with field-level validation messages; after login, users are routed by role (learner → My Learning, instructor → Workbench, admin → Admin Console).
- **Catalog / Course detail:** "Enrol" button; after success it becomes "Go to course". If the learner is already enrolled, the button shows "Enrolled".
- **My Learning:** list of enrolled courses with a progress bar and percentage; courses that are no longer PUBLISHED show a "No longer available for new activity" label.

## 6. Acceptance criteria

### AC-01 — Learner registers and enrols once in a PUBLISHED course

**AC-01.1 Register as a learner**
- **Given** no user with email `ada@example.test`
- **When** a visitor calls `POST /api/auth/register` with name "Ada Lovelace", that email and password "Passw0rd!"
- **Then** the response is 201 with `role = "LEARNER"`, and the body contains no `password` or `password_hash` field

**AC-01.2 Duplicate email rejected**
- **Given** a user with email `ada@example.test`
- **When** a visitor registers with `ADA@example.test`
- **Then** the response is 409 `EMAIL_TAKEN`

**AC-01.3 Enrol in a PUBLISHED course**
- **Given** a logged-in learner and a PUBLISHED course they are not enrolled in
- **When** they call `POST /api/courses/{id}/enrollments`
- **Then** the response is 201 and the course appears in `GET /api/me/enrollments` with `progress_percent = 0`

**AC-01.4 Cannot enrol in a non-PUBLISHED course** (parametrised: DRAFT, UNPUBLISHED, ARCHIVED)
- **Given** a course in that state
- **When** a learner tries to enrol
- **Then** the response is 409 `COURSE_NOT_PUBLISHED` and no enrolment row exists

**AC-01.5 Cannot enrol twice**
- **Given** a learner already enrolled in a PUBLISHED course
- **When** they enrol again
- **Then** the response is 409 `ALREADY_ENROLLED` and exactly one enrolment row exists for that pair

**AC-01.6 Retries and concurrent requests create one enrolment**
- **Given** a learner not yet enrolled in a PUBLISHED course
- **When** 5 enrolment requests for the same pair are sent concurrently
- **Then** exactly one response is 201, the other four are 409 `ALREADY_ENROLLED`, no response is 5xx, and exactly one enrolment row exists

**AC-01.7 Enrolments survive unpublishing**
- **Given** a learner enrolled in a PUBLISHED course
- **When** an admin unpublishes the course
- **Then** `GET /api/me/enrollments` still lists it with `course_state = "UNPUBLISHED"`

**AC-01.8 Only learners can enrol**
- **Given** an instructor or admin
- **When** they call the enrolment endpoint
- **Then** the response is 403

## 7. Non-functional

- NFR-02: `EnrollmentRepository` exposes `add` and read methods only (architecture test).
- NFR-03: a log-capture test registers a user and asserts the email, phone and password do not appear in any log line (app_spec NFR-03.1).
- NFR-03.2: a 422 on registration names the failing field but never echoes the submitted password or email.

## 8. Out of scope

- Un-enrolling, waitlists, enrolment caps, paid enrolment (the stub `PaymentProvider` always returns "free").
- Email verification and password reset.

## 9. Test traceability

| Test file | Covers |
|---|---|
| `backend/tests/unit/domain/test_enrollment_policy.py` | EN-1, EN-2, EN-6 · AC-01.4, AC-01.5 |
| `backend/tests/unit/services/test_enrollment_service.py` | EN-3, EN-5 · AC-01.5, AC-01.7 |
| `backend/tests/api/test_auth_api.py` | RG-1 – RG-5 · AC-01.1, AC-01.2 |
| `backend/tests/api/test_enrollment_api.py` | AC-01.3 – AC-01.8 |
| `backend/tests/api/test_enrollment_concurrency.py` | EN-3 · AC-01.6 |
| `backend/tests/unit/core/test_log_redaction.py` | RG-4, NFR-03 |
| `e2e/learner-enrol.spec.ts` | Register → enrol → My Learning at 375 px and 1280 px |
