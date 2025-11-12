# OpenShop Configuration Guide

Complete guide to configuring OpenShop for local development and production deployment.

## Environment Variables

Create a `.env` file in the project root for local development:

```env
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Admin Configuration
ADMIN_PASSWORD=your_secure_admin_password

# Site Configuration
SITE_URL=https://your-project.workers.dev

# Optional: AI (Gemini) & Google Drive
# Used for admin-side AI image generation and Drive uploads
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
# Optional: customize the root folder created/used in Drive
DRIVE_ROOT_FOLDER=OpenShop
```

## Cloudflare Setup

The setup script (`npm run setup`) automatically configures:

- ✅ **KV Namespace** - Creates isolated data storage
- ✅ **Worker Deployment** - Deploys your application
- ✅ **Environment Variables** - Sets all required secrets
- ✅ **Optional Secrets** - You can add `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` later via `wrangler secret put` to enable AI and Drive features
- ✅ **Static Assets** - Configures asset serving
- ✅ **Custom Domain** - Sets up your unique subdomain

### Cloudflare API Token Permissions

When creating your Cloudflare API token, ensure it has the following permissions:

**Account — API settings:**
- Containers: Edit
- Secrets Store: Edit
- Workers Pipelines: Edit
- Workers AI: Edit
- Queues: Edit
- Vectorize: Edit
- Hyperdrive: Edit
- Cloudchamber: Edit
- D1: Edit
- Workers R2 Storage: Edit
- Workers KV Storage: Edit
- Workers Scripts: Edit
- Account Settings: Read

**All zones:**
- Workers Routes: Edit

**All users:**
- Memberships: Read
- User Details: Read

### Adding Secrets to Production

To add optional secrets to your deployed Worker:

```bash
# Add Gemini API key
wrangler secret put GEMINI_API_KEY

# Add Google OAuth credentials
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Add custom Drive root folder
wrangler secret put DRIVE_ROOT_FOLDER
```

## Wrangler Configuration

The `wrangler.toml` file (auto-generated during setup) configures:

- KV namespace bindings
- Environment variables
- Worker settings
- Asset serving configuration

For multi-site deployments, each site has its own configuration file in `toml/<site-name>.toml`. See [Deployment Guide](DEPLOYMENT.md) for more details.

## Stripe Configuration

### Getting Your Stripe Keys

1. Sign up for a [Stripe account](https://stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

### Test vs Live Mode

- **Test keys** (`sk_test_`, `pk_test_`): Use for development and testing
- **Live keys** (`sk_live_`, `pk_live_`): Use for production stores

Always test thoroughly with test keys before switching to live mode.

## Admin Password

Set a secure admin password during setup. This password is used to access the admin dashboard at `/admin`.

**Security Tips:**
- Use a strong, unique password
- Don't share your admin password
- Change it regularly if compromised
- The password is stored securely in Cloudflare Workers secrets

## Site URL

The `SITE_URL` environment variable should match your deployed Worker URL:

```
https://your-project-name.username.workers.dev
```

This URL is used for:
- Stripe webhook callbacks
- OAuth redirects
- Generating absolute URLs

## Optional Features

### AI Image Generation (Gemini)

To enable AI image generation in the admin:

1. Get a [Google Gemini API key](https://ai.google.dev/)
2. Add `GEMINI_API_KEY` to your environment variables
3. The feature will be available in the admin media picker

### Google Drive Integration

To enable Google Drive uploads:

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Add redirect URI: `https://your-project.workers.dev/api/admin/drive/oauth/callback`
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your environment variables
4. Optionally set `DRIVE_ROOT_FOLDER` to customize the Drive folder name

See [AI & Media Integrations](AI_MEDIA.md) for detailed setup instructions.

## Local Development

For local development, create a `.env` file with all required variables. The development server will automatically load these variables.

**Note**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

## Production Deployment

During `npm run setup`, all environment variables are automatically configured in Cloudflare Workers. You can update them later using:

```bash
wrangler secret put VARIABLE_NAME
```

Or by editing your site's configuration file in `toml/<site-name>.toml` for multi-site deployments.

## Troubleshooting

If you encounter configuration issues:

1. **Verify all required variables are set** - Check that all mandatory variables are present
2. **Check token permissions** - Ensure your Cloudflare API token has all required permissions
3. **Validate Stripe keys** - Make sure you're using the correct test/live keys
4. **Review Wrangler logs** - Check deployment logs for configuration errors

See [Troubleshooting Guide](TROUBLESHOOTING.md) for more help.

