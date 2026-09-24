# Security

Consolidated security model for agents. **Also:** [ARCHITECTURE.md](./ARCHITECTURE.md) security sections.

## Trust boundaries

```
Browser (untrusted)  →  HTTPS  →  Worker (trusted)  →  KV / Stripe
```

- Secrets exist only in Worker `env` bindings.
- Admin password never sent to the client except for login POST body over HTTPS.
- Session token: random, stored in KV with TTL; client sends `X-Admin-Token`.

## Authentication

- Admin routes under `/api/admin/*` use `verifyAdminAuth` middleware.
- Tokens expire (24h); invalid token → 401.
- No admin link on public storefront—obscurity plus auth.

## Headers

Applied in `src/worker.js`: CSP, `X-Frame-Options: DENY`, HSTS on HTTPS, etc.

## Stripe

- Secret key: Worker only.
- Publishable key: safe for frontend Checkout.
- Webhook signing: verify signatures when webhooks are enabled—see [STRIPE.md](./STRIPE.md).

## Input validation

- Validate IDs and payloads at route/middleware boundaries.
- Normalize image URLs; don’t fetch arbitrary URLs without proxy controls—see image proxy routes.

## Store agent

Admin dashboard (`POST /api/admin/agent/chat`) can read and write the same store data as the rest of admin. Tool calls reuse `/api/admin/*` with the merchant's token. Secret keys and the admin password are not accepted as tool arguments — see [AGENT.md](./AGENT.md).

## Agent checklist (security PRs)

- [ ] No new secrets in client bundle or committed `.env`
- [ ] Admin endpoints remain behind auth middleware
- [ ] CSP still allows required Stripe domains if checkout changes
- [ ] KV writes don’t expose other tenants’ data (single namespace per store deployment)

## Reporting

See project README for issue/discussion links.
