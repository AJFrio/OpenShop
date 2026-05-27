# Design & layering

How OpenShop code is organized for human and agent maintainability.

## Layer rules

| Layer | Path | May import |
|-------|------|------------|
| Foundation | `src/config/`, `src/lib/`, `src/utils/` | Same layer only |
| Domain | `src/services/` | foundation |
| HTTP | `src/routes/`, `src/middleware/`, `src/worker.js` | domain, foundation |
| Client API | `src/api/` | foundation (browser-safe) |
| UI | `src/pages/`, `src/components/`, `src/contexts/` | client API, foundation |

**Forbidden:** `services` → `routes` | `pages` | `components` | `api`. Foundation → anything above domain.

Enforced by: `npm run harness:validate`

## Patterns

### Services own business logic

Routes should stay thin: parse input, call a service, map errors to HTTP. KV reads/writes go through `KVManager` in `src/lib/kv.js` via services—not ad hoc in routes.

### Validate at boundaries

- HTTP: use `src/middleware/validation.js` and route-level checks.
- External APIs: treat Stripe responses as untrusted; normalize before storing in KV.

### Errors

Use `src/utils/errors.js` (`NotFoundError`, etc.) in services; `errorHandler` middleware maps them to JSON responses.

### Frontend data access

Storefront and admin UIs call `src/api/*` or `adminApiRequest` in `src/lib/auth.js`—not Worker services directly.

## Anti-patterns

- Duplicating KV key strings outside `KVManager` / [kv-data-model.md](./generated/kv-data-model.md)
- Importing `Stripe` or secret env in React components
- Large god-files (>400 lines)—split by domain when extending

## Related

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [FRONTEND.md](./FRONTEND.md)
- [design-docs/core-beliefs.md](./design-docs/core-beliefs.md)
