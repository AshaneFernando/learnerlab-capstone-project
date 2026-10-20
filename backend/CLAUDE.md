# backend/ — Backend module rules

Inherits everything in the [root CLAUDE.md](../CLAUDE.md). This file adds only backend-wide rules. Each package below has its own `CLAUDE.md`.

## Layout

```text
backend/
├── pyproject.toml          deps (uv), ruff, mypy, pytest, import-linter config
├── .importlinter           layer / forbidden contracts (ARCH-01 – ARCH-03, ARCH-07)
├── src/learnlab/
│   ├── api/  services/  repositories/  domain/  integrations/  core/
│   └── main.py             FastAPI app factory, middleware, exception handlers
├── migrations/versions/    Alembic revisions — append-only (NFR-05)
├── seed/                   synthetic seed loader (specs/seed-data.md)
└── tests/{unit,api,architecture}/
```

## Commands

| Task | Command |
|---|---|
| Install | `uv sync` |
| Tests + coverage | `uv run pytest --cov=learnlab --cov-report=xml --cov-fail-under=80` |
| Architecture contracts | `uv run lint-imports` |
| Lint / format | `uv run ruff check --fix . && uv run ruff format .` |
| Types | `uv run mypy src/` |
| New migration | `uv run alembic revision -m "<what>"` (never edit an existing one) |

## Rules

- **Python 3.12, fully typed.** mypy runs on every save (harness `verify-on-save`); no bare `Any`.
- **pytest `ac` marker** is registered in `pyproject.toml` (`markers = ["ac(id): acceptance criterion or NFR scenario id"]`) and pytest runs with `--strict-markers`, so a mistyped marker fails the run.
- **SQLite:** every connection runs `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=5000` (enrollment_spec EN-3). Set this in one engine factory in `core/`, not per call.
- **Alembic is append-only.** Schema changes are a new revision. The `attempt-immutability-check` hook blocks edits to existing files in `migrations/versions/`; CI job `migrations-append-only` rejects them too (NFR-05.1).
- **Time** comes only from `core.clock.Clock` (app_spec §8.6). Never call `datetime.now()` / `utcnow()` directly outside `core/clock.py`.
- **Config** comes from environment variables read in `core/config.py` (e.g. `LEARNLAB_JWT_SECRET`, app_spec §8.4). No secrets in code except the clearly marked synthetic dev default.
- **Coverage:** ≥ 80% overall, ≥ 90% for `domain/` (NFR-11). `coverage.xml` is committed.
- **Dependencies:** add one only when a spec needs it; record why in the MR description.

## Don't

- Don't add a package outside `api / services / repositories / domain / integrations / core`.
- Don't log request or response bodies (NFR-03).
- Don't use PostgreSQL-only SQL; the database is SQLite.
- Don't commit `.venv/`, `*.db` files or `__pycache__/`.

See also: [docs/architecture.md](../docs/architecture.md) §3 and §12, [docs/test-strategy.md](../docs/test-strategy.md) §9.
