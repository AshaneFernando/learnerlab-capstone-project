# e2e/ — Playwright end-to-end tests

Inherits the [root CLAUDE.md](../CLAUDE.md). Level F of [docs/test-strategy.md](../docs/test-strategy.md).

## Layout

```text
e2e/
├── playwright.config.ts   two projects: mobile (375×812) and desktop (1280×800)
├── fixtures/              login helpers per role
├── *.spec.ts              one file per journey (names from the feature specs' traceability tables)
└── __snapshots__/         committed screenshot snapshots (rubric evidence)
```

Planned specs: `login`, `catalog`, `learner-enrol`, `learner-progress`, `learner-quiz`, `instructor-authoring`, `instructor-dashboard`, `admin-console`, `admin-analytics`, `responsive`.

## Commands

| Task | Command |
|---|---|
| Run all | `npx playwright test` |
| Update snapshots (only after an intended UI change) | `npx playwright test --update-snapshots` |

## Rules

- **Both viewports.** Every test runs in the mobile and desktop projects (UI-AC.1).
- **AC id first in the title:** `test("AC-01.3 learner enrols from the catalog", …)`; UI checks use `UI-AC.n`.
- **Snapshots** go in `e2e/__snapshots__/` and are committed. Mask volatile regions (timestamps).
- **Seed users** come from [specs/seed-data.md](../specs/seed-data.md) (`@example.test`, synthetic password). Don't create users through the UI except in the registration test.
- **No horizontal scroll** check on every screen: `document.documentElement.scrollWidth <= innerWidth`.
- **Journey length:** catalog → course → enrol → first lesson in ≤ 3 navigations (UI-AC.2).
- Select by role, label or `data-testid`; never by CSS structure.
- Run against the locally started app only (`smoke-start` command); no external sites.

## Don't

- Don't update snapshots to make a failing test pass without confirming the UI change is intended (F-06).
- Don't use fixed `waitForTimeout` sleeps — wait for elements or responses.
- Don't assert business maths in the browser beyond what the API returned.

The harness evaluator also drives the app through Playwright MCP each sprint; these committed tests are separate and run in CI job `e2e`.
