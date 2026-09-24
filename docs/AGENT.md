# Store agent

The admin dashboard Store Agent (`AgentChat` on `/admin`) is an OpenRouter-backed assistant that **reads and writes the same KV data a merchant can change in admin**. Tool calls dispatch in-process through existing `/api/admin/*` routes, so auth, validation, product limits, and Stripe sync match the UI.

## What it can edit

| Area | Tools | Persists as |
|------|-------|-------------|
| Products | list/get/create/update/delete, including tagline, images, collection, archive, variants | `product:{id}` + Stripe |
| Merch images | `generate_product_image` | R2 + media library |
| Collections | list/get/create/update/delete, including hero image and archive | `collection:{id}` (navbar lists non-archived collections) |
| Pages | list/get/create/update/delete page-builder JSON | `storefront:page:{slug}` |
| Media | list/add/delete, plus `generate_image` for logos/heroes/page art | `media:{id}` + R2 |
| Store identity | get/update settings (logo, name, description, contact, address, hero seed fields) | `store:settings` |
| Theme / branding | get/update/reset colors, font, corners | `storefront:theme` |
| Orders | analytics, list orders, fulfill | Stripe + `order_fulfillment:{id}` |
| Developer (non-secret) | get public view; update `OPENROUTER_MODEL`, `OPENROUTER_IMAGE_MODEL`, `SITE_URL` | `developer:settings` |

There is **no separate navigation config**. The storefront nav is Home + every non-archived collection (product dropdowns) + the logo from store settings. Custom pages live at `/p/{slug}`; link them from page content.

## What it cannot write

Secret keys (`STRIPE_SECRET_KEY`, `OPENROUTER_API_KEY`) and the admin password are not accepted as tool arguments. Putting secrets through the chat model would leak them in logs and transcripts. Merchants set those in **Developer Settings**.

## Implementation

- HTTP: `src/routes/admin/agent.js` (`POST /api/admin/agent/chat`, `GET /api/admin/agent/models`)
- Tools: `src/routes/admin/agentTools.js` (`TOOL_DEFINITIONS`, `executeAgentTool`)
- UI: `src/components/admin/AgentChat.jsx`
- Image persist: `POST /api/admin/ai/generate-and-store` and `POST /api/admin/ai/generate-merch-image`

## Related

- [API.md](./API.md)
- [FRONTEND.md](./FRONTEND.md)
- [SECURITY.md](./SECURITY.md)
- [product-specs/store-agent.md](./product-specs/store-agent.md)
