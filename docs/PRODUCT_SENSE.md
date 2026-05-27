# Product sense

Who OpenShop is for and what “good” looks like.

## Users

| Persona | Goal |
|---------|------|
| Store owner | Launch a shop quickly on Cloudflare free tier |
| Developer | Fork, customize, deploy many stores from one repo |
| Shopper | Fast, mobile-friendly browse and Stripe checkout |

## Core jobs-to-be-done

1. **Show products** — collections, product detail, images, variants.
2. **Sell** — cart → Stripe Checkout → success page.
3. **Operate** — admin CRUD, branding, analytics without exposing admin in the nav.

## Non-goals (current)

- Multi-tenant SaaS control plane in one deployment (each store is a separate Worker/KV).
- Built-in inventory ERP or shipping carrier integrations beyond Stripe.
- Replacing Stripe Dashboard for payout accounting.

## Quality bar

- Storefront loads and works on mobile.
- Admin actions require auth; public APIs are read-only where applicable.
- Stays within Cloudflare free-tier assumptions documented in [PERFORMANCE.md](./PERFORMANCE.md).

## Specs

Feature-level detail: [product-specs/](./product-specs/index.md).
