---
name: spec-to-test-generator
description: Use at the start of every LearnLab task, before writing production code — turns a feature-spec acceptance scenario (AC-NN.x, NFR-NN.x or UI-AC.n, written Given/When/Then) into a failing, correctly tagged pytest or Playwright test in the right file, then makes the red commit.
---

# spec-to-test-generator — from Given/When/Then to a red test

The red step of [docs/tdd.md](../../../docs/tdd.md). Spec-Is-Truth: the test asserts exactly what the scenario says — nothing more, nothing less.

## Steps

1. **Find the scenario** in the feature spec §6 (or `app_spec.md` §6.1 for NFR / UI scenarios). Note its id, e.g. `AC-01.5`.
2. **Pick the file** from that spec's §9 "Test traceability" table. Use the listed name exactly; create the file if missing.
3. **Pick the level** (test-strategy §1):

   | Scenario is about… | Level | Folder |
   |---|---|---|
   | A pure rule or table | A domain | `backend/tests/unit/domain/` |
   | Ownership, transactions, idempotency | B service | `backend/tests/unit/services/` |
   | Status codes, error codes, roles, a whole journey via HTTP | C API | `backend/tests/api/` |
   | Structure (imports, routes, repository methods) | D architecture | `backend/tests/architecture/` |
   | A screen in the browser | F E2E | `e2e/*.spec.ts` |

4. **Map Given / When / Then** to arrange / act / assert:

   | Clause | Becomes |
   |---|---|
   | **Given** | Fixtures and factories: users by role, course in a state, existing enrolments, fake clock. Never seed data. |
   | **When** | Exactly one action: a `client.post(...)`, a domain call, or a Playwright step. |
   | **Then** | One assert per observable outcome: status, `error.code`, body fields, **row counts in the database**, absence of fields. |

5. **Name and tag it.**
   - pytest: `test_ac_01_5_cannot_enrol_twice` + `@pytest.mark.ac("AC-01")`.
   - Playwright / Vitest: title starts with the id: `test("AC-01.3 learner enrols from the catalog", …)`.
6. **Parametrise tables** from `specs/fixtures/golden_cases.json` (match by the `proves` list) instead of hand-copying values. One scenario covering a table = one parametrised test.
7. **Run it and see it fail for the right reason** (missing behaviour, not an import or fixture error). Add a minimal import stub if needed so the failure is an assertion.
8. **Commit red**, test files only: `TASK-S<n>-<nn>: red — <what the test proves> (AC-NN)`.

## Rules

- Assert the spec's values, never values read from the implementation.
- Every "Then" clause is asserted, including "no row is created" and "no response is 5xx".
- Error assertions check both HTTP status **and** `error.code`.
- Concurrency scenarios use a file-based SQLite DB and real threads (test-strategy §9).
- One scenario may need tests at two levels (domain + API) — tag both.
- If a scenario can't be tested as written, stop and escalate (agent-contracts §1.2) — don't reinterpret it.

## Worked example (illustrative — the agent generates the real file)

Scenario **AC-01.5 Cannot enrol twice** (enrollment_spec §6):
> **Given** a learner already enrolled in a PUBLISHED course · **When** they enrol again · **Then** the response is 409 `ALREADY_ENROLLED` and exactly one enrolment row exists for that pair

Traceability table → `backend/tests/api/test_enrollment_api.py` (level C).

```python
import pytest

@pytest.mark.ac("AC-01")
def test_ac_01_5_cannot_enrol_twice(client, make_learner, make_course, auth_headers, db):
    # Given
    learner = make_learner()
    course = make_course(state="PUBLISHED")
    first = client.post(f"/api/courses/{course.id}/enrollments", headers=auth_headers(learner))
    assert first.status_code == 201

    # When
    second = client.post(f"/api/courses/{course.id}/enrollments", headers=auth_headers(learner))

    # Then
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "ALREADY_ENROLLED"
    assert db.count_enrollments(learner_id=learner.id, course_id=course.id) == 1
```

Run → fails (endpoint missing). Commit:
`TASK-S1-05: red — duplicate enrolment returns 409 and keeps one row (AC-01)`

The domain half (`EnrollmentPolicy.check(PUBLISHED, already_enrolled=True)` raises `AlreadyEnrolledError`) goes in `backend/tests/unit/domain/test_enrollment_policy.py`, parametrised from the `enrollment` golden cases.

## Checklist

- [ ] File and level match the spec's traceability table.
- [ ] Name contains the scenario id; marker or title carries the AC id.
- [ ] Every Then clause asserted (status + code + DB state).
- [ ] Table scenarios parametrised from golden cases.
- [ ] Test fails for the right reason.
- [ ] Red commit touches test files only, message in the docs/tdd.md format.
