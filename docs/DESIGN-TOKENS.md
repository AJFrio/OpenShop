# OpenShop — Design Tokens

Canonical visual design language for the OpenShop product family. This file is the source of truth for color, typography, spacing, elevation, motion, iconography, and copy tone across all three surfaces:

- **OpenShop-Lander** — marketing site (sells the product)
- **OpenShop-Service** — PaaS dashboard (sign in → deploy stores)
- **OpenShop** — admin dashboard (manage the store)

The three surfaces must feel like one brand. Tokens are named here; each repo maps them onto its own styling system (Tailwind `@theme`, CSS custom properties, or `admin-theme.css` variables) without inventing new values.

---

## 1. Color

One accent family: **cart-aligned blue** (navy → sky). No purple, violet, or indigo. No second accent.

### Brand ramp (source of truth)

| Token | Hex | Role |
|-------|-----|------|
| `brand-50`  | `#eff6ff` | tint backgrounds (rare, light contexts) |
| `brand-100` | `#dbeafe` | subtle tint fills |
| `brand-200` | `#bfdbfe` | hover tint borders |
| `brand-300` | `#93c5fd` | active tint borders |
| `brand-400` | `#60a5fa` | **primary-light** — secondary accents, links |
| `brand-500` | `#3b82f6` | interactive hover accents |
| `brand-600` | `#2563eb` | **primary** — buttons, active states, focus |
| `brand-700` | `#1d4ed8` | primary pressed / hover-dark |
| `brand-800` | `#1e40af` | deep accents |
| `brand-900` | `#1e3a8a` | **primary-dark / navy** — deep hover, headers |
| `brand-950` | `#172554` | navy backgrounds |

**Existing repo mapping (do not rename):**
- Lander / Service: `--color-primary: #2563eb` (= `brand-600`), `--color-primary-dark: #1e3a8a` (= `brand-900`), `--color-primary-light: #60a5fa` (= `brand-400`).
- Admin (`admin-theme.css`): `--admin-accent` → `#2563eb`, `--admin-accent-hover` → `#1d4ed8`, `--admin-accent-light` → `#60a5fa`, `--admin-accent-dark` → `#1e3a8a`. Replace the legacy purple `#8b5cf6 / #7c3aed / #a78bfa / #6d28d9`.

### Neutrals (cool zinc, dark base)

| Token | Hex | Role |
|-------|-----|------|
| `surface-950` | `#09090b` | page background |
| `surface-900` | `#18181b` | card / section surface |
| `surface-800` | `#27272a` | borders, dividers |
| `text-primary` | `#f4f4f5` | main text |
| `text-secondary` | `#a1a1aa` | secondary text |
| `text-muted` | `#71717a` | muted text, placeholders |

### Semantic (shared, keep values)

- `success` `#22c55e`, `warning` `#f59e0b`, `error` `#ef4444`, `info` `#3b82f6`.

### Color rules

- Accent saturation stays below ~80%. Blue is the only accent hue.
- Backgrounds are tinted dark (`#09090b`), never pure `#000000`.
- One consistent cool-gray family everywhere — no mixing warm and cool grays.

---

## 2. Typography

- **Primary (body + UI):** `Plus Jakarta Sans` — weights 400 / 500 / 600 / 700 / 800.
- **Display serif:** `DM Serif Display` — **only** for hero/display headlines on the **Lander**. Zero serif in Service and Admin dashboards.
- **Numbers:** every price, metric, count, and stat uses `font-variant-numeric: tabular-nums` and the sans family — never serif, never proportional old-style digits.

### Rules

- Headlines: tight tracking (`tracking-tight`), `line-height` 1.05–1.1 for display, 1.15–1.25 for section heads.
- Body: max ~65ch line length, `line-height` 1.6–1.7.
- Labels/eyebrows: sentence case (not all-caps shouting); small, `tracking-wide`, `text-muted`.
- Use 500/600 weights for hierarchy, not just 400 and 700.
- `text-wrap: balance` on headlines, `text-wrap: pretty` on paragraphs.

---

## 3. Spacing & radius

- Base unit `0.25rem` (4px). Section padding generous on the marketing surface (marketing breathes); tighter but consistent on dashboards.
- Radius scale: `sm 0.375rem`, `DEFAULT 0.5rem`, `lg 0.75rem`, `xl 1rem`, `2xl 1.5rem`. Vary radius by context (tighter on inner controls, softer on containers) — avoid one uniform radius on everything.
- Buttons: `0.5rem` (not fully pill everywhere; pill is reserved for a single primary marketing CTA if desired).

---

## 4. Elevation & material

- **No glassmorphism.** Do not use `backdrop-filter: blur` panels. Remove existing `.glass-panel` blur treatments.
- Surfaces read as real materials via layered background tone + a **tinted** shadow (brand-hue at low alpha), not a black `box-shadow`.
- One ambient light source per page (e.g., a single top-right `brand` glow at low opacity). Do not scatter multiple gradient blobs.
- Grain/noise (optional) via an inline SVG `feTurbulence` data-URI overlay at very low opacity — zero dependencies.
- The Lander hero uses one dimensional focal object: a rendered storefront/checkout UI mock in brand tokens (sells the product). Never abstract 3D shapes or flat geometric blobs.

---

## 5. Motion

- GPU-only: animate `transform` and `opacity` only. Never animate `top/left/width/height`.
- Durations 200–300ms; `prefers-reduced-motion: reduce` disables.
- Motion serves meaning: hover/press/focus affordances, state changes, and (on the marketing surface) a single load-in stagger. No decorative micro-animations, no hover that changes nothing.

---

## 6. Iconography

- **No emojis** anywhere (code, markup, alt text, UI).
- Admin (`OpenShop`): `lucide-react` (already installed).
- Service (`OpenShop-Service`): inline SVG (no new dependency).
- Lander (`OpenShop-Lander`): existing Material Symbols outline set (already loaded) or inline SVG. No new icon dependency.
- Consistent stroke weight within a surface.

---

## 7. Copy tone

- **Outcome-first:** lead with what the merchant keeps, gains, or saves — not what the product "does".
- Sentence case (not Title Case). Active voice.
- Forbidden clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "game-changer", "delve", "tapestry", "In the world of…".
- No cutesy loader/status copy (e.g. "Checking the oil…", "Banging on the dash…"). One professional, static line per state.
- No em-dash `"—"` used as a bullet glyph. Use real icon bullets.
- Success messages: confident, no exclamation marks. Errors: direct ("We couldn't save your changes.").

---

## 8. Forbidden patterns (QA greps — must be zero after implementation)

| Repo | Grep | Rationale |
|------|------|-----------|
| Admin `src/` | `8b5cf6`, `7c3aed`, `a78bfa`, `6d28d9`, `violet`, `purple` | kill legacy purple |
| Lander `src/` | `backdrop-blur` | kill glassmorphism |
| Lander `src/` | `rounded-full bg-gradient-to-br.*blur-3xl` (multiple gradient blobs) | kill scattered blobs |
| Service `src/` | `Checking the oil`, `Wiring up the worker`, `Banging on the dash` | kill cutesy loader copy |
| Service `src/` | `"—"` em-dash bullets in plan cards | real icons instead |
| Lander + Service | `font-serif` on prices / numbers / metrics | serif is display-only (Lander hero) |
| Service + Admin | `font-serif` in dashboard components | no serif in dashboards |
| All | emojis in source / UI | icon sets only |

---

## 9. Scope boundaries

- **OpenShop storefront** (`storefront-theme.css`, `src/pages/storefront/`, `src/components/storefront/`) is the customer-facing theme and is **out of scope**. Only the admin surface (`admin-theme.css`, `src/pages/admin/`, `src/components/admin/`, `src/components/ui/`) is redesigned.
- Never commit built assets or secrets. OpenShop's `build.yml` owns `dist/` commits on main.
