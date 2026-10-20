# repositories/ — Data access

Inherits [root CLAUDE.md](../../../../CLAUDE.md) and [backend/CLAUDE.md](../../../CLAUDE.md). Layer 3 — SQLAlchemy 2.0 against SQLite.

## Repositories

| Repository | File | Mutability |
|---|---|---|
| `UserRepository` | `user_repository.py` | add, read |
| `CourseRepository` (courses, modules, lessons, quizzes) | `course_repository.py` | read / write; course state only via conditional update (CL-6) |
| `EnrollmentRepository` | `enrollment_repository.py` | **insert-only** |
| `CompletionRepository` | `lesson_completion_repository.py` | **insert-only** |
| `AttemptRepository` | `quiz_attempt_repository.py` | **insert-only** |
| `ProgressSnapshotRepository` | `progress_snapshot_repository.py` | **insert-only** |
| `CourseStateChangeRepository` | `course_state_change_repository.py` | **insert-only** |

## Insert-only means (NFR-02, ARCH-05)

- Only `add(...)` and read methods (`get_*`, `list_*`, `count_*`, `exists_*`).
- No `update*` / `delete*` / `remove*` / `edit*` / `modify*` / `patch*` / `upsert*` / `overwrite*` methods, no `.update(`, `.delete(`, `session.merge(`, `UPDATE … SET`, `DELETE FROM`.
- The **`attempt-immutability-check`** hook blocks these in any file whose name starts with `enrollment`, `completion` / `lesson_completion`, `attempt` / `quiz_attempt`, `progress_snapshot` or `course_state_change` — so keep those file names. `tests/architecture/test_append_only_repos.py` checks the classes too.
- Uniqueness is a database constraint: `UNIQUE(learner_id, course_id)` on enrolments, `UNIQUE(learner_id, lesson_id)` on completions (EN-3, PR-6). Let the `IntegrityError` propagate; the service maps it.

## Rules

| Rule | Detail | Id |
|---|---|---|
| No business rules | No state checks, ownership decisions or percentage maths here. | ARCH-01 |
| No SQL maths | No `AVG(`, `CAST(… AS REAL)`, `* 1.0` or float columns. Return integer counts; `ProgressCalculator` computes percentages. | NFR-01, ARCH-06 |
| `LIKE` escaping | Escape `%` and `_` in catalog `q` and use `ESCAPE '\'`; bind parameters only. | CT-2, CT-AC.3 |
| Ordering | Time-ordered lists sort by timestamp then `id`. | app_spec §8.6 |
| Timestamps | Microsecond precision, UTC, supplied by the caller from `Clock`. | app_spec §8.6 |
| Imports | May import `domain/` value types and `core/`; never `services/` or `api/`. | ARCH-01 |

## Don't

- Don't raise HTTP errors.
- Don't add raw SQL that only works on PostgreSQL.
- Don't edit an existing migration to change a table — add a new revision.

Specs: [architecture.md](../../../../docs/architecture.md) §6 (data model, integrity guarantees).
