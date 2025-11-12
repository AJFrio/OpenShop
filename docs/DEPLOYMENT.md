# Deployment Guide

Complete guide to deploying OpenShop, including automated setup, manual deployment, GitHub Actions, and multi-site management.

## Automated Deployment

The easiest way to deploy OpenShop is using the automated setup script:

```bash
npm run setup
```

This script will:
1. Prompt for configuration (project name, API keys, etc.)
2. Create Cloudflare KV namespace
3. Deploy Worker with static assets
4. Configure environment variables
5. Set up your unique subdomain

Your store will be live at: `https://your-project-name.username.workers.dev`

## Manual Deployment

For more control over the deployment process:

```bash
# Build the project
npm run build

# Deploy to Cloudflare Workers
wrangler deploy
```

### Deployment Process

1. **Build Frontend** - Vite builds React app to `dist/`
2. **Deploy Worker** - Wrangler deploys Worker with static assets
3. **Update Configuration** - Environment variables and bindings applied
4. **Global Distribution** - Deployed to Cloudflare's edge network

## GitHub Actions Build for PaaS Deployment

OpenShop includes a GitHub Actions workflow that automatically builds the project for PaaS deployment.

### Workflow File

**Location**: `.github/workflows/build.yml`

### What It Builds

- **Frontend (`dist/` folder)**: Production-ready static files from Vite build
- **Worker Bundle (`dist/worker.bundle.js`)**: Single bundled JavaScript file with all dependencies, minified and optimized for Cloudflare Workers runtime
- **Build Metadata (`build-info.json`)**: JSON file with version, build date, commit hash, and build number

### When It Runs

- On push to `main` or `master` branches
- On pull requests to `main` or `master` branches
- Manual trigger via `workflow_dispatch`

### Artifacts Created

- `worker-bundle`: `dist/worker.bundle.js` - Single bundled worker file
- `frontend-dist`: Complete `dist/` folder with all frontend assets
- `frontend-dist-tar`: `frontend-dist.tar.gz` - Compressed frontend build
- `build-info`: `build-info.json` - Build metadata

### Worker Bundle Features

- All dependencies bundled into a single file
- Minified and optimized for production
- Compatible with Cloudflare Workers runtime
- No template variables injected - pure bundled code

### Using Artifacts for PaaS Deployment

1. **Download artifacts** from the GitHub Actions run:
   - Go to the Actions tab in your repository
   - Select the latest workflow run
   - Download the artifacts you need

2. **For worker deployment:**
   ```bash
   # Download worker.bundle.js from the worker-bundle artifact
   # Deploy the worker.bundle.js file to your Cloudflare Workers runtime
   # The bundle contains pure bundled code without any template variables
   ```

3. **For frontend deployment:**
   ```bash
   # Option 1: Use the compressed package
   tar -xzf frontend-dist.tar.gz
   # Upload the extracted files to your static hosting service
   
   # Option 2: Use the dist folder directly
   # Upload the entire dist/ folder (excluding worker.bundle.js) to your CDN
   ```

### Build Scripts

- `npm run build` - Builds the frontend only
- `npm run build:worker` - Builds the worker bundle only
- `npm run build:all` - Builds both frontend and worker bundle

**Note**: The worker bundle requires Cloudflare Workers runtime. Ensure your PaaS platform supports:
- Cloudflare Workers runtime (or compatible environment)
- Required environment variables (see [Configuration Guide](CONFIGURATION.md))

## Multi-Site Deployment

OpenShop supports managing multiple sites from a single codebase. Each site has its own configuration stored in the `toml/` directory.

### Directory Structure

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

### Creating a New Site

Run the setup wizard to create a new site:

```bash
npm run setup
```

This will:
1. Prompt you for a project name and credentials
2. Create a new Cloudflare Worker and KV namespace
3. Save the configuration to `toml/<project-name>.toml`
4. Deploy the site

### Listing Your Sites

View all configured sites:

```bash
npm run sites
```

This displays:
- Site configuration name
- Project name
- Worker URL
- KV namespace binding

### Deploying Updates

#### Deploy a Specific Site

```bash
npm run deploy <site-name>
```

Example:
```bash
npm run deploy my-store
```

#### Interactive Site Selection

If you don't specify a site, you'll be prompted to choose:

```bash
npm run deploy
```

This will:
1. Show a numbered list of all sites
2. Let you select which site to deploy
3. Copy the site's configuration to `wrangler.toml`
4. Build and deploy the site

### Resource Isolation

Each store gets completely isolated resources:

| Resource | Naming Convention | Example |
|----------|-------------------|---------|
| **Worker** | `project-name.username.workers.dev` | `electronics-hub.username.workers.dev` |
| **KV Namespace** | `PROJECT-NAME_KV` | `ELECTRONICS-HUB_KV` |
| **Admin Access** | `/admin` on each domain | `electronics-hub.workers.dev/admin` |

### Example Workflow

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

### Configuration Format

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

### Security

**Important:** All `.toml` files in the `toml/` directory contain sensitive credentials and are automatically ignored by git. Never commit these files!

**Files ignored:**
- `toml/*.toml` - All site configurations
- `wrangler.toml` - Auto-generated deployment config
- `.env` - Local environment variables

**Files tracked:**
- `toml/*.example` - Template files without real credentials

### How It Works

1. **Setup**: Creates a new configuration in `toml/<project-name>.toml`
2. **Deploy**: Copies the selected toml file to root as `wrangler.toml`
3. **Wrangler**: Uses `wrangler.toml` for deployment
4. **Result**: Each site maintains its own KV namespace, secrets, and worker

### Tips

- Use descriptive names for your sites (e.g., `staging`, `production`, `test`)
- Keep your `toml/` files backed up securely (they're not in git)
- Each site has its own admin dashboard and data
- You can run different stores with different products from one codebase

### Important Notes

- Each site requires its own Cloudflare Worker and KV namespace
- Each site uses the same Cloudflare account (specified during setup)
- Stripe keys can be the same or different for each site
- Admin passwords are per-site and stored in the configuration

## Deployment Architecture

### What Gets Created

```bash
npm run setup
# Input: "my-electronics-store"

Creates:
├── Worker: my-electronics-store.workers.dev
├── KV Namespace: MY-ELECTRONICS-STORE_KV
├── Static Assets: Served by Worker
└── All APIs: Integrated in Worker
```

### Multiple Store Support

```bash
# Store 1
npm run setup → "electronics-store" → electronics-store.workers.dev

# Store 2  
npm run setup → "clothing-shop" → clothing-shop.workers.dev

# Store 3
npm run setup → "book-store" → book-store.workers.dev
```

## Troubleshooting Deployment

### Common Issues

**Issue**: Deployment fails with authentication error
- **Solution**: Verify Cloudflare API token has correct permissions

**Issue**: KV namespace not found
- **Solution**: Ensure KV namespace was created during setup

**Issue**: Environment variables not set
- **Solution**: Check `wrangler.toml` or site-specific toml file

**Issue**: Build fails
- **Solution**: Ensure Node.js 18+ is installed, run `npm install`

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

## Best Practices

- **Test Locally**: Always test with `npm run dev` before deploying
- **Version Control**: Commit code changes, not configuration files
- **Backup Configs**: Keep site configurations backed up securely
- **Monitor Deployments**: Check Cloudflare dashboard after deployment
- **Gradual Rollout**: Test new deployments on staging sites first

