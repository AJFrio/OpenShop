# Core e-commerce

## Scope

Storefront browse, cart, Stripe checkout, and admin CRUD for products and collections.

## Storefront

- Home and collection pages list products from public API.
- Product detail shows images (carousel), variants, add-to-cart.
- Cart persists in `localStorage`; quantity updates and removal supported.
- Checkout creates Stripe session via Worker; success page after payment.

## Admin

- Login at `/admin` with password → token.
- CRUD products (images, variants, archive) and collections (hero image).
- Store settings: branding, theme-related fields.
- Website editor: Home and About page content use Puck JSON stored in KV; products, collections, cart, checkout, navigation, and footer remain code-owned storefront behavior.
- Analytics: revenue/orders from Stripe (admin-only).

## Out of scope

- Multi-vendor marketplace in one KV namespace.
- Native mobile apps.

## Verification

- `tests/integration/public-endpoints.test.js`
- `tests/integration/checkout.test.js`
- `tests/integration/admin-*.test.js`
