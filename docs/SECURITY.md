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
- Only `POST /api/admin/login` bypasses auth. `POST /api/admin/logout` requires a token and deletes that hashed session from KV.
- Changing or resetting the admin password (`PUT`/`DELETE /api/admin/developer-settings/password`) requires `currentPassword` and purges every `admin_token:*` session.
- Login rate limiting prefers `CF-Connecting-IP`, then the first `X-Forwarded-For` hop (trimmed, length-bounded).
- Tokens expire (24h); invalid token → 401.
- No admin link on public storefront—obscurity plus auth.

## Headers

Applied in `src/worker.js`: CSP, `X-Frame-Options: DENY`, HSTS on HTTPS, etc.

## Stripe

- Secret key: Worker only.
- Publishable key: safe for frontend Checkout.
- Webhook signing: verify signatures when webhooks are enabled—see [STRIPE.md](./STRIPE.md).

## CORS

When `CORS_ORIGINS` or `SITE_URL` is an allowlist, unmatched `Origin` values are not reflected (and credentials are not sent with a wildcard origin).

## Input validation

- Validate IDs and payloads at route/middleware boundaries.
- JSON bodies are parsed with `parseJsonBody`; malformed JSON is a 400, not a 500.
- Normalize image URLs; don’t fetch arbitrary URLs without proxy controls.

## Image proxy

`GET /api/image-proxy` only fetches Google Drive / googleusercontent hosts. Upstream `Content-Type` must be a raster image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`). HTML, SVG, and other types are rejected with 415. Responses include `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`.

## Store agent

Admin dashboard (`POST /api/admin/agent/chat`) can read and write the same store data as the rest of admin. Tool calls reuse `/api/admin/*` with the merchant's token. Secret keys and the admin password are not accepted as tool arguments — see [AGENT.md](./AGENT.md).

## Agent checklist (security PRs)

- [ ] No new secrets in client bundle or committed `.env`
- [ ] Admin endpoints remain behind auth middleware
- [ ] CSP still allows required Stripe domains if checkout changes
- [ ] KV writes don’t expose other tenants’ data (single namespace per store deployment)

## Reporting

See project README for issue/discussion links.
