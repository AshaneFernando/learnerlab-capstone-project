# AGENTS.md — Table of Contents

This file only points to where things are. Rules live in [CLAUDE.md](CLAUDE.md) and the folder-level `CLAUDE.md` files.

Items marked *(planned)* are created in later steps.

## Instructions

| File | Scope |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Root rules, workflow, quality gates |
| [backend/CLAUDE.md](backend/CLAUDE.md) | Backend module |
| [backend/src/learnlab/api/CLAUDE.md](backend/src/learnlab/api/CLAUDE.md) | Controllers |
| [backend/src/learnlab/services/CLAUDE.md](backend/src/learnlab/services/CLAUDE.md) | Services |
| [backend/src/learnlab/repositories/CLAUDE.md](backend/src/learnlab/repositories/CLAUDE.md) | Repositories |
| [backend/src/learnlab/domain/CLAUDE.md](backend/src/learnlab/domain/CLAUDE.md) | Domain rules |
| [backend/src/learnlab/integrations/CLAUDE.md](backend/src/learnlab/integrations/CLAUDE.md) | Integration stubs |
| [backend/tests/CLAUDE.md](backend/tests/CLAUDE.md) | Backend tests |
| [frontend/CLAUDE.md](frontend/CLAUDE.md) | Frontend module |
| [e2e/CLAUDE.md](e2e/CLAUDE.md) | Playwright end-to-end tests |

## Specifications

| File | Covers |
|---|---|
| [specs/app_spec.md](specs/app_spec.md) | Root PRD: FR-01 – FR-40, NFR-01 – NFR-11, AC-01 – AC-10, NFR / UI acceptance (§6.1) |
| [specs/course-authoring_spec.md](specs/course-authoring_spec.md) | AC-02, AC-03 |
| [specs/catalog_spec.md](specs/catalog_spec.md) | AC-04, AC-08, AC-10 |
| [specs/enrollment_spec.md](specs/enrollment_spec.md) | AC-01 |
| [specs/progress-tracker_spec.md](specs/progress-tracker_spec.md) | AC-07 |
| [specs/quiz-engine_spec.md](specs/quiz-engine_spec.md) | AC-05, AC-06 |
| [specs/instructor-workbench_spec.md](specs/instructor-workbench_spec.md) | AC-09, AC-10 |
| [specs/agent-contracts.md](specs/agent-contracts.md) | What each agent may and may not do |
| [specs/seed-data.md](specs/seed-data.md) | Synthetic seed data |
| [specs/fixtures/golden_cases.json](specs/fixtures/golden_cases.json) | Expected results for domain rules |
| [specs/reviews/](specs/reviews/) | Spec reviews ([spec-review-01](specs/reviews/spec-review-01.md)), AC audit, evaluator and agent reports |

## Documentation

| File | Covers |
|---|---|
| [docs/business-case.md](docs/business-case.md) | Problem, users, domain rules DR-01 – DR-30, assumptions |
| [docs/tech-stack.md](docs/tech-stack.md) | Stack and test-tool decisions |
| [docs/architecture.md](docs/architecture.md) | Diagrams, layers, ARCH rules, data model, sprints |
| [docs/test-strategy.md](docs/test-strategy.md) | Test levels, tagging, coverage, merge-blocking failures |
| [docs/tdd.md](docs/tdd.md) | Red-green-refactor workflow |
| `docs/knowledge-deposits.md` *(planned)* | Lessons encoded into rules, hooks and skills |
| `docs/fix-loops/` *(planned)* | Recorded autonomous fix loops |
| `docs/post-mortems/` *(planned)* | Debugging logs and post-mortems |

## Planning

| File | Covers |
|---|---|
| [plans/implementation-plan.md](plans/implementation-plan.md) | Sprint plan |
| [tasks/tasks.md](tasks/tasks.md) | Task list |
| `sprint-contracts/` *(planned)* | One contract per sprint |

## Agent substrate

| Location | Contents |
|---|---|
| `.claude/agents/` | Harness agents (after `/scaffold`) + [quiz-grader-agent](.claude/agents/quiz-grader-agent.md), [course-state-validator-agent](.claude/agents/course-state-validator-agent.md), [archtest-author-agent](.claude/agents/archtest-author-agent.md) |
| `.claude/skills/` | Harness skills + [quiz-grader](.claude/skills/quiz-grader/SKILL.md), [progress-aggregator](.claude/skills/progress-aggregator/SKILL.md), [spec-to-test-generator](.claude/skills/spec-to-test-generator/SKILL.md) |
| `.claude/commands/` | Harness commands + [ac-coverage](.claude/commands/ac-coverage.md), [new-feature-spec](.claude/commands/new-feature-spec.md), [sprint-start](.claude/commands/sprint-start.md) |
| `.claude/hooks/` | Harness hooks + [attempt-immutability-check](.claude/hooks/attempt-immutability-check.js), [course-publish-gate](.claude/hooks/course-publish-gate.js), [pii-log-guard](.claude/hooks/pii-log-guard.js); self-tests in [tests/](.claude/hooks/tests/learnlab-hooks.test.js) |
| [.claude/settings.json](.claude/settings.json) | Registers the LearnLab hooks (merge with the harness settings after `/scaffold`) |
| [plugin.json](plugin.json) · `.claude-plugin/plugin.json` | LearnLab substrate plugin manifest (identical copies: the rubric location and the Claude Code loader location) |
| [.mcp.json](.mcp.json) | Playwright MCP |
| [scripts/ac_audit.py](scripts/ac_audit.py) | AC-coverage audit; `--deep` adds a Claude Agent SDK review |

## Code and tests

| Location | Contents |
|---|---|
| `backend/src/learnlab/` *(planned)* | `api/`, `services/`, `repositories/`, `domain/`, `integrations/`, `core/` |
| `backend/migrations/` *(planned)* | Alembic migrations |
| `backend/tests/` *(planned)* | `unit/`, `api/`, `architecture/` |
| `frontend/` *(planned)* | React + TypeScript app |
| `e2e/` *(planned)* | Playwright tests and snapshots |
| `.gitlab-ci.yml` *(planned)* | CI pipeline |
