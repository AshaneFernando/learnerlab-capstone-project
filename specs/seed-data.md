# LearnLab — Seed Data Specification

> **SYNTHETIC DEVELOPMENT AND TEST DATA.** Every name, email address and course below is fictional. No Virtusa confidential or customer data is used (NFR-10, Synthetic-Data Rule).

| Field | Value |
|---|---|
| Spec ID | SEED |
| Satisfies | FR-05 (seed on first start), NFR-09 (one-command start), NFR-10 (synthetic only) |
| Loaded by | The seed loader in Sprint 0, after migrations, only when the database is empty |
| Related | [app_spec.md](app_spec.md) · [fixtures/golden_cases.json](fixtures/golden_cases.json) |

The seed loader inserts records **through the same repositories the app uses**, so append-only rules and constraints apply. Progress, best scores, bands and analytics are **not** stored — they are computed from the records below; the expected values in §7 are what the app must show.

## 1. Users

All seeded users share the development password **`Passw0rd!`** — a synthetic credential for local use only, stored as a bcrypt hash.

| Key | Name | Email | Role |
|---|---|---|---|
| U-ADM | Morgan Hale | `morgan.hale@example.test` | ADMIN |
| U-IN1 | Priya Raman | `priya.raman@example.test` | INSTRUCTOR |
| U-IN2 | Tomas Okafor | `tomas.okafor@example.test` | INSTRUCTOR |
| U-L1 | Lena Park | `lena.park@example.test` | LEARNER |
| U-L2 | Ravi Mehta | `ravi.mehta@example.test` | LEARNER |
| U-L3 | Sofia Alvarez | `sofia.alvarez@example.test` | LEARNER |
| U-L4 | Ben Carter | `ben.carter@example.test` | LEARNER |
| U-L5 | Maya Chen | `maya.chen@example.test` | LEARNER |

Phones are left empty for all seeded users.

## 2. Courses

| Key | Title | Category | Difficulty | State | Owner | Modules / lessons | Ready to publish |
|---|---|---|---|---|---|---|---|
| C1 | Intro to Python | Programming | BEGINNER | PUBLISHED | U-IN1 | 2 / 4 | — |
| C2 | Advanced SQL | Data | ADVANCED | PUBLISHED | U-IN2 | 2 / 3 | — |
| C3 | Data Visualisation Basics | Data | INTERMEDIATE | UNPUBLISHED | U-IN2 | 1 / 2 | yes |
| C4 | Rust Basics | Programming | BEGINNER | DRAFT | U-IN1 | 1 / 1 | **yes** |
| C5 | Design Thinking 101 | Design | INTERMEDIATE | DRAFT | U-IN2 | 0 / 0 | **no** |

Coverage: 3 categories, all 3 difficulties, states DRAFT (ready and not ready), PUBLISHED and UNPUBLISHED. No course is seeded ARCHIVED, so the archive action can be demonstrated live on C3.

Descriptions (1–2 sentences each):
- **C1** — "Learn Python fundamentals: variables, types, conditions and loops."
- **C2** — "Write complex queries with joins and window functions."
- **C3** — "Turn tables into clear charts."
- **C4** — "A first look at Rust's ownership model."
- **C5** — "An introduction to human-centred design." *(no content yet)*

## 3. Modules and lessons

Positions start at 1. Lesson content is short placeholder Markdown; `video_ref` is empty except where shown.

| Course | Module (position) | Lessons (position) |
|---|---|---|
| C1 | M1 Basics (1) | L1 Variables (1) · L2 Types (2) — `video_ref = https://video.example.test/py-types` |
| C1 | M2 Control Flow (2) | L3 If Statements (1) · L4 Loops (2) |
| C2 | M3 Joins (1) | L5 Inner Joins (1) · L6 Outer Joins (2) |
| C2 | M4 Window Functions (2) | L7 ROW_NUMBER and RANK (1) |
| C3 | M5 Charts (1) | L8 Bar Charts (1) · L9 Line Charts (2) |
| C4 | M6 Ownership (1) | L10 Borrowing (1) |

Course lesson order (PR-1): C1 = L1 → L2 → L3 → L4; C2 = L5 → L6 → L7; C3 = L8 → L9.

## 4. Quizzes

All quizzes are at `version = 1`.

### Q1 — C1 · M1 Basics (5 questions)

| # | Type | Question | Options (✔ = correct) |
|---|---|---|---|
| 1 | MCQ | Which keyword creates a variable in Python? | `var` · `let` · ✔ No keyword — assignment creates it · `dim` |
| 2 | MCQ | What is the type of `3.0`? | `int` · ✔ `float` · `str` · `bool` |
| 3 | MCQ | Which of these is immutable? | `list` · `dict` · ✔ `tuple` · `set` |
| 4 | TRUE_FALSE | Python variable names are case-sensitive. | ✔ True · False |
| 5 | TRUE_FALSE | A string can be changed in place. | True · ✔ False |

### Q2 — C1 · M2 Control Flow (4 questions)

| # | Type | Question | Options (✔ = correct) |
|---|---|---|---|
| 1 | MCQ | Which statement exits a loop early? | `continue` · ✔ `break` · `pass` · `exit` |
| 2 | TRUE_FALSE | `elif` is short for "else if". | ✔ True · False |
| 3 | MCQ | What does `range(3)` produce? | `1, 2, 3` · ✔ `0, 1, 2` · `0, 1, 2, 3` |
| 4 | TRUE_FALSE | A `while` loop always runs at least once. | True · ✔ False |

### Q3 — C2 · M3 Joins (3 questions)

| # | Type | Question | Options (✔ = correct) |
|---|---|---|---|
| 1 | MCQ | Which join returns only matching rows? | ✔ INNER JOIN · LEFT JOIN · FULL OUTER JOIN |
| 2 | TRUE_FALSE | A LEFT JOIN can return NULLs from the right table. | ✔ True · False |
| 3 | MCQ | What does a CROSS JOIN produce? | ✔ Every combination of rows · Only matching rows · A union of both tables |

## 5. Enrolments, completions and snapshots

Completions follow lesson order. Each completion has one matching `progress_snapshot` (PR-12).

| Learner | Course | Completed lessons | Progress (computed) | Band |
|---|---|---|---|---|
| U-L1 Lena | C1 | — | 0 | 0-24 |
| U-L2 Ravi | C1 | L1 | 25 | 25-49 |
| U-L3 Sofia | C1 | L1, L2 | 50 | 50-74 |
| U-L4 Ben | C1 | L1, L2, L3 | 75 | 75-100 |
| U-L5 Maya | C1 | L1, L2, L3, L4 | **100** | 75-100 |
| U-L1 Lena | C2 | L5 | 33 | 25-49 |
| U-L2 Ravi | C2 | — | 0 | 0-24 |
| U-L3 Sofia | C3 | L8 | 50 | 50-74 |

Sofia's C3 enrolment and completion were made while C3 was PUBLISHED (see §6), so it demonstrates read access after unpublishing.

## 6. Quiz attempts and lifecycle history

### Quiz attempts

Timestamps are fixed synthetic UTC values, one minute apart, in the order shown.

| Learner | Quiz | Correct / total | `score_percent` |
|---|---|---|---|
| U-L1 Lena | Q1 | 2 / 5 | 40 |
| U-L1 Lena | Q1 | 4 / 5 | 80 |
| U-L1 Lena | Q1 | 3 / 5 | 60 |
| U-L5 Maya | Q1 | 5 / 5 | 100 |

Lena's best score on Q1 is **80**.

### Course state changes (append-only audit)

| Course | From → To | By |
|---|---|---|
| C1 | DRAFT → PUBLISHED | U-ADM |
| C2 | DRAFT → PUBLISHED | U-ADM |
| C3 | DRAFT → PUBLISHED | U-ADM |
| C3 | PUBLISHED → UNPUBLISHED | U-ADM |

## 7. Expected computed values

| View | Expected |
|---|---|
| C1 progress bands (U-IN1 or admin) | `enrolled = 5`, `{"0-24": 1, "25-49": 1, "50-74": 1, "75-100": 2}` |
| C2 progress bands (U-IN2 or admin) | `enrolled = 2`, `{"0-24": 1, "25-49": 1, "50-74": 0, "75-100": 0}` |
| C3 progress bands (U-IN2 or admin) | `enrolled = 1`, `{"0-24": 0, "25-49": 0, "50-74": 1, "75-100": 0}` |
| Admin `courses_by_state` | DRAFT 2 · PUBLISHED 2 · UNPUBLISHED 1 · ARCHIVED 0 |
| Admin totals | `total_learners = 5`, `total_enrollments = 8`, `total_lesson_completions = 12`, `total_quiz_attempts = 4` |
| Admin per course | C1: 5 enrolments, 1 at 100%, rate **20** · C2: 2, 0, 0 · C3: 1, 0, 0 · C4, C5: 0, 0, 0 |
| Catalog (any user) | C1 and C2 only; `GET /api/catalog/categories` → `["Data", "Programming"]` |
| Admin DRAFT list | C4 `ready_to_publish = true`, C5 `ready_to_publish = false` |
| Lena — Q1 attempts | 3 attempts, newest first: 60, 80, 40; `best_score_percent = 80` |

## 8. What each seed record demonstrates

| Seed record | Screen | Demonstrates |
|---|---|---|
| U-L1–U-L5 + password | Login | FR-02, role-based routing |
| C1, C2 | Catalog, Course detail | FR-12, FR-13, CT-AC.1 (filter by Programming + BEGINNER returns C1 only; C4 is DRAFT) |
| Ben (enrolled in C1 only) viewing C2; Lena viewing C2 | "Enrol" button / "Enrolled" badge | AC-01.3 (Ben can enrol in C2), AC-01.5 (Lena is already enrolled) |
| C4 (ready) and C5 (not ready) | Admin Console → Courses | AC-04.1, AC-04.2, AC-10.2 |
| C3 (UNPUBLISHED) | Admin Console; Sofia's My Learning | AC-01.7, AC-04.3, AC-07.11, archive action AC-08.1 |
| C1 enrolments at 0/25/50/75/100 | Instructor Workbench → Dashboard | AC-09.1 |
| Maya at 100% on C1 | Admin Console → Analytics | AC-10.4 (completion rate 20) |
| Lena's Q1 attempts 40/80/60 | Quiz page, attempt history | AC-06.1, AC-06.2 |
| Q1–Q3 | Quiz page, Quiz editor | AC-05.1, AC-05.3 |
| Ben at 3 of 4 on C1 | Lesson page | AC-07.6 (completing L4 reaches 100%) |
| Lena on C2 at L5 | Lesson page | AC-07.3 (L7 is locked / out of order) |
| C4 (DRAFT, owned by Priya) | Instructor course editor | AC-02.4, AC-03.1, AC-03.2 |
| C1 (PUBLISHED, owned by Priya) | Instructor course editor (read-only) | AC-03.3 |
| C2 owned by Tomas | Priya's workbench | AC-03.5, AC-09.4 (403 for non-owner) |
| State change history | Admin audit | AC-08.5 |

## 9. Rules for the seed loader

- Runs only when the `user` table is empty; never duplicates or alters existing data.
- Inserts in dependency order: users → courses → modules → lessons → quizzes → state changes → enrolments → completions + snapshots → attempts.
- Uses the injectable `Clock` with fixed synthetic timestamps so the expected values in §7 are reproducible.
- Never logs seeded emails or passwords (NFR-03).
- A test asserts every seeded email ends in `@example.test` (NFR-10.1).
