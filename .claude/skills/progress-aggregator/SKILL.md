---
name: progress-aggregator
description: Use when building or reviewing lesson completion, course progress, sequential lesson order, progress snapshots, instructor progress bands or admin analytics in LearnLab (ProgressTrackerService, AnalyticsService). Covers the ordering rule, idempotency and concurrency rules, snapshot writes, band aggregation and the analytics shape.
---

# progress-aggregator — progress, snapshots and aggregates

Specs: `specs/progress-tracker_spec.md` (PR-1 – PR-12, AC-07), `specs/instructor-workbench_spec.md` (WB-1 – WB-7, AC-09, AC-10.4 – 10.6). Maths comes from the `quiz-grader` skill / `ProgressCalculator`.

## 1. Lesson order (PR-1, PR-4, PR-10)

- Course order = module `position` ascending, then lesson `position` ascending. Gaps in positions are allowed.
- The **next lesson** is the first lesson in that order the learner has not completed; `None` when all are done.
- Only the next lesson may be completed. Any other uncompleted lesson → `LessonOutOfOrderError` (409 `LESSON_OUT_OF_ORDER`).
- Order crosses module boundaries (AC-07.4).
- `locked = True` for every uncompleted lesson except the next one; for **every** lesson when the course is not PUBLISHED (PR-11).

## 2. Completing a lesson — decision table

| Situation | Result | Writes | Source |
|---|---|---|---|
| Not enrolled | 403 | nothing | PR-2 |
| Course not PUBLISHED | 409 `COURSE_NOT_PUBLISHED` | nothing | PR-3, AC-07.8 |
| Lesson already completed | 200, current progress | nothing | PR-5, AC-07.5 |
| Lesson is not the next one | 409 `LESSON_OUT_OF_ORDER` | nothing | PR-4, AC-07.3 |
| Lesson is the next one | 200, new progress | 1 completion + 1 snapshot, same transaction | PR-12, FR-40 |
| Concurrent duplicate hits `UNIQUE(learner_id, lesson_id)` | 200, current progress | nothing more | PR-6, AC-07.12 |

Never 500 for a duplicate. Catch the specific integrity error, re-read progress, return 200.

## 3. Progress and snapshots

- `completed_lessons` counts completions of lessons that **currently** belong to the course (PR-8); `total_lessons` is the current count. Adding lessons while UNPUBLISHED can lower the percentage — expected.
- Progress is always computed from completion records. Snapshots are **history**, never read to compute progress.
- Snapshot = `{enrollment_id, completed_lessons, total_lessons, progress_percent, recorded_at}`; `recorded_at` from the injected `Clock`. Insert-only (`ProgressSnapshotRepository`, hook `attempt-immutability-check`).
- History endpoint returns snapshots oldest first, ordered by `recorded_at` then `id`.

## 4. Instructor progress bands (WB-1 – WB-5)

```text
for each enrolment in course:
    p = ProgressCalculator.percent(completed(enrolment), total_lessons(course))
    counts[ProgressCalculator.band(p)] += 1
return {course_id, course_title, course_state, enrolled, bands: counts}
```

- All four bands always present, zeros included; their sum equals `enrolled` (AC-09.2).
- Owner instructor or admin only; other instructor / learner → 403 (AC-09.4, 09.5).
- **Counts only** — no learner ids, names, emails or individual percentages in the response (AC-09.6).
- Read-only GET endpoints; nothing writes scores, attempts, completions or enrolments (WB-5, AC-09.7).

## 5. Admin analytics (FR-38, WB-6, WB-7)

| Field | How |
|---|---|
| `courses_by_state` | count per state, all four keys present |
| `total_learners`, `total_enrollments`, `total_lesson_completions`, `total_quiz_attempts` | counts |
| per course `enrollments`, `learners_at_100` | counts, every course state included |
| per course `completion_rate_percent` | `ProgressCalculator.completion_rate(learners_at_100, enrollments)` |

Repositories return integer counts; Python computes percentages (no SQL `AVG`). Sorted by enrolments, highest first.

## 6. Efficiency

Compute counts per course with grouped queries (`COUNT(*) … GROUP BY enrollment_id`), not one query per learner, but keep percentage maths in `ProgressCalculator`.

## Test pointers

| Behaviour | Test file | Golden section |
|---|---|---|
| Order, next, locked | `unit/domain/test_lesson_order.py` | `lesson_order` |
| Percent, bands | `unit/domain/test_progress_calculator.py` | `progress_percent`, `progress_bands` |
| Idempotency, snapshots | `unit/services/test_progress_tracker_service.py` | `lesson_order` |
| Concurrent duplicate | `api/test_progress_concurrency.py` (file-based DB) | — |
| Bands and analytics | `unit/services/test_analytics_service.py`, `api/test_workbench_api.py`, `api/test_admin_analytics_api.py` | `progress_bands`, `completion_rate` |

## Checklist

- [ ] Every row of the §2 decision table has a test.
- [ ] A repeat completion writes no snapshot (AC-07.13).
- [ ] Bands sum to `enrolled`; all four keys present.
- [ ] No learner identifiers in band or analytics responses.
- [ ] No percentage maths outside `ProgressCalculator`.
- [ ] Concurrency test uses a file-based SQLite DB with WAL.
