# Multi-Site Deployment Guide

OpenShop now supports managing multiple sites from a single codebase. Each site has its own configuration stored in the `toml/` directory.

## 📁 Directory Structure

```
openshop/
├── toml/
│   ├── my-store.toml          # Site configuration (not tracked in git)
│   ├── another-store.toml     # Another site config (not tracked in git)
│   └── template.toml.example  # Template file (tracked in git)
├── wrangler.toml              # Auto-generated (not tracked in git)
└── scripts/
    ├── setup.js               # Create new sites
    ├── deploy.js              # Deploy sites
    └── list-sites.js          # List all sites
```

## 🚀 Creating a New Site

Run the setup wizard to create a new site:

```bash
npm run setup
```

This will:
1. Prompt you for a project name and credentials
2. Create a new Cloudflare Worker and KV namespace
3. Save the configuration to `toml/<project-name>.toml`
4. Deploy the site

## 📋 Listing Your Sites

View all configured sites:

```bash
npm run sites
```

This displays:
- Site configuration name
- Project name
- Worker URL
- KV namespace binding

## 🚢 Deploying Updates

### Deploy a Specific Site

```bash
npm run deploy <site-name>
```

Example:
```bash
npm run deploy my-store
```

### Interactive Site Selection

If you don't specify a site, you'll be prompted to choose:

```bash
npm run deploy
```

This will:
1. Show a numbered list of all sites
2. Let you select which site to deploy
3. Copy the site's configuration to `wrangler.toml`
4. Build and deploy the site

## 🔒 Security

**Important:** All `.toml` files in the `toml/` directory contain sensitive credentials and are automatically ignored by git. Never commit these files!

Files ignored:
- `toml/*.toml` - All site configurations
- `wrangler.toml` - Auto-generated deployment config
- `.env` - Local environment variables

Files tracked:
- `toml/*.example` - Template files without real credentials

## 🔄 How It Works

1. **Setup**: Creates a new configuration in `toml/<project-name>.toml`
2. **Deploy**: Copies the selected toml file to root as `wrangler.toml`
3. **Wrangler**: Uses `wrangler.toml` for deployment
4. **Result**: Each site maintains its own KV namespace, secrets, and worker

## 📝 Example Workflow

```bash
# Create first site
npm run setup
# Enter: my-clothing-store

# Create second site
npm run setup
# Enter: my-electronics-store

# List all sites
npm run sites

# Deploy specific site
npm run deploy my-clothing-store

# Deploy with selection prompt
npm run deploy
```

## 🛠️ Configuration Format

Each site configuration includes:

```toml
name = "project-name"
main = "src/worker.js"

[[kv_namespaces]]
binding = "PROJECT_KV"
id = "kv-namespace-id"

[vars]
SITE_URL = "https://project-name.workers.dev"
STRIPE_SECRET_KEY = "sk_test_..."
ADMIN_PASSWORD = "your-password"
# ... other environment variables

[assets]
directory = "dist"
binding = "ASSETS"
```

## 💡 Tips

- Use descriptive names for your sites (e.g., `staging`, `production`, `test`)
- Keep your `toml/` files backed up securely (they're not in git)
- Each site has its own admin dashboard and data
- You can run different stores with different products from one codebase

## ⚠️ Important Notes

- Each site requires its own Cloudflare Worker and KV namespace
- Each site uses the same Cloudflare account (specified during setup)
- Stripe keys can be the same or different for each site
- Admin passwords are per-site and stored in the configuration

