# AI & Media Integrations

Guide to optional AI image generation and Google Drive integration features in OpenShop.

## Overview

OpenShop includes optional integrations for AI-powered image generation and Google Drive storage. These features enhance the admin experience but are not required for core functionality.

## Gemini Image Generation

Generate product or hero images directly from the admin dashboard using Google's Gemini image generation API.

### What It Does

From the admin media picker, you can:
- Generate product images from text prompts
- Provide up to 4 reference images for style guidance
- Generate hero banner images for collections
- Create custom images without leaving the admin

### Setup

1. **Get Gemini API Key**
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Create an API key for Gemini

2. **Configure in OpenShop**

   **Local Development** (`.env` file):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

   **Production**:
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```

3. **Access in Admin**
   - Navigate to admin dashboard
   - Open media picker when adding/editing products or collections
   - Click "Generate Image" option
   - Enter your prompt and optionally upload reference images

### API Endpoint

**Endpoint**: `POST /api/admin/ai/generate-image`

**Authentication**: Requires admin token

**Request Body**:
```json
{
  "prompt": "A modern laptop on a wooden desk",
  "referenceImages": [
    "https://example.com/ref1.jpg",
    "https://example.com/ref2.jpg"
  ]
}
```

**Response**:
```json
{
  "imageUrl": "https://generated-image-url.jpg"
}
```

### Usage Tips

- **Be specific**: Detailed prompts produce better results
- **Use reference images**: Upload style references for consistent look
- **Iterate**: Generate multiple variations and choose the best
- **Optimize**: Generated images can be large; consider compression

## Google Drive Integration

Upload and manage product images using Google Drive as your storage backend.

### What It Does

- Upload images from admin to Google Drive
- Automatically make images publicly viewable
- Generate direct-view URLs for product images
- Use built-in image proxy to avoid CORS/403 errors
- Organize images in a dedicated folder structure

### Setup

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://your-project.workers.dev/api/admin/drive/oauth/callback`

2. **Configure in OpenShop**

   **Local Development** (`.env` file):
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   DRIVE_ROOT_FOLDER=OpenShop  # Optional, defaults to site URL
   ```

   **Production**:
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   wrangler secret put DRIVE_ROOT_FOLDER  # Optional
   ```

3. **Connect Google Drive**
   - Navigate to admin dashboard
   - Open media picker
   - Click "Connect Google Drive"
   - Complete OAuth flow in popup
   - Drive connection is now active

### OAuth Flow

1. **Initiate Connection**: Click "Connect Google Drive" in admin
2. **Google Authorization**: Redirected to Google sign-in
3. **Permissions**: Grant Drive access permissions
4. **Callback**: Returned to OpenShop with access token
5. **Token Storage**: Token stored securely in Cloudflare KV

### Uploading Images

After connecting Google Drive:

1. **Select Image**: Choose local file or use generated image
2. **Upload to Drive**: Click "Upload to Drive"
3. **Automatic Processing**:
   - File uploaded to Drive root folder
   - File permissions set to public
   - Direct-view URL generated
4. **Use in Product**: URL automatically inserted into product/collection

### Image Proxy

OpenShop includes a built-in image proxy to serve Google Drive images reliably:

**Endpoint**: `GET /api/image-proxy?src=<drive_url>`

**Why It's Needed**: Google Drive direct links can return 403 errors or CORS issues. The proxy ensures images load correctly in your storefront.

**Automatic Usage**: The UI automatically normalizes Drive links to use the proxy when displaying images.

### Folder Structure

Images are organized in Google Drive:

```
Google Drive Root
└── OpenShop/ (or custom DRIVE_ROOT_FOLDER)
    └── your-project.workers.dev/
        ├── products/
        │   ├── product-image-1.jpg
        │   └── product-image-2.jpg
        └── collections/
            └── hero-banner.jpg
```

### API Endpoints

**Check Connection Status**:
```
GET /api/admin/drive/status
```

**Start OAuth Flow**:
```
GET /api/admin/drive/oauth/start
```

**OAuth Callback**:
```
GET /api/admin/drive/oauth/callback
```

**Upload Image**:
```
POST /api/admin/drive/upload
Content-Type: multipart/form-data

{
  "file": <file>,
  "folder": "products" // Optional
}
```

## Combining Features

You can use both features together:

1. **Generate** image with Gemini AI
2. **Upload** generated image to Google Drive
3. **Use** Drive URL in your product/collection

This workflow provides a complete image management solution without external tools.

## Troubleshooting

### Gemini Issues

**Issue**: Image generation fails
- **Solution**: Verify `GEMINI_API_KEY` is set correctly and has sufficient quota

**Issue**: Generated images are low quality
- **Solution**: Use more detailed prompts and reference images

### Google Drive Issues

**Issue**: OAuth flow fails
- **Solution**: Check redirect URI matches exactly, verify OAuth credentials

**Issue**: Upload fails
- **Solution**: Ensure Drive connection is active, check file size limits

**Issue**: Images don't display
- **Solution**: Verify image proxy is working, check Drive file permissions

**Issue**: 403 errors on images
- **Solution**: Use the built-in image proxy (`/api/image-proxy?src=...`)

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

## Best Practices

- **Image Optimization**: Compress images before upload for faster loading
- **Naming Conventions**: Use descriptive filenames for easier management
- **Folder Organization**: Keep products and collections organized in Drive
- **Backup**: Regularly backup your Drive folder
- **Cost Management**: Monitor API usage for Gemini and Drive storage

## Feature Availability

These features are **optional**. OpenShop works perfectly without them. You can:

- Use external image hosting (Imgur, Cloudinary, etc.)
- Upload images directly via URL
- Use local file uploads (if hosting supports it)

The AI and Drive features simply provide additional convenience and integration options.

