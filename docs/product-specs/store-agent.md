# Store agent

## Scope

The admin dashboard Store Agent can configure the same storefront surface a merchant can edit in admin: products, collections, media, pages, store settings, theme, and order fulfillment. Edits persist through existing admin APIs.

## Behavior

- The composer on `/admin` sends conversation + optional merch reference images to `POST /api/admin/agent/chat`.
- The model calls tools; each tool dispatches the matching `/api/admin/*` endpoint with the merchant's admin token.
- Successful tool results are written to KV (and Stripe / R2 when those services apply) the same way the admin UI would.
- Storefront navigation is derived from collections + logo settings; there is no independent nav document.
- Secret developer keys and the admin password are not writable through chat.

## Out of scope

- Changing Cloudflare account bindings or wrangler secrets from the agent.
- Multi-store orchestration (OpenShop Service / PaaS).

## Verification

- `tests/integration/admin-agent.test.js`
- `tests/integration/merch-designer.test.js`
