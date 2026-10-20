---
description: Start a LearnLab harness sprint — check preconditions, create the branch and draft the sprint contract for approval
argument-hint: "<sprint-number 0-3>"
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git fetch:*), Bash(git pull:*), Bash(node --test:*), Bash(python scripts/ac_audit.py:*), Read, Write, Glob, Grep
---

Start Sprint `$ARGUMENTS` of the LearnLab plan.

## 1. Preconditions — stop and report if any fail

- `$ARGUMENTS` is 0, 1, 2 or 3.
- The working tree is clean (`git status --porcelain` is empty).
- The current branch is `main` and is up to date with the remote.
- For Sprint N > 0: the Sprint N-1 merge request is merged (`git log --merges --oneline main` shows `feature/sprint-<N-1>-…`).
- Project hooks pass their self-tests: `node --test ".claude/hooks/tests/*.test.js"`.

## 2. Load the sprint

Read `plans/implementation-plan.md` §3 for Sprint `$ARGUMENTS`, `tasks/tasks.md` (tasks `TASK-S$ARGUMENTS-*`), and every feature spec the sprint lists.

## 3. Create the branch

`git checkout -b <branch from the plan>` — for example `feature/sprint-1-catalog-enrolment`.

## 4. Draft the sprint contract

Write `sprint-contracts/sprint-$ARGUMENTS.md`:

| Section | Content |
|---|---|
| Header | Sprint, branch, date, FRs, ACs, domain files |
| Scope in | From the plan |
| Scope out | From the plan, plus `app_spec.md` §5 |
| Done criteria | Every in-scope AC scenario id (e.g. AC-01.1 … AC-01.8) with its Then clause in one line |
| Tests to write first | From the sprint's tasks, with file paths and AC tags |
| Hooks and agents | Guarding hooks; project agent review to run before the MR |
| Evaluator | What the evaluator must verify live through Playwright MCP |
| Exit | Evaluator PASS, CI green, `/ac-coverage` shows the sprint's ACs covered, engineer approval, `git merge --no-ff` |

## 5. Hand over

Show the contract and **stop for the engineer's approval**. After approval, the next step is the harness pipeline (`/build specs/app_spec.md` for the first sprint, `/sprint <prd>` for later ones), following `docs/tdd.md`.

Do not write application code in this command.
