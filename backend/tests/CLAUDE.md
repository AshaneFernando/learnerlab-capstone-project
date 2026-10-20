# backend/tests/ — Backend tests

Inherits [root CLAUDE.md](../../CLAUDE.md) and [backend/CLAUDE.md](../CLAUDE.md). Full strategy: [docs/test-strategy.md](../../docs/test-strategy.md); workflow: [docs/tdd.md](../../docs/tdd.md).

## Folders

| Folder | Level | What goes here |
|---|---|---|
| `unit/domain/` | A | One file per domain rule file, parametrised from spec tables / golden cases |
| `unit/services/` | B | Orchestration, ownership, transactions, idempotency, snapshots |
| `unit/core/` | — | Log redaction, clock, config |
| `api/` | C | Every AC scenario at HTTP level: status, error code, error shape, roles |
| `architecture/` | D | `test_layering.py`, `test_domain_purity.py`, `test_route_guards.py`, `test_append_only_repos.py`, `test_no_float_math.py`, `test_nfr08_boundaries.py` |

File names follow the "Test traceability" table of each feature spec exactly.

## Tagging (required)

- Every acceptance test carries `@pytest.mark.ac("AC-NN")` (or `"NFR-NN.x"`, `"UI-AC.n"`); several tags are allowed.
- Scenario id in the test name: `test_ac_01_5_cannot_enrol_twice`.
- The marker is registered and pytest runs `--strict-markers`. `/ac-coverage` and `scripts/ac_audit.py` read these tags.

## Fixtures and data

- `conftest.py` provides: app + `TestClient`, a fresh database per test, factory helpers (users, courses, modules, lessons, quizzes), auth headers per role, and a fake `Clock` (fixed or stepping).
- Golden expectations come from `specs/fixtures/golden_cases.json` — load and `parametrize`, don't copy values into tests.
- **Concurrency tests** (AC-01.6, AC-07.12, AC-08.6) use a **file-based** SQLite database with WAL + busy timeout and real threads; `:memory:` is per-connection and hides races.
- Synthetic data only: `@example.test` emails, fake phone range (NFR-10).
- No network; no `sleep` to separate timestamps — step the fake clock.

## Red → green → refactor

1. Write the failing test, run it, see it fail for the right reason, commit: `TASK-S<n>-<nn>: red — <what> (AC-NN)`.
2. The implementation commit is `green`; tidy-ups are `refactor` with no test changes.
3. Every red commit touches only test files (plus import stubs if needed).

## Never

- Never skip, `xfail`, delete or loosen a failing test, or lower `--cov-fail-under` (F-06).
- Never assert on a value copied from the implementation — assert the spec's value.
- Never let a test depend on another test's data or order.
- Never use seed data in unit/API tests (only smoke and E2E use it).
