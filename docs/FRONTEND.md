# Frontend

React 19 + Vite + Tailwind CSS 4 + ShadCN-style components under `src/components/ui/`.

## Entry points

| File | Role |
|------|------|
| `src/main.jsx` | React DOM mount |
| `src/App.jsx` | Routes (storefront + `/admin`) |
| `src/index.css` | Global styles |

## Structure

```
src/pages/storefront/   # Public shop pages
src/pages/admin/        # Admin shell (AdminDashboard, AdminLayout) + feature pages
src/components/storefront/
src/components/storefront/page-builder/  # Puck config + render-only storefront blocks
src/components/admin/store-settings/  # Shared store settings / theme form helpers
src/components/admin/
src/components/ui/      # Shared primitives (button, card, input, …)
src/contexts/           # Cart, theme
src/api/                # Fetch wrappers for public/admin APIs
```

## Conventions

- **Styling:** Tailwind utility classes; theme tokens in `src/styles/storefront-theme.css` and `admin-theme.css`.
- **Images:** Use `normalizeImageUrl` from `src/lib/utils.js` for consistent CDN/proxy URLs.
- **Admin auth:** `adminApiRequest` attaches `X-Admin-Token` from session storage.
- **Cart:** `CartContext` persists to `localStorage`.
- **Page builder:** Home/About content is stored as Puck JSON from `/api/storefront/pages/:slug`; `Navbar`, `Footer`, product pages, collection pages, cart, and checkout remain outside Puck.

## Routing

Public routes and admin are client-side via React Router. The Worker serves `index.html` for SPA paths—see [ARCHITECTURE.md](./ARCHITECTURE.md).

## When changing UI

1. Match existing component patterns in `src/components/ui/`.
2. Do not embed secret keys or admin passwords in client code.
3. Prefer existing API modules in `src/api/` over raw `fetch` scattered in components.

## Related

- [CUSTOMIZATION.md](./CUSTOMIZATION.md)
- [API.md](./API.md)
