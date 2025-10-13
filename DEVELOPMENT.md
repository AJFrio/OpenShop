# OpenShop Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19+ (current version warnings can be ignored for now)
- npm or yarn
- Cloudflare account (for deployment)
- Wrangler CLI 4.x (installed automatically when running the setup script)
- Stripe CLI (optional but recommended for OAuth during setup)
- Stripe account (for payments)

### Local Development Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Build for production:**
   \`\`\`bash
   npm run build
   \`\`\`

## 🏗️ Project Architecture

### Frontend Structure
- **React 19** with **Vite** for fast development
- **Tailwind CSS** for styling
- **ShadCN/UI** for component library
- **React Router** for routing

### Backend Structure
- **Cloudflare Functions** for API endpoints
- **Cloudflare KV** for data storage
- **Stripe** for payment processing

### New Features Added
- **Multiple Product Images**: Products can now have multiple images with carousel navigation
- **Collection Hero Banners**: Collections can have hero banner images for stunning collection pages
- **Shopping Cart System**: Full-featured cart with persistent storage, quantity management, and responsive design
  - Desktop: Sliding sidebar from the right (slides back to right when closing)
  - Mobile: Full-screen overlay sliding from top (slides back to top when closing)
  - Persistent storage using localStorage
  - Real-time item count badge on cart button with bounce animation
  - Natural slide-in/slide-out animations that return to origin point
- **Gradient Button Effects**: All buttons feature purple-to-blue gradient hover effects with smooth transitions
- **Store Customization**: Dynamic logo management system allowing text or image logos
- **Analytics Dashboard**: Real-time Stripe analytics with revenue charts, order tracking, and growth metrics
- **Enhanced Navigation**: Individual collection links with product dropdown menus on hover
- **Admin Access**: Admin dashboard accessible only via direct URL (/admin) for security

## 📁 File Structure

\`\`\`
src/
├── components/
│   ├── ui/                 # Reusable UI components (ShadCN)
│   ├── admin/              # Admin-specific components
│   └── storefront/         # Storefront-specific components
├── pages/
│   ├── admin/              # Admin dashboard pages
│   └── storefront/         # Public storefront pages
├── lib/
│   ├── utils.js            # Utility functions
│   ├── kv.js              # KV database operations
│   └── stripe.js          # Stripe client operations
└── hooks/                  # Custom React hooks

functions/
└── api/                    # Cloudflare Functions (API routes)
    ├── products.js         # Products CRUD
    ├── collections.js      # Collections CRUD
    └── create-checkout-session.js
\`\`\`

## 🛠️ Development Workflow

### Adding New Components

1. **UI Components** (in \`src/components/ui/\`):
   - Follow ShadCN/UI patterns
   - Use Tailwind for styling
   - Export from component file

2. **Feature Components** (in \`src/components/admin/\` or \`src/components/storefront/\`):
   - Import UI components
   - Handle business logic
   - Connect to APIs

### Adding New Pages

1. Create page component in appropriate folder
2. Add route to \`src/App.jsx\`
3. Update navigation if needed

### Adding New API Endpoints

1. Create function in \`functions/api/\`
2. Export HTTP method handlers (\`onRequestGet\`, \`onRequestPost\`, etc.)
3. Use KV operations from \`src/lib/kv.js\`
4. Handle errors appropriately

## 🎨 Styling Guidelines

### Tailwind CSS Classes
- Use semantic class names
- Follow mobile-first responsive design
- Use Tailwind's color palette

### Component Styling
- Use \`cn()\` utility for conditional classes
- Follow ShadCN/UI patterns for consistency
- Keep components visually consistent

## 🔧 Configuration

### Environment Variables
Create \`.env\` file with:
\`\`\`env
CLOUDFLARE_ACCOUNT_ID=your_account_id
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_MODE=test
SITE_URL=http://localhost:5173
ADMIN_PASSWORD=admin123
DRIVE_ROOT_FOLDER=OpenShop
\`\`\`

### Wrangler Configuration
The \`wrangler.toml\` file configures:
- KV namespace bindings
- Environment variables
- Pages project settings

## 🧪 Testing

### Manual Testing
1. **Admin Dashboard:**
   - Create/edit/delete products
   - Create/edit/delete collections
   - Verify Stripe integration

2. **Storefront:**
   - Browse products
   - Filter by collections
   - Test checkout flow

### API Testing
Use tools like Postman or curl to test API endpoints:
\`\`\`bash
# Get all products
curl http://localhost:5173/api/products

# Create a product
curl -X POST http://localhost:5173/api/products \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test Product","price":10.00}'
\`\`\`

## 🚀 Deployment

### Production Deployment
\`\`\`bash
# One-time setup
npm run setup

# Deploy updates
npm run deploy
\`\`\`

### Development Deployment
\`\`\`bash
# Test with Wrangler locally
npm run functions:dev
\`\`\`

## 🐛 Common Issues

### Build Warnings
- Node.js version warnings can be ignored for now
- Ensure all imports are correct

### API Issues
- Check KV namespace is properly bound
- Verify environment variables are set
- Check Cloudflare Functions logs

### Stripe Issues
- Verify API keys are correct
- Check webhook endpoints (if using)
- Test with Stripe test mode first

## 📚 Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [ShadCN/UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Follow the existing code style
2. Test your changes thoroughly
3. Update documentation if needed
4. Submit clear pull requests

Happy coding! 🎉
