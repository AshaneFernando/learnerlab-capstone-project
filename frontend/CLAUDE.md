# frontend/ — React + TypeScript SPA

Inherits the [root CLAUDE.md](../CLAUDE.md). Vite, React, TypeScript (strict).

## Layout

```text
frontend/src/
├── pages/       one folder per screen (below)
├── components/  shared, presentational components
├── api/         typed client generated from / matching the backend OpenAPI
└── auth/        token storage, role-based routing
```

## Screens (FR-39)

Login/Register · Catalog · Course detail · Lesson (course learning view) · Quiz · My Learning · Instructor Workbench (course editor + dashboard) · Admin Console (courses + analytics).

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Tests + coverage | `npm test -- --coverage` → `frontend/coverage/lcov.info` (committed) |
| Lint / types | `npm run lint && npm run typecheck` |

## Rules

| Rule | Detail | Id |
|---|---|---|
| Responsive | Every screen works at **375 px** and **1280 px** with no horizontal scroll. Catalog: 1 column → 3 columns; lesson sidebar becomes a drawer on mobile. | FR-39, UI-AC.1 |
| No raw HTML | Never use `dangerouslySetInnerHTML`. Render lesson Markdown with raw HTML disabled. | AC-03.7, R-26 |
| `video_ref` | Show a placeholder only; never render it as a link, `src` or `href`. | CA-6 |
| No PII in console | Never `console.log` emails, phones, passwords, scores or progress — the `pii-log-guard` hook blocks it. | NFR-03 |
| Server is the authority | Never compute grades, progress or lifecycle rules in the UI; display what the API returns. Only *visual* sizing (e.g. bar width) may use the returned integer. | NFR-01 |
| Respect state | Disable actions the API would reject: lifecycle buttons per current state, "Mark complete" only on the next lesson, read-only editor when PUBLISHED / ARCHIVED. | AC-03.3, AC-08 |
| Errors | Show the API's `error.message`; never display raw response bodies. | app_spec §8.1 |
| Token | Keep the JWT in memory or `sessionStorage`; send `Authorization: Bearer`. | app_spec §8.4 |

## Tests (Vitest + React Testing Library)

- Co-locate as `*.test.tsx`; the AC id starts the title: `it("AC-07.11 shows every lesson locked when unpublished", …)`.
- Query by role / label, not CSS classes. Mock the API client, not `fetch` internals.

## Don't

- Don't add a UI framework or state library without a spec need.
- Don't hard-code seed data or user ids.
- Don't call the backend from anywhere but `src/api/`.

Specs: each feature spec §5 (UI); [app_spec.md](../specs/app_spec.md) FR-39, §6.1.
