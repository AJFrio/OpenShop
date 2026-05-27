# Quality score

Graded snapshot for agent prioritization. Update when a domain materially improves or regresses.

**Scale:** A (solid tests + docs + clear boundaries) · B (usable, gaps) · C (needs investment) · D (risky / undocumented)

| Domain | Layer | Grade | Notes |
|--------|-------|-------|-------|
| Products | services + routes | B | Unit + integration tests; KV model documented |
| Collections | services + routes | B | Integration coverage |
| Checkout / Stripe | services + routes | B | Stripe tests; webhook docs in STRIPE.md |
| Admin auth | middleware + routes | B | Auth integration tests |
| Store settings / theme | services + UI | C | Extend tests when changing settings |
| Analytics | services + admin UI | C | Perf tests exist; fewer integration tests |
| Media / R2 / AI | services + routes | C | Optional features; verify env docs |
| Storefront UI | pages + components | B | Manual UX; limited component tests |
| Documentation harness | docs + scripts | A | AGENTS.md map + CI validation |
| Architecture enforcement | harness scripts | A | Import layer linter |

## Gaps to close (priority)

1. Component-level tests for critical cart/checkout UI flows.
2. Keep [generated/kv-data-model.md](./generated/kv-data-model.md) aligned with `KVManager`.
3. Expand media/R2 integration tests when touching `MediaService`.

## How to update

After meaningful work in a domain, adjust the grade and Notes in the same PR.
