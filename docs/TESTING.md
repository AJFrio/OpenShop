# Testing Guide

Testing guidelines and examples for OpenShop development and deployment.

## Manual Testing Checklist

### Storefront Testing

**Product Browsing:**
- [ ] Browse all products on homepage
- [ ] Filter products by collection
- [ ] View individual product pages
- [ ] Navigate between products
- [ ] Test product image carousel
- [ ] Verify product descriptions display correctly

**Shopping Cart:**
- [ ] Add items to cart
- [ ] Update item quantities
- [ ] Remove items from cart
- [ ] Test cart persistence (refresh page)
- [ ] Verify cart on mobile (full-screen overlay)
- [ ] Verify cart on desktop (sidebar)
- [ ] Test cart item count badge

**Checkout:**
- [ ] Complete single item checkout
- [ ] Complete multi-item cart checkout
- [ ] Test with Stripe test cards
- [ ] Verify success page after payment
- [ ] Test cancel flow
- [ ] Verify payment processing

**Responsive Design:**
- [ ] Test on mobile devices
- [ ] Test on tablets
- [ ] Test on desktop
- [ ] Verify navigation works on all sizes
- [ ] Check cart behavior on mobile vs desktop
- [ ] Test image display on different screens

### Admin Dashboard Testing

**Authentication:**
- [ ] Login with correct password
- [ ] Verify login fails with wrong password
- [ ] Test session expiration (24 hours)
- [ ] Verify auto-logout on expired session
- [ ] Test token storage

**Product Management:**
- [ ] Create new product
- [ ] Edit existing product
- [ ] Delete product
- [ ] Upload multiple product images
- [ ] Test product variants
- [ ] Verify Stripe synchronization
- [ ] Test price updates

**Collection Management:**
- [ ] Create new collection
- [ ] Edit existing collection
- [ ] Delete collection
- [ ] Upload hero banner image
- [ ] Assign products to collections
- [ ] Remove products from collections

**Store Customization:**
- [ ] Update store name
- [ ] Change logo (text and image)
- [ ] Update store description
- [ ] Customize theme settings
- [ ] Verify changes reflect on storefront

**Analytics:**
- [ ] View revenue dashboard
- [ ] Check order statistics
- [ ] Verify chart displays
- [ ] Test date range filters

**Optional Features:**
- [ ] Test AI image generation (if enabled)
- [ ] Test Google Drive upload (if enabled)
- [ ] Verify image proxy works

## API Testing

### Public Endpoints

**Get All Products:**
```bash
curl https://your-project.workers.dev/api/products
```

**Get Single Product:**
```bash
curl https://your-project.workers.dev/api/products/prod_123
```

**Get All Collections:**
```bash
curl https://your-project.workers.dev/api/collections
```

**Get Collection Products:**
```bash
curl https://your-project.workers.dev/api/collections/coll_123/products
```

**Get Store Settings:**
```bash
curl https://your-project.workers.dev/api/store-settings
```

### Admin Endpoints

**Admin Login:**
```bash
curl -X POST https://your-project.workers.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

**Create Product (Authenticated):**
```bash
curl -X POST https://your-project.workers.dev/api/admin/products \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_token_here" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 29.99,
    "currency": "usd",
    "images": ["https://example.com/image.jpg"]
  }'
```

**Update Product:**
```bash
curl -X PUT https://your-project.workers.dev/api/admin/products/prod_123 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_token_here" \
  -d '{
    "name": "Updated Product Name",
    "price": 39.99
  }'
```

**Delete Product:**
```bash
curl -X DELETE https://your-project.workers.dev/api/admin/products/prod_123 \
  -H "X-Admin-Token: your_token_here"
```

**Get Analytics:**
```bash
curl https://your-project.workers.dev/api/analytics \
  -H "X-Admin-Token: your_token_here"
```

### Checkout Endpoints

**Create Checkout Session:**
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

**Create Cart Checkout:**
```bash
curl -X POST https://your-project.workers.dev/api/create-cart-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"priceId": "price_123", "quantity": 2},
      {"priceId": "price_456", "quantity": 1}
    ],
    "successUrl": "https://your-store.com/success",
    "cancelUrl": "https://your-store.com/cancel"
  }'
```

## Automated Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

Unit tests are located in `tests/unit/` and test individual service functions and utilities.

### Integration Tests

Run integration tests:
```bash
npm run test:integration
```

Integration tests are located in `tests/integration/` and test API endpoints and workflows.

### Test Coverage

Generate test coverage report:
```bash
npm run test:coverage
```

## Stripe Testing

### Test Cards

Use these test card numbers in Stripe test mode:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Declined Payment:**
- Card: `4000 0000 0000 0002`

**Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`

### Test Scenarios

1. **Successful Checkout**
   - Use success test card
   - Complete checkout flow
   - Verify success page
   - Check Stripe dashboard for payment

2. **Declined Payment**
   - Use decline test card
   - Verify error handling
   - Check user sees appropriate message

3. **3D Secure**
   - Use 3D Secure test card
   - Complete authentication
   - Verify payment succeeds

4. **Refunds**
   - Process refund from Stripe dashboard
   - Verify refund appears in analytics

## Performance Testing

### Load Testing

Test your store's performance under load:

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-store.workers.dev/api/products

# Using curl for timing
curl -w "@curl-format.txt" -o /dev/null -s https://your-store.workers.dev/
```

### Response Time Testing

Test response times for key endpoints:

```bash
# Time product listing
time curl https://your-store.workers.dev/api/products

# Time single product
time curl https://your-store.workers.dev/api/products/prod_123

# Time checkout creation
time curl -X POST https://your-store.workers.dev/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_123","quantity":1}'
```

## Browser Testing

### Cross-Browser Testing

Test on multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Device Testing

Test on different devices:
- Desktop (1920x1080, 1366x768)
- Tablet (iPad, Android tablets)
- Mobile (iPhone, Android phones)

## Security Testing

### Authentication Testing

- [ ] Verify admin endpoints require authentication
- [ ] Test with invalid tokens
- [ ] Test with expired tokens
- [ ] Verify public endpoints are accessible
- [ ] Test password validation

### Input Validation Testing

- [ ] Test with malicious input
- [ ] Verify SQL injection protection (N/A for KV)
- [ ] Test XSS protection
- [ ] Verify input sanitization
- [ ] Test file upload restrictions

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All manual tests pass
- [ ] API tests pass
- [ ] Performance is acceptable
- [ ] Security tests pass
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Stripe integration tested
- [ ] Error handling verified
- [ ] Logging and monitoring set up
- [ ] Backup strategy in place

## Continuous Testing

### Local Development

Run tests during development:
```bash
# Watch mode
npm test -- --watch

# Single run
npm test
```

### Pre-Commit

Run tests before committing:
```bash
npm test
npm run lint
```

### CI/CD

Tests should run automatically in CI/CD pipeline:
- On pull requests
- Before merging to main
- Before deployment

## Best Practices

- **Test Early**: Write tests as you develop features
- **Test Often**: Run tests frequently during development
- **Test Everything**: Cover all user flows and edge cases
- **Automate**: Use automated tests for regression prevention
- **Document**: Document test scenarios and results
- **Maintain**: Keep tests up to date with code changes

For more information, see:
- [Development Guide](../DEVELOPMENT.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [API Reference](API.md)

