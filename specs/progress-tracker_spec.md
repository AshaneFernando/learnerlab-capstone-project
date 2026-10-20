# Feature Spec: Lesson Delivery & Progress Tracker

| Field | Value |
|---|---|
| Spec ID | PROGRESS |
| Parent | [app_spec.md](app_spec.md) |
| Requirements | FR-23 – FR-27, FR-40 |
| Acceptance criteria | AC-07 |
| Domain rules | DR-11 – DR-15 (business-case §5.3), DR-23 |
| Service | `ProgressTrackerService` |
| Domain files | `ProgressCalculator`, `RoleBoundaryPolicy` |
| Sprint | 2 |

## 1. Purpose

Let learners work through a course one lesson at a time and always know how far along they are. Progress is computed from an append-only record of completed lessons, using whole-number maths only.

## 2. Actors and permissions

| Action | Learner (enrolled) | Learner (not enrolled) | Instructor | Admin |
|---|---|---|---|---|
| Read lesson content | ✅ any course state (PR-11) | 403 | 403 here — owners read content via `GET /api/instructor/courses/{id}` | 403 |
| Mark lesson complete | ✅ if course PUBLISHED | 403 | 403 | 403 |
| View own progress | ✅ | 403 | — | — |
| View another learner's progress | 403 | 403 | via aggregates only (workbench) | via analytics only |

## 3. Business rules (`ProgressCalculator`)

| ID | Rule | Source |
|---|---|---|
| PR-1 | Course lesson order is: module `position` ascending, then lesson `position` ascending within the module. | DR-12 |
| PR-2 | Only an enrolled learner can complete a lesson; otherwise 403. | DR-11 |
| PR-3 | Lessons can be completed only while the course is PUBLISHED; otherwise 409 `COURSE_NOT_PUBLISHED`. | A-11 |
| PR-4 | The lesson being completed must be the first lesson (in PR-1 order) not yet completed by the learner. Any other uncompleted lesson returns 409 `LESSON_OUT_OF_ORDER`. | DR-12 |
| PR-5 | Completing an already-completed lesson returns 200 with the current progress and creates no record. | DR-13 |
| PR-6 | Completion records are insert-only, unique per (learner, lesson). If two simultaneous requests race and the second insert hits the unique constraint, it returns 200 with the current progress — never 409 or 500. | DR-13, NFR-02, spec-review R-17 |
| PR-7 | `progress_percent = (completed_lessons × 100) // total_lessons`; `0` when `total_lessons = 0`. Inputs and output are integers. | DR-14, NFR-01 |
| PR-8 | `completed_lessons` counts only completions of lessons that currently belong to the course. If lessons are added while UNPUBLISHED, `total_lessons` grows and the percentage may drop — this is expected. | — |
| PR-9 | `ProgressCalculator.band(percent)` returns `0-24`, `25-49`, `50-74` or `75-100` using half-open ranges (app_spec §8.3). | DR-15 |
| PR-10 | `next_lesson_id` is the first uncompleted lesson in PR-1 order, or `null` when the course is complete. | — |
| PR-11 | An enrolled learner can read the learn view and lesson content in **every** course state. When the course is not PUBLISHED, every lesson is returned with `locked = true` and the completion endpoint returns 409 `COURSE_NOT_PUBLISHED`. | DR-10, A-11, spec-review R-02 |
| PR-12 | Every successful **new** completion appends one `progress_snapshot` record: enrolment id, completed lessons, total lessons, progress percent and timestamp, in the same transaction as the completion. A repeat completion (PR-5) appends nothing. Snapshots are insert-only history; the computed value (PR-7) remains the source of truth. | FR-40, brief §6.2, spec-review R-05 |

**Worked examples for PR-7**

| Completed | Total | `progress_percent` |
|---|---|---|
| 0 | 7 | 0 |
| 1 | 3 | 33 |
| 2 | 3 | 66 |
| 3 | 7 | 42 |
| 7 | 7 | 100 |
| 0 | 0 | 0 |

## 4. API contract

| Method | Path | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/courses/{course_id}/learn` | LEARNER (enrolled), any course state | — | 200 `LearnView` | 403, 404 |
| GET | `/api/lessons/{lesson_id}` | LEARNER (enrolled), any course state | — | 200 `LessonView` | 403, 404 |
| GET | `/api/enrollments/{enrollment_id}/progress/history` | LEARNER (owner of enrolment) | — | 200 `ProgressSnapshot[]` oldest first | 403, 404 |
| POST | `/api/lessons/{lesson_id}/completion` | LEARNER (enrolled) | — | 200 `Progress` | 403, 404, 409 `COURSE_NOT_PUBLISHED` / `LESSON_OUT_OF_ORDER` |
| GET | `/api/enrollments/{enrollment_id}/progress` | LEARNER (owner of enrolment) | — | 200 `Progress` | 403, 404 |

```text
LearnView  { course_id, title, state, modules: [ { id, title, position, has_quiz, quiz_id,
             lessons: [ { id, title, position, completed, locked } ] } ], progress: Progress }
LessonView { id, title, content, video_ref, completed, locked, prev_lesson_id, next_lesson_id }
Progress   { enrollment_id, course_id, completed_lessons, total_lessons, progress_percent, next_lesson_id }
ProgressSnapshot { completed_lessons, total_lessons, progress_percent, recorded_at }
```

`locked` is true for every uncompleted lesson except the next one. Locked lessons can still be read, but cannot be completed.

`video_ref` comes from the stub `VideoProvider` and is shown as a placeholder; no video is streamed.

## 5. UI

- **Course learning page:** left sidebar (collapses into a drawer at 375 px) listing modules and lessons with ✓ completed / ▶ next / 🔒 locked markers and a progress bar.
- **Lesson page:** lesson text, video placeholder, "Mark complete" button (enabled only for the next lesson), and Previous / Next navigation.
- **My Learning:** progress bar and integer percentage per enrolled course.

## 6. Acceptance criteria

### AC-07 — Learner marks lessons complete; progress = completed ÷ total

**AC-07.1 Complete the first lesson**
- **Given** a learner enrolled in a PUBLISHED course with 4 lessons and no completions
- **When** they call `POST /api/lessons/{first_lesson_id}/completion`
- **Then** the response is 200 with `completed_lessons = 1`, `total_lessons = 4`, `progress_percent = 25`

**AC-07.2 Progress uses integer division** (parametrised over the PR-7 table)
- **Given** `completed` and `total` from a row of the table
- **When** `ProgressCalculator.percent(completed, total)` is called
- **Then** it returns the table's `progress_percent` as an `int`

**AC-07.3 Lessons must be completed in order**
- **Given** an enrolled learner who has completed lesson 1 of 4
- **When** they try to complete lesson 3
- **Then** the response is 409 `LESSON_OUT_OF_ORDER` and no completion row is created for lesson 3

**AC-07.4 Order crosses module boundaries**
- **Given** module 1 with lessons A, B and module 2 with lesson C, and a learner who has completed A only
- **When** they try to complete C
- **Then** the response is 409 `LESSON_OUT_OF_ORDER`; after completing B, completing C succeeds

**AC-07.5 Repeat completion is idempotent**
- **Given** a learner who has completed lesson 1
- **When** they complete lesson 1 again
- **Then** the response is 200 with unchanged progress and exactly one completion row exists for that lesson

**AC-07.6 Course reaches 100%**
- **Given** a learner who has completed 3 of 4 lessons
- **When** they complete the 4th lesson
- **Then** `progress_percent = 100` and `next_lesson_id` is `null`

**AC-07.7 Must be enrolled**
- **Given** a learner not enrolled in a PUBLISHED course
- **When** they try to complete one of its lessons
- **Then** the response is 403

**AC-07.8 No new completions on an unpublished course**
- **Given** an enrolled learner and a course that an admin has unpublished
- **When** they try to complete the next lesson
- **Then** the response is 409 `COURSE_NOT_PUBLISHED`, and `GET /api/enrollments/{id}/progress` still returns their earlier progress

**AC-07.9 A learner cannot see another learner's progress** (NFR-08)
- **Given** learners Ada and Ben both enrolled in the same course
- **When** Ben calls `GET /api/enrollments/{ada_enrollment_id}/progress`
- **Then** the response is 403

**AC-07.10 Progress band boundaries** (parametrised)
- **Given** percentages 0, 24, 25, 49, 50, 74, 75, 100
- **When** `ProgressCalculator.band(percent)` is called
- **Then** the results are `0-24`, `0-24`, `25-49`, `25-49`, `50-74`, `50-74`, `75-100`, `75-100`

**AC-07.11 Read access after unpublishing**
- **Given** an enrolled learner with 2 of 4 lessons complete, and an admin then unpublishes the course
- **When** the learner calls `GET /api/courses/{id}/learn` and `GET /api/lessons/{lesson_id}`
- **Then** both return 200, every lesson has `locked = true`, and progress is still 50

**AC-07.12 Simultaneous duplicate completion**
- **Given** an enrolled learner whose next lesson is lesson 1
- **When** two completion requests for lesson 1 are sent concurrently
- **Then** both responses are 200, no response is 409 or 5xx, and exactly one completion row exists

**AC-07.13 Progress snapshots are appended**
- **Given** an enrolled learner in a 4-lesson course
- **When** they complete lesson 1, complete lesson 1 again, then complete lesson 2
- **Then** `GET /api/enrollments/{id}/progress/history` returns exactly 2 snapshots with `progress_percent` 25 and 50, in that order

## 7. Non-functional

- NFR-01: architecture test ARCH-06 scans `ProgressCalculator` for `float`, `/` (true division) and `round(`.
- NFR-02: `CompletionRepository` and `ProgressSnapshotRepository` expose `add` and read methods only.
- NFR-03: progress values are not logged with learner identifiers.

## 8. Out of scope

- Time-on-lesson tracking, bookmarks, notes.
- Quiz results counting towards course progress (A-9).
- Using snapshots as the source of truth — progress is always computed from completion records; snapshots are history only (PR-12).

## 9. Test traceability

| Test file | Covers |
|---|---|
| `backend/tests/unit/domain/test_progress_calculator.py` | PR-7, PR-9, PR-10 · AC-07.2, AC-07.10 |
| `backend/tests/unit/domain/test_lesson_order.py` | PR-1, PR-4 · AC-07.3, AC-07.4 |
| `backend/tests/unit/services/test_progress_tracker_service.py` | PR-2, PR-3, PR-5, PR-8, PR-12 · AC-07.5, AC-07.8, AC-07.13 |
| `backend/tests/api/test_progress_api.py` | AC-07.1, AC-07.3 – AC-07.9, AC-07.11, AC-07.13 |
| `backend/tests/api/test_progress_concurrency.py` | PR-6 · AC-07.12 |
| `backend/tests/architecture/test_nfr08_boundaries.py` | AC-07.9 |
| `e2e/learner-progress.spec.ts` | Complete lessons → progress bar updates at 375 px and 1280 px |
