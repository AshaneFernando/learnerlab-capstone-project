---
name: quiz-grader
description: Use when implementing, changing, testing or reviewing LearnLab's integer maths — QuizGrader (quiz scores, best score, question-shape validation) or ProgressCalculator (progress percent, bands, completion rate). Gives the exact formulas, the spec tables, forbidden constructs and a test template parametrised from specs/fixtures/golden_cases.json.
---

# quiz-grader — integer grading and progress maths

Owns the arithmetic behind AC-05, AC-06, AC-07, AC-09 and AC-10 (analytics). Specs: `specs/quiz-engine_spec.md` §3, `specs/progress-tracker_spec.md` §3, `specs/instructor-workbench_spec.md` §3, `app_spec.md` §8.5.

## Formulas (the only allowed form)

| Value | Formula | Zero case | Source |
|---|---|---|---|
| Quiz score | `(correct_count * 100) // total_questions` | quiz with 0 questions cannot be attempted → `QuizEmptyError` | GR-4, AT-3 |
| Best score | `max(attempt.score_percent for attempt in attempts)` across all quiz versions | no attempts → `None` | AT-6, A-12 |
| Progress | `(completed_lessons * 100) // total_lessons` | `total_lessons == 0` → `0` | PR-7 |
| Completion rate | `(learners_at_100 * 100) // enrollments` | `enrollments == 0` → `0` | WB-6 |
| Band | `0-24` if p < 25 · `25-49` if p < 50 · `50-74` if p < 75 · else `75-100` | — | PR-9 |

All inputs and outputs are `int`. Results are floors, never rounded.

## Reference tables (tests must cover every row)

| Correct / Total | Score |   | Completed / Total | Progress |
|---|---|---|---|---|
| 0 / 4 | 0 | | 0 / 7 | 0 |
| 1 / 3 | 33 | | 1 / 3 | 33 |
| 2 / 3 | 66 | | 2 / 3 | 66 |
| 3 / 4 | 75 | | 3 / 7 | 42 |
| 5 / 7 | 71 | | 7 / 7 | 100 |
| 4 / 4 | 100 | | 0 / 0 | 0 |

Band boundaries: 0, 24 → `0-24`; 25, 49 → `25-49`; 50, 74 → `50-74`; 75, 100 → `75-100`.

## Grading rules (GR-1 – GR-6)

1. `QuizGrader.grade(questions, answers)` is pure: questions carry their correct option id; answers are `{question_id: option_id}`.
2. Correct only if the chosen option id equals the question's correct option id.
3. Unanswered questions are incorrect.
4. An answer for a question not in the quiz, or an option belonging to another question → `ValidationError` (API 422), and **no attempt is stored**.
5. Same input → same output, always (AC-05.6: grade 100 times, identical results).
6. Returns `GradeResult(score_percent: int, results: list[(question_id, correct: bool)])`.

Question shape (QZ-2 – QZ-4): 1–50 questions; MCQ has 2–6 options and **exactly one** correct; TRUE_FALSE is given `correct_answer: bool` and stored as two options "True"/"False".

## Forbidden constructs (ARCH-06, NFR-01)

| Never | Why | Instead |
|---|---|---|
| `float`, `x / y` | float result | `x * 100 // y` |
| `round(...)`, `math.floor(a / b)` | still float maths | `//` on ints |
| `Decimal`, `fractions` | not needed, hides intent | ints |
| SQL `AVG(`, `CAST(... AS REAL)`, `* 1.0` | float in the database | return counts, compute in Python |
| `score: float` in a Pydantic model | breaks the int contract | `score_percent: int` |
| Computing a percentage in a service or the UI | duplicates the rule | call `QuizGrader` / `ProgressCalculator` |

`backend/tests/architecture/test_no_float_math.py` scans for these.

## Test template (illustrative — the agent generates the real file)

```python
import json, pathlib, pytest
from learnlab.domain.quiz_grader import QuizGrader

GOLDEN = json.loads((pathlib.Path(__file__).parents[4] / "specs/fixtures/golden_cases.json").read_text())
TABLE = [c for c in GOLDEN["quiz_grading"] if "GR-4" in c["proves"] and "correct" in c["input"]]

def quiz_with(correct: int, total: int):
    """Build `total` single-correct questions and answer the first `correct` of them right."""
    questions = [{"id": i, "correct_option_id": 10 * i + 1, "option_ids": [10 * i + 1, 10 * i + 2]} for i in range(total)]
    answers = {q["id"]: (q["correct_option_id"] if i < correct else q["option_ids"][1]) for i, q in enumerate(questions)}
    return questions, answers

@pytest.mark.ac("AC-05")
@pytest.mark.parametrize("case", TABLE, ids=lambda c: c["id"])
def test_ac_05_4_grading_formula(case):
    questions, answers = quiz_with(case["input"]["correct"], case["input"]["total"])
    result = QuizGrader.grade(questions, answers)
    assert result.score_percent == case["expected"]["score_percent"]
    assert isinstance(result.score_percent, int)
```

Golden table rows give `input: {correct, total}`; other `quiz_grading` cases carry full questions / answers — check each case's `input` shape.

Load expectations from `golden_cases.json` (`quiz_grading`, `progress_percent`, `progress_bands`, `completion_rate`) — never copy numbers into the test.

## Checklist before committing

- [ ] Every row of GR-4 and PR-7 and every band boundary is a test case.
- [ ] Unanswered, invalid-option and empty-quiz cases are tested.
- [ ] Every result is asserted to be `int`.
- [ ] `test_no_float_math.py` passes.
- [ ] Tests tagged `@pytest.mark.ac(...)` with the right AC id.
- [ ] No percentage computed outside `domain/`.
- [ ] Red → green → refactor commits (docs/tdd.md).

The `quiz-grader-agent` uses this skill to review any diff touching `quiz_grader.py` or `progress_calculator.py` and writes `specs/reviews/quiz-grader-review.md`.
