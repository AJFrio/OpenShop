# OpenShop Development Guide

OpenShop is a React 19 + Vite storefront/admin served **by** a Hono Cloudflare Worker
(ASSETS binding, single-process prod parity), with KV for data and Stripe for checkout.
Local development runs the exact same architecture on your machine via `wrangler dev --local`
— no Cloudflare account, no real credentials, no network calls.

## Quick start

```bash
npm install
npm run dev:local     # generate config (if needed) + worker at http://localhost:8787
```

Then:

- Storefront: http://localhost:8787/
- Admin dashboard: http://localhost:8787/admin — password `local-dev-password`

The first `dev:local` run generates local config; seed data next:

```bash
npm run dev:seed      # idempotent: seeds local KV + local R2 media
```

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev:local` | Generates config if missing, then runs `wrangler dev --local` (foreground) |
| `npm run dev:seed` | Seeds local KV fixtures + uploads seed SVGs to the local R2 simulation (idempotent) |
| `npm run dev:fresh` | Wipes `.wrangler/` local state, regenerates config (`--force`), reseeds |
| `npm run smoke` | Full end-to-end smoke test (`scripts/dev/smoke.sh`) — build, serve, assert, exit 0/1 |
| `npm run dev:frontend` | Vite dev server only (see HMR workflow below) |
| `npm test -- --run` | Vitest suite |
| `npm run lint` | ESLint |
| `npm run harness:validate` | Docs structure + architecture layer checks |

## How local dev works

`scripts/dev/build-local-config.mjs` generates three gitignored files from
`template.toml.example` semantics:

| File | Purpose |
|------|---------|
| `wrangler.toml` | `main = src/worker.js`, `nodejs_compat`, KV binding `YOUR_STORE_KV` (dummy 32-hex id), R2 binding `IMAGES` → bucket `local-images`, `[assets] directory = "dist"` with `ASSETS` binding, `SITE_URL = http://localhost:8787` |
| `.dev.vars` | Worker-side secrets for `wrangler dev`: `ADMIN_PASSWORD`, `SITE_URL`, `STRIPE_SECRET_KEY` |
| `.env.local` | Client-side `VITE_` vars read by Vite (e.g. `VITE_STRIPE_PUBLISHABLE_KEY`) |

Regeneration is idempotent. A hand-edited `wrangler.toml` (one without the generator
marker) is never overwritten silently — pass `--force` to replace it.

Everything stays on your machine:

- **KV** is simulated under `.wrangler/state` (scoped to the dummy namespace id, which is
  constant so seeded data survives regeneration).
- **R2** is simulated locally in the same state dir; `/api/images/:key` serves objects from it.
- **Assets**: the worker itself serves `dist/` through the ASSETS binding, exactly like production.

### Seeded data

`scripts/dev/seed-fixtures.mjs` builds entries matching
[docs/generated/kv-data-model.md](./docs/generated/kv-data-model.md): 6 products across
2 collections, 3 media records (`media/seed-*.svg`, served from local R2), store settings,
and Puck page content for the `home` and `about` slugs. `scripts/dev/seed-local.mjs` writes
them via `wrangler kv bulk put --local` and also stores an admin token entry
(`admin_token:<sha256(token)>`, 24h TTL) so API calls work without logging in first.

Local credentials (safe, never real):

```
Admin password: local-dev-password
Admin token:    local-dev-admin-token
Stripe secret:  sk_test_local_no_network   (reserved sentinel)
Publishable:    pk_test_local_no_network
```

## Optional HMR workflow

By default the worker serves both API and built assets — no Vite server involved. For
frontend hot reload while keeping the worker's API:

```bash
DEV_API_PROXY=1 npm run dev:frontend   # vite on :5173, /api proxied to :8787
npm run dev:local                      # in another terminal
```

The proxy exists in `vite.config.js` but is inert unless `DEV_API_PROXY` is set.

## Smoke test

```bash
npm run smoke
```

Generates config → builds the frontend → seeds → starts `wrangler dev --local` headless →
asserts: `GET /` returns 200 HTML with expected markup; `GET /api/products` returns ≥6
products; `GET /api/collections` returns ≥2; `GET /api/store-settings` returns 200;
`POST /api/admin/login` returns a token; `POST /api/admin/products` creates and
`DELETE` cleans up (exercising the Stripe degradation path) → kills the worker → exit 0.

## Known limitations (local mode)

- **Real Stripe payment redirect unavailable.** Checkout requires a real Stripe key;
  with the reserved `sk_test_local_no_network` sentinel, remote product/price sync is
  skipped (logged once) while KV writes continue, so admin CRUD works offline. Any other
  key value behaves normally.
- **R2 is simulated locally** — objects live in `.wrangler/state`, not any real bucket.
- **Google Drive OAuth / AI features** are not usable locally (no real credentials).
- **Stripe-backed analytics** return nothing without a real key.

## Testing

```bash
npm test -- --run          # unit + integration (vitest)
bash scripts/dev/smoke.sh  # end-to-end against a real local worker
```

Harness tests live in `tests/harness/`; docs/architecture rules are enforced by
`npm run harness:validate`. See [docs/HARNESS.md](./docs/HARNESS.md) and
[docs/TESTING.md](./docs/TESTING.md).

## Deployment

Local development never touches Cloudflare. To deploy for real, see
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) and [docs/CONFIGURATION.md](./docs/CONFIGURATION.md).
