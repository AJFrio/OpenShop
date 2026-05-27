# Engineering harness

OpenShop adopts the [harness engineering](https://openai.com/index/harness-engineering/) approach: optimize the **environment** (docs, lints, tests, CI) so coding agents and humans can ship reliably without a monolithic instruction file.

## Principles

1. **`AGENTS.md` is a map, not an encyclopedia** — keep it short; deep knowledge lives in `docs/`.
2. **Mechanical enforcement** — doc structure and import layers are checked in CI.
3. **Progressive disclosure** — agents follow links from the map into domain docs.
4. **Golden principles in repo** — taste and rules are versioned in [design-docs/core-beliefs.md](./design-docs/core-beliefs.md).

## What runs in CI

| Check | Command | Purpose |
|-------|---------|---------|
| ESLint (harness) | `npm run lint:harness` | Harness scripts in CI |
| ESLint (full) | `npm run lint` | Whole repo; see TD-004 in tech-debt-tracker |
| Harness | `npm run harness:validate` | Docs tree + architecture imports |
| Tests | `npm test -- --run` | Vitest unit/integration |
| Harness tests | included in `harness:validate` | Structural tests in `tests/harness/` |

Workflow: [.github/workflows/harness.yml](../.github/workflows/harness.yml)

## Local validation

```bash
npm run harness:validate
npm run lint
npm test -- --run
```

## Directory layout (knowledge base)

```
AGENTS.md                 # Agent table of contents
ARCHITECTURE.md           # Short architecture map
docs/
├── design-docs/          # Beliefs and design catalog
├── exec-plans/           # Active/completed plans, tech debt
├── generated/            # Generated or curated schemas (KV model)
├── product-specs/        # Feature specifications
├── references/           # External doc pointers for agents
├── DESIGN.md             # Layering and patterns
├── FRONTEND.md           # UI conventions
├── PLANS.md              # Planning workflow
├── PRODUCT_SENSE.md      # Product context
├── QUALITY_SCORE.md      # Quality grades by domain
├── RELIABILITY.md        # Reliability expectations
└── SECURITY.md           # Security model
```

## Adding a new rule

1. Document intent in `docs/design-docs/` or `docs/DESIGN.md`.
2. Encode enforcement in `scripts/harness/` or ESLint if possible.
3. Add a harness test if the rule is structural.
4. Run `npm run harness:validate` before merging.

## Doc gardening

When code behavior changes, update the relevant doc in the same PR. If `docs/generated/kv-data-model.md` drifts from `src/lib/kv.js`, fix the doc or add a generation step in a follow-up.
