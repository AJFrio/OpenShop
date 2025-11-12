# OpenShop API Reference

Complete API documentation for all OpenShop endpoints.

## Public Endpoints (Read-Only)

These endpoints are publicly accessible and require no authentication.

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/products` | `GET` | List all products | None |
| `/api/products/:id` | `GET` | Get single product | None |
| `/api/collections` | `GET` | List all collections | None |
| `/api/collections/:id` | `GET` | Get single collection | None |
| `/api/collections/:id/products` | `GET` | Get products in collection | None |
| `/api/store-settings` | `GET` | Get store configuration | None |

## Checkout Endpoints

These endpoints handle payment processing and checkout flows.

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/create-checkout-session` | `POST` | Single item checkout | None |
| `/api/create-cart-checkout-session` | `POST` | Multi-item cart checkout | None |
| `/api/image-proxy?src=<url>` | `GET` | Proxy for Google Drive images | None |

## Admin Endpoints (Authenticated)

These endpoints require admin authentication via the `X-Admin-Token` header.

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/admin/login` | `POST` | Admin authentication | Password |
| `/api/admin/products` | `POST` | Create product | Admin Token |
| `/api/admin/products/:id` | `PUT, DELETE` | Update/delete product | Admin Token |
| `/api/admin/store-settings` | `PUT` | Update store settings | Admin Token |
| `/api/analytics` | `GET` | Revenue and order analytics | Admin Token |
| `/api/admin/ai/generate-image` | `POST` | Generate image via Gemini | Admin Token |
| `/api/admin/drive/status` | `GET` | Google Drive connection status | Admin Token |
| `/api/admin/drive/oauth/start` | `GET` | Begin Google Drive OAuth | None |
| `/api/admin/drive/oauth/callback` | `GET` | Handle Drive OAuth callback | None |
| `/api/admin/drive/upload` | `POST` | Upload image to Google Drive | Admin Token |

> **Note**: Drive OAuth endpoints are intentionally unauthenticated to support the popup OAuth flow. All other Drive actions require admin auth.

## Authentication

### Admin Login

**Endpoint**: `POST /api/admin/login`

**Request Body**:
```json
{
  "password": "your_admin_password"
}
```

**Response**:
```json
{
  "token": "admin_token_here",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

**Usage**: Store the token in `localStorage` and include it in subsequent admin requests as the `X-Admin-Token` header.

### Authenticated Requests

Include the admin token in the request header:

```
X-Admin-Token: your_admin_token_here
```

Tokens expire after 24 hours and must be refreshed by logging in again.

## Example Requests

### Get All Products

```bash
curl https://your-project.workers.dev/api/products
```

### Get Single Product

```bash
curl https://your-project.workers.dev/api/products/prod_123
```

### Admin Login

```bash
curl -X POST https://your-project.workers.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

### Create Product (Authenticated)

```bash
curl -X POST https://your-project.workers.dev/api/admin/products \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_token_here" \
  -d '{
    "name": "New Product",
    "description": "Product description",
    "price": 29.99,
    "currency": "usd",
    "images": ["https://example.com/image.jpg"]
  }'
```

### Create Checkout Session

```bash
curl -X POST https://your-project.workers.dev/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_123",
    "quantity": 1,
    "successUrl": "https://your-store.com/success",
    "cancelUrl": "https://your-store.com/cancel"
  }'
```

