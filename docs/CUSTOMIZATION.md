# Customization Guide

Guide to customizing OpenShop's frontend and backend to match your brand and requirements.

## Frontend Customization

### Tailwind CSS Configuration

Customize the design system by editing `tailwind.config.js`:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add your brand colors
        primary: '#your-color',
        secondary: '#your-color',
      },
      fonts: {
        // Add custom fonts
        sans: ['Your Font', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### Component Customization

UI components are located in `src/components/ui/`:

- **Button**: `src/components/ui/button.jsx`
- **Card**: `src/components/ui/card.jsx`
- **Input**: `src/components/ui/input.jsx`
- **Select**: `src/components/ui/select.jsx`

These components follow ShadCN/UI patterns and can be customized to match your design.

### Theme Customization

Global styles are in `src/index.css`:

```css
@import "tailwindcss";

/* Add your custom styles */
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
}
```

Storefront theme customization is handled through the admin dashboard's theme settings, which are stored in Cloudflare KV.

### Storefront Components

Customize storefront-specific components:

- **Navbar**: `src/components/storefront/Navbar.jsx`
- **Footer**: `src/components/storefront/Footer.jsx`
- **Product Card**: `src/components/storefront/ProductCard.jsx`
- **Cart**: `src/components/storefront/Cart.jsx`
- **Hero**: `src/components/storefront/Hero.jsx`

### Pages

Customize page layouts:

- **Storefront**: `src/pages/storefront/Storefront.jsx`
- **Product Page**: `src/pages/storefront/ProductPage.jsx`
- **Collection Page**: `src/pages/storefront/CollectionPage.jsx`
- **About Page**: `src/pages/storefront/About.jsx`

## Backend Customization

### API Routes

API routes are organized in `src/routes/`:

- **Public Routes**: `src/routes/public/`
  - Products, collections, checkout, store settings
- **Admin Routes**: `src/routes/admin/`
  - Products, collections, settings, analytics, AI, Drive

### Middleware

Customize middleware in `src/middleware/`:

- **Authentication**: `src/middleware/auth.js`
- **CORS**: `src/middleware/cors.js`
- **Error Handling**: `src/middleware/errorHandler.js`
- **Security Headers**: `src/middleware/securityHeaders.js`
- **Validation**: `src/middleware/validation.js`

### Business Logic

Core business logic is in `src/lib/`:

- **KV Operations**: `src/lib/kv.js`
- **Stripe Integration**: `src/lib/stripe.js`
- **Authentication**: `src/lib/auth.js`
- **Utilities**: `src/lib/utils.js`

### Services

Service layer in `src/services/`:

- **Product Service**: `src/services/ProductService.js`
- **Collection Service**: `src/services/CollectionService.js`
- **Stripe Service**: `src/services/StripeService.js`
- **Analytics Service**: `src/services/AnalyticsService.js`

## Adding New Features

### Adding a New API Endpoint

1. **Create Route Handler**:
   ```javascript
   // src/routes/public/new-feature.js
   export async function onRequestGet(context) {
     // Your logic here
     return new Response(JSON.stringify({ data: 'result' }), {
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

2. **Register Route** in `src/routes/index.js`:
   ```javascript
   import { newFeature } from './public/new-feature.js';
   app.get('/api/new-feature', newFeature);
   ```

### Adding a New Admin Feature

1. **Create Admin Route** in `src/routes/admin/`
2. **Add Authentication Middleware**:
   ```javascript
   app.use('/api/admin/new-feature', authMiddleware);
   ```
3. **Create Admin UI Component** in `src/components/admin/`
4. **Add to Admin Dashboard** in `src/pages/admin/AdminDashboard.jsx`

### Adding a New Storefront Page

1. **Create Page Component** in `src/pages/storefront/`
2. **Add Route** in `src/App.jsx`:
   ```jsx
   <Route path="/new-page" element={<NewPage />} />
   ```
3. **Add Navigation Link** in `src/components/storefront/Navbar.jsx`

## Styling Guidelines

### Using Tailwind CSS

- **Mobile-First**: Design for mobile, then scale up
- **Semantic Classes**: Use meaningful class names
- **Component Patterns**: Follow ShadCN/UI patterns
- **Consistency**: Maintain consistent spacing and colors

### Custom CSS

When Tailwind isn't enough:

- **Global Styles**: Add to `src/index.css`
- **Component Styles**: Use CSS modules or styled-components
- **Theme Variables**: Use CSS custom properties

### Responsive Design

- **Breakpoints**: Use Tailwind's responsive prefixes
- **Mobile Optimization**: Test on real devices
- **Touch Targets**: Ensure buttons are large enough
- **Performance**: Optimize for mobile networks

## Branding

### Logo

Set your logo through the admin dashboard:

- **Text Logo**: Enter your store name
- **Image Logo**: Upload a logo image
- **Logo Position**: Configure in theme settings

### Colors

Customize colors through:

- **Tailwind Config**: Update color palette
- **Theme Settings**: Admin dashboard theme customization
- **CSS Variables**: Override default colors

### Fonts

Add custom fonts:

1. **Add Font Files** to `public/fonts/`
2. **Define in CSS**:
   ```css
   @font-face {
     font-family: 'Your Font';
     src: url('/fonts/your-font.woff2') format('woff2');
   }
   ```
3. **Update Tailwind Config** to use the font

## Advanced Customization

### Custom Domain

Set up a custom domain:

1. **Add Domain** in Cloudflare dashboard
2. **Update DNS** to point to your Worker
3. **Configure SSL** (automatic with Cloudflare)
4. **Update SITE_URL** environment variable

### Custom Checkout

Customize Stripe checkout:

- **Checkout Session Options**: Modify in `src/routes/public/checkout.js`
- **Success/Cancel Pages**: Customize in `src/pages/storefront/`
- **Email Templates**: Configure in Stripe dashboard

### Custom Analytics

Add custom analytics:

1. **Add Tracking Script** to `index.html`
2. **Track Events** in components
3. **Integrate Services**: Google Analytics, Plausible, etc.

## Best Practices

- **Version Control**: Commit all customizations
- **Documentation**: Document custom changes
- **Testing**: Test customizations thoroughly
- **Performance**: Monitor impact on performance
- **Maintainability**: Keep code clean and organized

## Troubleshooting

### Styles Not Applying

- **Check Tailwind Config**: Ensure content paths are correct
- **Rebuild**: Run `npm run build` after changes
- **Cache**: Clear browser cache
- **Specificity**: Check CSS specificity

### Components Not Rendering

- **Check Imports**: Verify all imports are correct
- **Check Routes**: Ensure routes are registered
- **Check Console**: Look for JavaScript errors
- **Check Build**: Ensure build completes successfully

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

