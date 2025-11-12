# Stripe Integration Guide

Complete guide to Stripe integration in OpenShop, including automatic synchronization, webhook setup, and payment processing.

## Overview

OpenShop automatically synchronizes products with Stripe, creating products and prices in your Stripe account when you create them in the admin dashboard. This ensures seamless payment processing without manual configuration.

## Automatic Synchronization

### Product Creation

When you create a product in OpenShop:

1. **Stripe Product Created** - A corresponding product is created in Stripe
2. **Stripe Price Created** - A price is created for the product's base price
3. **Automatic Linking** - The product and price IDs are stored in OpenShop for checkout

### Price Management

- **Product edits**: Updating name, description, or images syncs to the corresponding Stripe Product. Description is only updated if non-empty. Up to 8 images are sent to Stripe.
- **Base price change**: When the product base price changes, a new Stripe Price is created; existing Prices are preserved for historical data.
- **Variant prices**: Variants with `hasCustomPrice` create dedicated Stripe Prices. Variants without a custom price use the base price. Secondary variant set (if used) follows the same rules.
- **KV storage**: Product records in KV are merged on update, and image fields are normalized to arrays to maintain consistency across the UI and Stripe sync.

### Checkout Sessions

OpenShop supports two types of checkout:

1. **Single Item Checkout** - Direct checkout from product page
2. **Cart Checkout** - Multi-item checkout from shopping cart

Both create secure Stripe Checkout Sessions that handle payment processing.

## Stripe Configuration

### Getting Your API Keys

1. Sign up for a [Stripe account](https://stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (for server-side use)
4. Copy your **Publishable key** (for client-side use)

### Test vs Live Mode

- **Test Mode**: Use `sk_test_` and `pk_test_` keys for development
- **Live Mode**: Use `sk_live_` and `pk_live_` keys for production

Always test thoroughly in test mode before going live.

### Setting Up Keys

Add your Stripe keys during `npm run setup` or manually:

**Local Development** (`.env` file):
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

**Production** (via Wrangler):
```bash
wrangler secret put STRIPE_SECRET_KEY
```

The publishable key should be set as an environment variable in your `wrangler.toml` or site configuration.

## Webhook Setup (Optional)

Webhooks allow you to track order completion and payment events in real-time.

### Setting Up Webhooks

1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add Endpoint**: `https://your-project.workers.dev/api/stripe-webhook`
3. **Select Events**:
   - `checkout.session.completed` - Fired when a checkout session is completed
   - `payment_intent.succeeded` - Fired when a payment is successfully processed

### Webhook Security

Stripe webhooks include a signature that verifies the request came from Stripe. OpenShop validates this signature to ensure webhook security.

### Handling Webhook Events

You can extend OpenShop to handle webhook events by modifying the webhook handler in `src/routes/public/checkout.js`. Common use cases:

- Update order status in your system
- Send confirmation emails
- Update inventory
- Trigger fulfillment processes

## Payment Flow

### Customer Checkout Process

1. **Customer adds items to cart** - Items stored in browser localStorage
2. **Customer clicks checkout** - Creates Stripe Checkout Session
3. **Stripe Checkout** - Customer enters payment details on Stripe's secure page
4. **Payment Processing** - Stripe processes the payment
5. **Success Redirect** - Customer redirected to success page
6. **Webhook Notification** - (Optional) Your server notified of payment completion

### Checkout Session Configuration

Checkout sessions are configured with:

- **Line Items**: Products and quantities from cart
- **Success URL**: Where to redirect after successful payment
- **Cancel URL**: Where to redirect if customer cancels
- **Currency**: From product configuration (default: USD)
- **Mode**: Payment (one-time) or Subscription (recurring)

## Testing Payments

### Test Cards

Use these test card numbers in Stripe test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### Test Scenarios

1. **Successful Payment** - Use success test card
2. **Declined Payment** - Use decline test card
3. **3D Secure** - Use requires authentication card
4. **Refunds** - Process refunds from Stripe Dashboard

## Best Practices

### Security

- ✅ Never expose your secret key in client-side code
- ✅ Always use HTTPS in production
- ✅ Validate webhook signatures
- ✅ Use test mode during development

### Performance

- ✅ Cache product data when possible
- ✅ Use Stripe's idempotency keys for retries
- ✅ Handle webhook events asynchronously

### Error Handling

- ✅ Handle payment failures gracefully
- ✅ Provide clear error messages to customers
- ✅ Log payment errors for debugging
- ✅ Implement retry logic for transient failures

## Troubleshooting

### Common Issues

**Issue**: Products not syncing to Stripe
- **Solution**: Check that `STRIPE_SECRET_KEY` is correctly set and has proper permissions

**Issue**: Checkout session creation fails
- **Solution**: Verify product has valid `stripePriceId` and price exists in Stripe

**Issue**: Webhooks not received
- **Solution**: Check webhook endpoint URL is correct and accessible, verify webhook signature validation

**Issue**: Payment succeeds but order not recorded
- **Solution**: Check webhook handler is properly configured and processing events

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

