# Feature Spec: Instructor Workbench & Admin Analytics

| Field | Value |
|---|---|
| Spec ID | WORKBENCH |
| Parent | [app_spec.md](app_spec.md) |
| Requirements | FR-35 – FR-38 |
| Acceptance criteria | AC-09, AC-10 (analytics part) |
| Domain rules | DR-15, DR-24 – DR-26 (business-case §5.3, §5.5) |
| Service | `AnalyticsService` |
| Domain files | `ProgressCalculator`, `RoleBoundaryPolicy` |
| Sprint | 2 (progress bands) · 3 (admin analytics) |

## 1. Purpose

Show instructors where learners in **their own** courses are, so they can step in early, and give admins a platform-wide view of enrolment and engagement. Both views show **aggregates only**; neither can change any learner's data.

Course authoring screens of the Instructor Workbench are specified in [course-authoring_spec.md](course-authoring_spec.md); this spec covers its analytics.

## 2. Actors and permissions

| Action | Learner | Instructor (owner) | Instructor (not owner) | Admin |
|---|---|---|---|---|
| Progress bands for a course | 403 | ✅ | 403 | ✅ |
| Platform analytics | 403 | 403 | 403 | ✅ |
| Change any score, attempt or completion | ❌ | ❌ | ❌ | ❌ |

## 3. Business rules

| ID | Rule | Source |
|---|---|---|
| WB-1 | Each enrolled learner's `progress_percent` is computed with `ProgressCalculator.percent` and placed in exactly one band with `ProgressCalculator.band`: `0-24`, `25-49`, `50-74`, `75-100`. | DR-15 |
| WB-2 | The four band counts always add up to `enrolled`. All four bands are always present, including those with a count of 0. | — |
| WB-3 | An instructor can see bands only for courses they own; otherwise 403. | DR-24 |
| WB-4 | Workbench and analytics responses contain counts only — no learner names, emails, phones or individual scores. | NFR-03, DR-23 |
| WB-5 | Every analytics endpoint is read-only (GET). No user, including the owning instructor or an admin, can create, change or delete quiz attempts, scores, completions or enrolments through these endpoints or any other. | DR-25, FR-37 |
| WB-6 | `completion_rate_percent = (learners_at_100 × 100) // enrollments`; `0` when there are no enrolments. Integer only. | NFR-01 |
| WB-7 | Admin analytics include courses in every state; enrolments in UNPUBLISHED and ARCHIVED courses still count. | DR-10 |

## 4. API contract

| Method | Path | Role | Success | Errors |
|---|---|---|---|---|
| GET | `/api/instructor/courses/{course_id}/progress-bands` | INSTRUCTOR (owner), ADMIN | 200 `ProgressBands` | 403, 404 |
| GET | `/api/instructor/dashboard` | INSTRUCTOR | 200 `ProgressBands[]` for every owned course | 403 |
| GET | `/api/admin/analytics` | ADMIN | 200 `PlatformAnalytics` | 403 |

```text
ProgressBands     { course_id, course_title, course_state, enrolled,
                    bands: { "0-24": int, "25-49": int, "50-74": int, "75-100": int } }

PlatformAnalytics { courses_by_state: { DRAFT: int, PUBLISHED: int, UNPUBLISHED: int, ARCHIVED: int },
                    total_learners, total_enrollments, total_lesson_completions, total_quiz_attempts,
                    courses: [ { course_id, title, state, enrollments, learners_at_100,
                                 completion_rate_percent } ] }
```

## 5. UI

- **Instructor Workbench → Dashboard:** one card per owned course showing the enrolled count and a horizontal stacked bar (or four labelled counts) for the bands. Cards stack in one column at 375 px and sit in a grid at 1280 px.
- **Admin Console → Analytics:** summary tiles (courses by state, learners, enrolments, completions, attempts) and a per-course table sorted by enrolments, highest first.
- No edit controls on either screen.

## 6. Acceptance criteria

### AC-09 — Instructor views learner progress by band

**AC-09.1 Band counts for an owned course**
- **Given** a PUBLISHED course with 4 lessons owned by instructor A, and 5 enrolled learners with 0, 1, 2, 3 and 4 lessons completed (0%, 25%, 50%, 75%, 100%)
- **When** instructor A calls `GET /api/instructor/courses/{id}/progress-bands`
- **Then** the response is 200 with `enrolled = 5` and bands `{"0-24": 1, "25-49": 1, "50-74": 1, "75-100": 2}`

**AC-09.2 Bands always sum to enrolled, and all four are present**
- **Given** a course with 3 enrolled learners, all at 0%
- **When** the owner requests progress bands
- **Then** the bands are `{"0-24": 3, "25-49": 0, "50-74": 0, "75-100": 0}`

**AC-09.3 No enrolments**
- **Given** a course owned by the instructor with no enrolments
- **When** they request progress bands
- **Then** `enrolled = 0` and all four bands are 0

**AC-09.4 Other instructors' courses are hidden**
- **Given** instructor B and a course owned by instructor A
- **When** instructor B requests its progress bands
- **Then** the response is 403

**AC-09.5 Learners cannot see bands**
- **Given** a learner enrolled in the course
- **When** they request its progress bands
- **Then** the response is 403

**AC-09.6 Aggregates only**
- **Given** any progress-bands response
- **When** its JSON is inspected
- **Then** it contains no learner IDs, names, emails or individual percentages

**AC-09.7 Instructors cannot change grades of their own learners** (NFR-08)
- **Given** instructor A, who owns a course with learner attempts
- **When** the architecture test checks every route an INSTRUCTOR can call
- **Then** none of them writes to quiz attempts, lesson completions or enrolments

### AC-10 (analytics part) — Admin monitors enrolment

**AC-10.4 Platform analytics**
- **Given** seed data plus one learner who completed every lesson of a course with 4 enrolments
- **When** an admin calls `GET /api/admin/analytics`
- **Then** the response is 200, `courses_by_state` matches the database, and that course shows `enrollments = 4`, `learners_at_100 = 1`, `completion_rate_percent = 25`

**AC-10.5 Completion rate is an integer**
- **Given** a course with 3 enrolments and 1 learner at 100%
- **When** analytics are computed
- **Then** `completion_rate_percent` is `33` (an `int`)

**AC-10.6 Non-admins cannot see analytics**
- **Given** a learner or instructor
- **When** they call `GET /api/admin/analytics`
- **Then** the response is 403

## 7. Non-functional

- NFR-01: band and completion-rate maths use `ProgressCalculator` and integer division only.
- NFR-03: no learner identifiers in responses or logs for these endpoints.
- NFR-08: AC-09.7 lives in `tests/architecture/test_nfr08_boundaries.py`.

## 8. Out of scope

- Per-learner drill-down, exports, charts over time, email nudges to learners.
- Quiz-level statistics (average scores, hardest questions).

## 9. Test traceability

| Test file | Covers |
|---|---|
| `backend/tests/unit/services/test_analytics_service.py` | WB-1, WB-2, WB-6, WB-7 · AC-09.1 – AC-09.3, AC-10.4, AC-10.5 |
| `backend/tests/api/test_workbench_api.py` | WB-3, WB-4 · AC-09.1, AC-09.4 – AC-09.6 |
| `backend/tests/api/test_admin_analytics_api.py` | AC-10.4 – AC-10.6 |
| `backend/tests/architecture/test_nfr08_boundaries.py` | WB-5 · AC-09.7 |
| `e2e/instructor-dashboard.spec.ts` | Band cards at 375 px and 1280 px |
| `e2e/admin-analytics.spec.ts` | Analytics tiles and table |
