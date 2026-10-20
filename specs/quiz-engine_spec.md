# Feature Spec: Quiz Engine

| Field | Value |
|---|---|
| Spec ID | QUIZ |
| Parent | [app_spec.md](app_spec.md) |
| Requirements | FR-28 – FR-34, FR-37 |
| Acceptance criteria | AC-05, AC-06 |
| Domain rules | DR-16 – DR-21 (business-case §5.4), DR-25 |
| Service | `QuizEngineService` |
| Domain files | `QuizGrader`, `PublishedContentGuard`, `RoleBoundaryPolicy` |
| Sprint | 3 |

## 1. Purpose

Let instructors attach a quiz to the end of a module, and let learners test themselves as often as they want. Grading is automatic, deterministic and uses whole numbers only. Every attempt is kept forever; the learner's best score is what counts.

## 2. Actors and permissions

| Action | Learner (enrolled) | Learner (not enrolled) | Instructor (owner) | Instructor (not owner) | Admin |
|---|---|---|---|---|---|
| Create / replace module quiz | 403 | 403 | ✅ if course editable | 403 | 403 |
| View quiz with answers | 403 | 403 | ✅ | 403 | 403 |
| View quiz without answers (`GET /api/quizzes/{id}`) | ✅ | 403 | 403 — owner uses the author view with answers | 403 | 403 |
| Submit attempt | ✅ if course PUBLISHED | 403 | 403 | 403 | 403 |
| View own attempts | ✅ | 403 | — | — | — |
| Change any score or attempt | ❌ no endpoint exists | ❌ | ❌ | ❌ | ❌ |

## 3. Business rules

### 3.1 Quiz structure

| ID | Rule | Source |
|---|---|---|
| QZ-1 | Each module has at most one quiz. `PUT /api/modules/{id}/quiz` creates it or replaces all of its questions. | A-3 |
| QZ-2 | A quiz has 1–50 questions. Question text: 3–500 characters. | — |
| QZ-3 | **MCQ:** 2–6 options, each 1–200 characters, **exactly one** marked correct. | DR-16 |
| QZ-4 | **TRUE_FALSE:** no options are supplied; the request gives `correct_answer: true\|false`. The system stores two options, "True" and "False", with the matching one marked correct. | DR-16 |
| QZ-5 | Questions and options are ordered by position as supplied. | — |
| QZ-6 | Quiz changes are content changes: allowed only while the course is DRAFT or UNPUBLISHED (`PublishedContentGuard`, 409 `CONTENT_LOCKED`). | DR-05 |
| QZ-7 | Every replace increments the quiz's `version` (starting at 1). Replacing a quiz keeps all earlier attempts; their stored scores and per-question results are not recalculated. | DR-19, A-12, spec-review R-01 / R-16 |

### 3.2 Grading (`QuizGrader`)

| ID | Rule | Source |
|---|---|---|
| GR-1 | `QuizGrader.grade(questions, answers)` is a pure function. Input: the quiz's questions with correct option IDs, and the learner's answers as `{question_id: option_id}`. Output: `score_percent` (int) and a per-question `correct` flag. | DR-18 |
| GR-2 | A question is correct only if the chosen option ID is that question's correct option ID. | DR-17 |
| GR-3 | Unanswered questions count as incorrect. | DR-17 |
| GR-4 | `score_percent = (correct_count × 100) // total_questions`. Integer arithmetic only; no `float`, true division or `round`. | DR-17, NFR-01 |
| GR-5 | An answer for a question not in the quiz, or an option ID that does not belong to its question, returns 422 `VALIDATION_ERROR`, and no attempt is stored. | — |
| GR-6 | The same answers to the same quiz always give the same result. | DR-18 |

**Worked examples for GR-4**

| Correct | Total | `score_percent` |
|---|---|---|
| 0 | 4 | 0 |
| 1 | 3 | 33 |
| 2 | 3 | 66 |
| 3 | 4 | 75 |
| 5 | 7 | 71 |
| 4 | 4 | 100 |

### 3.3 Attempts

| ID | Rule | Source |
|---|---|---|
| AT-1 | Only an enrolled learner may retrieve or attempt a quiz (403 otherwise). | DR-21 |
| AT-2 | Attempts are allowed only while the course is PUBLISHED (409 `COURSE_NOT_PUBLISHED`). | A-11 |
| AT-3 | A quiz with no questions cannot be attempted (409 `QUIZ_EMPTY`). | DR-21 |
| AT-4 | There is no attempt limit. Each attempt stores learner, quiz, `quiz_version`, answers, per-question results (`results_json`), `score_percent` and a server-generated UTC `attempted_at` (microsecond precision, from the injectable `Clock`). An attempt is self-contained: it never depends on question rows that a later replace may remove. | DR-19, spec-review R-16, R-21 |
| AT-5 | Attempts are insert-only: `AttemptRepository` has no update or delete method, and no API route changes an attempt (FR-37). | DR-19, NFR-02 |
| AT-6 | `best_score_percent` = maximum `score_percent` over the learner's attempts for that quiz, across **all** versions; `null` if there are none. It is computed, not stored. | DR-20, A-12 |
| AT-7 | The learner-facing quiz never includes `is_correct` or any field that reveals the right answer. | FR-29 |

## 4. API contract

| Method | Path | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| PUT | `/api/modules/{module_id}/quiz` | INSTRUCTOR (owner) | `QuizInput` | 200 `QuizAuthorView` | 403, 404, 409 `CONTENT_LOCKED`, 422 |
| GET | `/api/modules/{module_id}/quiz` | INSTRUCTOR (owner) | — | 200 `QuizAuthorView` | 403, 404 |
| GET | `/api/quizzes/{quiz_id}` | LEARNER (enrolled) | — | 200 `QuizLearnerView` | 403, 404 |
| POST | `/api/quizzes/{quiz_id}/attempts` | LEARNER (enrolled) | `{answers: {question_id: option_id}}` | 201 `AttemptResult` | 403, 404, 409 `COURSE_NOT_PUBLISHED` / `QUIZ_EMPTY`, 422 |
| GET | `/api/quizzes/{quiz_id}/attempts` | LEARNER (enrolled) | — | 200 `{best_score_percent, attempts: AttemptSummary[]}` newest first | 403, 404 |

```text
QuizInput       { questions: [ { type: "MCQ", text, options: [ { text, is_correct } ] }
                             | { type: "TRUE_FALSE", text, correct_answer } ] }
QuizAuthorView  { id, module_id, version, questions: [ { id, type, text, position, options: [ { id, text, is_correct } ] } ] }
QuizLearnerView { id, module_id, module_title, questions: [ { id, type, text, position, options: [ { id, text } ] } ] }
AttemptResult   { attempt_id, score_percent, best_score_percent, attempted_at,
                  results: [ { question_id, correct } ] }
AttemptSummary  { attempt_id, quiz_version, score_percent, attempted_at }
```

## 5. UI

- **Quiz page (learner):** one card per question with radio buttons; a "Submit" button; a result panel showing the score, best score and ✓/✗ per question; a "Try again" button; attempt history underneath.
- **Quiz editor (instructor):** inside the module editor; add MCQ or True/False questions; for MCQ, choose the single correct option with a radio button. Read-only when the course is PUBLISHED.
- Both pages are single-column at 375 px.

## 6. Acceptance criteria

### AC-05 — MCQ and TRUE/FALSE, auto-graded deterministically

**AC-05.1 Author a mixed quiz**
- **Given** an instructor who owns a DRAFT course with module "Basics"
- **When** they `PUT /api/modules/{id}/quiz` with one MCQ (4 options, 1 correct) and one TRUE_FALSE question (`correct_answer: true`)
- **Then** the response is 200, and the TRUE_FALSE question has exactly two options, "True" (correct) and "False"

**AC-05.2 MCQ must have exactly one correct option** (parametrised: 0 correct, 2 correct, 1 option only, 7 options)
- **Given** an instructor who owns a DRAFT course
- **When** they submit an MCQ that breaks QZ-3
- **Then** the response is 422 `VALIDATION_ERROR` and the existing quiz is unchanged

**AC-05.3 Learner view hides answers**
- **Given** an enrolled learner and a quiz
- **When** they `GET /api/quizzes/{id}`
- **Then** the response contains every question and option and contains no `is_correct` key at any depth

**AC-05.4 Grading formula** (parametrised over the GR-4 table)
- **Given** a quiz with `total` questions and answers with `correct` of them right
- **When** `QuizGrader.grade` is called
- **Then** `score_percent` equals the table value and is an `int`

**AC-05.5 Unanswered counts as wrong**
- **Given** a 4-question quiz
- **When** a learner answers only 2 questions, both correctly
- **Then** `score_percent = 50` and the two unanswered questions have `correct = false`

**AC-05.6 Deterministic grading**
- **Given** a quiz and a fixed set of answers
- **When** the same answers are graded 100 times
- **Then** every result is identical

**AC-05.7 Invalid answers rejected**
- **Given** a quiz
- **When** a learner submits an option ID that belongs to a different question
- **Then** the response is 422 and no attempt row is created

**AC-05.8 Published quiz is locked**
- **Given** a PUBLISHED course
- **When** its owner replaces a module quiz
- **Then** the response is 409 `CONTENT_LOCKED`

### AC-06 — Multiple attempts, best score kept, append-only

**AC-06.1 Multiple attempts allowed**
- **Given** an enrolled learner and a 5-question quiz
- **When** they submit three attempts scoring 40, 80 and 60
- **Then** all three responses are 201 and `GET /api/quizzes/{id}/attempts` lists three attempts, newest first (ordered by `attempted_at`, then `id`)

**AC-06.2 Best score is the maximum**
- **Given** the three attempts above
- **When** the learner reads their attempts or submits a fourth scoring 20
- **Then** `best_score_percent` is 80

**AC-06.3 Attempts are timestamped by the server**
- **Given** an enrolled learner
- **When** they submit an attempt containing an `attempted_at` field
- **Then** the stored `attempted_at` is the server's UTC time, not the submitted value

**AC-06.4 Attempts are never changed**
- **Given** existing attempts for a quiz
- **When** the instructor replaces the quiz's questions (while the course is UNPUBLISHED)
- **Then** the quiz `version` goes from 1 to 2, the earlier attempts keep their original `quiz_version = 1`, `score_percent`, `results_json` and `attempted_at`, and `best_score_percent` still includes them

**AC-06.5 No route changes attempts or scores** (FR-37, NFR-08)
- **Given** the application's route table
- **When** the architecture test inspects it
- **Then** there is no PUT, PATCH or DELETE route under `/api/quizzes/*/attempts` or any route that writes a score, and `AttemptRepository` has no update or delete method

**AC-06.6 Must be enrolled and course PUBLISHED**
- **Given** a learner not enrolled in the course, or an enrolled learner on an UNPUBLISHED course
- **When** they submit an attempt
- **Then** the responses are 403 and 409 `COURSE_NOT_PUBLISHED` respectively

**AC-06.7 Empty quiz cannot be attempted**
- **Given** a module quiz with no questions
- **When** an enrolled learner submits an attempt
- **Then** the response is 409 `QUIZ_EMPTY`

## 7. Non-functional

- NFR-01: ARCH-06 scans `QuizGrader` for `float`, `/` (true division) and `round(`.
- NFR-02: `AttemptRepository` is insert-only.
- NFR-03: scores are not logged alongside learner identifiers.
- NFR-08: AC-06.5 is the architecture test for "instructors cannot grade their own courses' learners".

## 8. Out of scope

- Question types other than MCQ (single correct) and TRUE/FALSE; partial credit; negative marking.
- Timed quizzes, question randomisation, question banks, proctoring.
- Pass marks or quiz results affecting course progress (A-9).

## 9. Test traceability

| Test file | Covers |
|---|---|
| `backend/tests/unit/domain/test_quiz_grader.py` | GR-1 – GR-6 · AC-05.4 – AC-05.6 |
| `backend/tests/unit/domain/test_quiz_structure.py` | QZ-2 – QZ-4 · AC-05.1, AC-05.2 |
| `backend/tests/unit/services/test_quiz_engine_service.py` | AT-1 – AT-4, AT-6, QZ-7 · AC-06.1 – AC-06.4 |
| `backend/tests/api/test_quiz_api.py` | AC-05.1 – AC-05.3, AC-05.7, AC-05.8, AC-06.1 – AC-06.3, AC-06.6, AC-06.7 |
| `backend/tests/architecture/test_nfr08_boundaries.py` | AC-06.5 |
| `backend/tests/architecture/test_no_float_math.py` | NFR-01 |
| `e2e/learner-quiz.spec.ts` | Take quiz → see score → retry → best score at 375 px and 1280 px |
