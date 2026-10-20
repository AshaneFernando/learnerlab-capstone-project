# integrations/ — External integration stubs

Inherits [root CLAUDE.md](../../../../CLAUDE.md) and [backend/CLAUDE.md](../../../CLAUDE.md). Sits beside `repositories/`; services reach it only through interfaces (ARCH-07).

## Contents

| File | Purpose |
|---|---|
| `video_provider.py` | `VideoProvider` Protocol — `placeholder_for(video_ref: str \| None) -> str \| None` |
| `payment_provider.py` | `PaymentProvider` Protocol — `is_free(course_id: int) -> bool` |
| `stubs/stub_video_provider.py` | Returns the stored `video_ref` unchanged as a placeholder reference; never fetches it |
| `stubs/stub_payment_provider.py` | Always returns `True` (every course is free, A-8) |

Stubs are wired in the app factory and injected into services; tests may inject their own fakes.

## Rules

- **No network.** No HTTP clients, sockets or SDKs. Nothing here may call out (test-strategy §9).
- **Interfaces are `typing.Protocol`** classes with fully typed methods.
- **Services import the Protocol modules only**, never `stubs/` (import-linter `forbidden` contract, ARCH-07). Only `main.py` / the dependency wiring imports stubs.
- Keep the interfaces minimal — just what the specs use. A new method needs a spec change.
- Never log `video_ref` together with learner identifiers.

## Don't

- Don't build real video streaming, CDN, media upload or payment logic — out of scope (app_spec §5).
- Don't put business rules here.

Specs: [app_spec.md](../../../../specs/app_spec.md) §5, A-7, A-8; [architecture.md](../../../../docs/architecture.md) §3.1, §7.
