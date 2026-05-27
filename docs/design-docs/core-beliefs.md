# Core beliefs (golden principles)

Opinionated rules for humans and coding agents. When code diverges, fix code or update this doc—then enforce via harness where possible.

## 1. Repository is the system of record

Slack threads and issue comments are not visible to agents. Decisions that affect implementation belong in `docs/` or code in the same PR.

## 2. Map, not manual

`AGENTS.md` stays a table of contents. Do not add a 500-line instruction blob; add a focused doc and link it.

## 3. Boundaries over guesswork

Parse and validate data at HTTP and KV boundaries. Do not assume Stripe or KV payloads match expectations without checks.

## 4. Secrets stay in the Worker

Never commit `.env`, never put `STRIPE_SECRET_KEY` or `ADMIN_PASSWORD` in React code or public repos.

## 5. Services before duplication

Before adding KV logic in a route, extend or use `src/services/`. Shared helpers belong in `src/lib/` or `src/utils/`.

## 6. Tests encode behavior

Changing business logic without updating `tests/` is incomplete work. Prefer integration tests for HTTP contracts.

## 7. Continuous small cleanup

Prefer follow-up PRs for nits over growing “AI slop.” Record debt in [tech-debt-tracker.md](../exec-plans/tech-debt-tracker.md).

## 8. Boring, inspectable dependencies

Prefer dependencies agents can reason about (Hono, Vitest, ESLint). Wrap opaque SDKs behind services when needed.

## Enforcement

| Principle | Enforcement |
|-----------|-------------|
| Map not manual | `validate-docs.mjs` (AGENTS.md line limit) |
| Layer boundaries | `validate-architecture.mjs` |
| Secrets | Code review + SECURITY.md checklist |
| Tests | CI `npm test` |
