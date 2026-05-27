# OpenShop — Agent map

This file is the **table of contents** for agents working in this repository. It is intentionally short (~100 lines). Detailed knowledge lives in `docs/` and is validated by the engineering harness (`npm run harness:validate`).

**Methodology:** [Harness engineering](https://openai.com/index/harness-engineering/) — humans steer, agents execute; repository knowledge is the system of record.

## What this project is

OpenShop is an open-source e-commerce platform on **Cloudflare Workers** (Hono API + React/Vite storefront), **Cloudflare KV** for data, and **Stripe** for checkout. Multi-store deployments share one codebase with per-site `wrangler.toml` configs.

## Before you change code

1. Read the task and identify which **domain** is affected (products, collections, checkout, admin, media, settings, analytics).
2. Open [ARCHITECTURE.md](./ARCHITECTURE.md) for the layer map and import rules.
3. Open the relevant doc under `docs/` (see index below).
4. Run `npm run harness:validate` and `npm test -- --run` before opening a PR.

## Repository layout (code)

| Path | Role |
|------|------|
| `src/worker.js` | Worker entry, global middleware |
| `src/routes/` | HTTP handlers (public + admin) |
| `src/services/` | Business logic and KV orchestration |
| `src/middleware/` | Auth, CORS, limits, errors |
| `src/lib/`, `src/utils/` | Shared primitives (no route/UI imports) |
| `src/config/` | Constants and env helpers |
| `src/components/`, `src/pages/` | React UI (storefront + admin) |
| `src/api/` | Browser-side API client |
| `tests/` | Unit and integration tests (Vitest) |
| `scripts/` | Setup, deploy, build, harness validators |

**Layer rule (enforced):** `config` → `lib`/`utils` → `services` → `routes`/`middleware` → UI. Services must not import routes, pages, or components. See [docs/DESIGN.md](./docs/DESIGN.md).

## Documentation index

### Harness & quality

| Doc | Purpose |
|-----|---------|
| [docs/HARNESS.md](./docs/HARNESS.md) | How the engineering harness works |
| [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) | Domain quality grades and gaps |
| [docs/design-docs/core-beliefs.md](./docs/design-docs/core-beliefs.md) | Agent-first operating principles |
| [docs/design-docs/index.md](./docs/design-docs/index.md) | Design doc catalog |

### Architecture & implementation

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Top-level map (start here) |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Full technical architecture |
| [docs/DESIGN.md](./docs/DESIGN.md) | Layering, boundaries, patterns |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | React, routing, UI conventions |
| [docs/SECURITY.md](./docs/SECURITY.md) | Auth, secrets, CSP |
| [docs/RELIABILITY.md](./docs/RELIABILITY.md) | Errors, limits, edge behavior |
| [docs/generated/kv-data-model.md](./docs/generated/kv-data-model.md) | KV keys and entity shapes |

### Product & plans

| Doc | Purpose |
|-----|---------|
| [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) | Product goals and user mental model |
| [docs/product-specs/index.md](./docs/product-specs/index.md) | Feature specs index |
| [docs/PLANS.md](./docs/PLANS.md) | How we write and store plans |
| [docs/exec-plans/active/](./docs/exec-plans/active/) | In-flight execution plans |
| [docs/exec-plans/completed/](./docs/exec-plans/completed/) | Finished plans |
| [docs/exec-plans/tech-debt-tracker.md](./docs/exec-plans/tech-debt-tracker.md) | Known debt |

### Operations & references

| Doc | Purpose |
|-----|---------|
| [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) | Env vars and setup |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deploy and multi-site |
| [docs/API.md](./docs/API.md) | HTTP API reference |
| [docs/STRIPE.md](./docs/STRIPE.md) | Payments and webhooks |
| [docs/TESTING.md](./docs/TESTING.md) | Test conventions |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local dev commands |
| [docs/references/](./docs/references/) | Curated external references for agents |

## Commands

```bash
npm install
npm run dev              # Worker + frontend (wrangler dev)
npm run dev:frontend     # Vite only
npm run lint             # ESLint
npm run harness:validate # Docs structure + architecture rules
npm test -- --run        # Vitest
npm run build            # Production frontend build
npm run build:all        # Frontend + worker bundle
```

## Golden principles (summary)

Full list: [docs/design-docs/core-beliefs.md](./docs/design-docs/core-beliefs.md).

1. **Repository is truth** — decisions belong in versioned docs or code, not chat-only context.
2. **Boundaries at the edge** — validate request/response shapes at HTTP and KV boundaries.
3. **No secrets in the client** — Stripe secret keys and admin passwords stay in Worker `env` only.
4. **Prefer existing services** — extend `src/services/` rather than duplicating KV access in routes.
5. **Tests for behavior** — add or update tests in `tests/` when changing business logic.

## When stuck

Ask what **capability** is missing (doc, lint rule, test, or example), then add it to the repo so the next agent run succeeds—not “try harder” in isolation.
