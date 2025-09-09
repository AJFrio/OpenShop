# OpenShop - Cloudflare E-commerce Platform

A lightweight, open-source e-commerce platform built entirely on the Cloudflare ecosystem. OpenShop leverages Cloudflare Pages for hosting, Cloudflare KV for data storage, and Stripe for payments - all designed to stay within Cloudflare's free tier.

## 🌟 Features

- **⚡ Lightning Fast**: Built on Cloudflare's global edge network
- **💰 Cost Effective**: Designed to run on Cloudflare's free tier
- **🎨 Modern UI**: Clean, responsive design with Tailwind CSS and ShadCN/UI
- **🛒 Full E-commerce**: Product management, collections, and Stripe checkout
- **🛍️ Smart Shopping Cart**: Persistent cart with quantity management and responsive design
- **📱 Mobile Ready**: Fully responsive design with mobile-optimized cart
- **🖼️ Rich Media**: Multiple product images and collection hero banners
- **🎨 Store Customization**: Dynamic logo management (text or image) via admin dashboard
- **📊 Analytics Dashboard**: Real-time Stripe analytics with revenue tracking and order insights
- **🧭 Smart Navigation**: Individual collection links with product preview dropdowns
- **🔧 Easy Setup**: One-command deployment and configuration

## 🏗️ Architecture

- **Frontend**: Vite + React + Tailwind CSS
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare KV
- **Payments**: Stripe
- **Functions**: Cloudflare Functions
- **Deployment**: Wrangler CLI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A Cloudflare account
- A Stripe account

### Installation

1. **Clone and install dependencies:**
   \`\`\`bash
   git clone <your-repo-url> openshop
   cd openshop
   npm install
   \`\`\`

2. **Run the automated setup:**
   \`\`\`bash
   npm run setup
   \`\`\`
   
   This will prompt you for:
   - Project Name (for multiple store support)
   - Cloudflare API Token
   - Cloudflare Account ID  
   - Stripe Secret Key
   - Stripe Publishable Key
   - Admin Password (default: admin123)

3. **Your store is now live!** 🎉

### Admin Access & Security

The admin dashboard is accessible at `/admin` (e.g., `https://your-project-name.pages.dev/admin`). 

**Security Features:**
- **Password Protection**: Admin login required (default: admin123)
- **Token-Based Auth**: Secure 24-hour session tokens
- **No Public Access**: Admin button removed from storefront for security
- **Separate API Endpoints**: Admin operations use authenticated endpoints

### Multiple Store Support

You can deploy multiple stores with different names:
- Each store gets its own KV namespace: `PROJECT-NAME_KV`
- Each store gets its own Pages project: `project-name.pages.dev`
- Run setup multiple times with different project names

## 🛠️ Development

### Local Development

\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

### Project Structure

\`\`\`
openshop/
├── src/
│   ├── components/
│   │   ├── ui/              # ShadCN/UI components
│   │   ├── admin/           # Admin dashboard components
│   │   └── storefront/      # Public storefront components
│   ├── pages/
│   │   ├── admin/           # Admin pages
│   │   └── storefront/      # Public pages
│   ├── lib/                 # Utilities and helpers
│   └── hooks/               # Custom React hooks
├── functions/
│   └── api/                 # Cloudflare Functions
├── scripts/                 # Setup and deployment scripts
└── public/                  # Static assets
\`\`\`

## 📊 Data Model

### Products
\`\`\`json
{
  "id": "prod_1a2b3c4d5e",
  "name": "Classic Cotton T-Shirt",
  "description": "A comfortable, high-quality t-shirt...",
  "price": 25.00,
  "currency": "usd",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  "stripePriceId": "price_AbC987zyx",
  "collectionId": "coll_xyz789"
}
\`\`\`

### Collections
\`\`\`json
{
  "id": "coll_xyz789",
  "name": "Summer Collection",
  "description": "Our hottest items for the summer season.",
  "heroImage": "https://example.com/hero-banner.jpg"
}
\`\`\`

## 🔧 Configuration

### Environment Variables

Copy \`env.example\` to \`.env\` and fill in your values:

\`\`\`env
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
STRIPE_SECRET_KEY=sk_test_your_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
SITE_URL=https://your-site.pages.dev
\`\`\`

### Cloudflare Setup

The setup script automatically:
- Creates KV namespace
- Creates Pages project
- Sets up environment variables
- Deploys your site

## 💳 Stripe Integration

### Automatic Setup
- Products sync automatically with Stripe
- Prices are managed in Stripe
- Checkout sessions redirect to Stripe

### Webhook Configuration (Optional)
For advanced features, configure Stripe webhooks:
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: \`https://your-site.pages.dev/api/stripe-webhook\`
3. Select relevant events

## 🚀 Deployment

### Automated Deployment
\`\`\`bash
npm run deploy
\`\`\`

### Manual Deployment
\`\`\`bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=openshop
\`\`\`

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/products\` | GET, POST | Manage products |
| \`/api/products/[id]\` | GET, PUT, DELETE | Individual product |
| \`/api/collections\` | GET, POST | Manage collections |
| \`/api/collections/[id]\` | GET, PUT, DELETE | Individual collection |
| \`/api/collections/[id]/products\` | GET | Products in collection |
| \`/api/store-settings\` | GET, PUT | Manage store settings (logo, branding) |
| \`/api/analytics\` | GET | Retrieve Stripe analytics and revenue data |
| \`/api/create-checkout-session\` | POST | Create Stripe checkout (single item) |
| \`/api/create-cart-checkout-session\` | POST | Create Stripe checkout (multiple items) |

## 🎨 Customization

### Styling
- Built with Tailwind CSS
- ShadCN/UI components
- Fully customizable themes

### Components
- Modular component architecture
- Easy to extend and modify
- TypeScript support ready

## 🔒 Security

### Admin Authentication
- **Token-Based System**: Secure session tokens with 24-hour expiration
- **KV Token Storage**: Server-side token validation using Cloudflare KV
- **Password Protection**: Configurable admin password (set during setup)
- **Automatic Logout**: Expired sessions redirect to login

### API Security
- **Separated Endpoints**: Public (read-only) vs Admin (authenticated write)
- **Authentication Headers**: X-Admin-Token header required for admin operations
- **Input Validation**: Server-side validation on all endpoints
- **Error Handling**: Proper 401/403 responses for unauthorized access

### Data Protection
- **Read-Only Public APIs**: Storefront cannot modify data
- **Admin-Only Writes**: All create/update/delete operations require authentication
- **Secret Management**: API keys stored as Cloudflare secrets
- **HTTPS Only**: Automatic HTTPS via Cloudflare Pages

### Token Lifecycle
1. **Login**: Admin enters password → server validates → generates token
2. **Storage**: Token stored in KV (server) and localStorage (client)
3. **Validation**: Every admin request validates token against KV
4. **Expiration**: 24-hour automatic expiration with cleanup
5. **Logout**: Manual token removal from both locations

## 📈 Performance

- Global CDN via Cloudflare
- Edge functions for fast API responses
- Optimized build with Vite
- Lazy loading and code splitting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- 📚 Documentation: [Link to docs]
- 💬 Community: [Link to Discord/Forum]
- 🐛 Issues: [GitHub Issues]

## 🙏 Acknowledgments

- Cloudflare for the amazing platform
- Stripe for payment processing
- ShadCN/UI for beautiful components
- The open-source community

---

**Made with ❤️ for the open-source community**