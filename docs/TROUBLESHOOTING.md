# Troubleshooting Guide

Common issues and solutions for OpenShop setup, deployment, and operation.

## Setup Issues

### KV Namespace Creation Error

**Error**: `Unknown arguments: preview, kv:namespace, create`

**Solution**: This was fixed in the latest version. Ensure you're using the latest Wrangler CLI:
```bash
npm install -g wrangler@latest
```

### Authentication Error

**Error**: `You are logged in with an API Token`

**Solution**: The setup script now uses API Token directly without OAuth login. Ensure your API token has all required permissions (see [Configuration Guide](CONFIGURATION.md)).

### Empty KV ID in wrangler.toml

**Error**: `"id" field but got {"binding":"OPENSHOP_KV","id":""}`

**Solution**: This was fixed. The KV binding is now added after namespace creation. If you encounter this, delete the KV namespace and run setup again.

### 500 Error on /admin Route

**Error**: `500 Internal Server Error when visiting /admin`

**Solution**: This was fixed. SPA routing now properly serves the React app for client-side routes. Ensure you're using the latest version.

### 404 Error When Creating Collections/Products

**Error**: `POST /api/collections 404 (Not Found)`

**Solution**: This was fixed. Admin components now use authenticated `/api/admin/*` endpoints. Ensure you're logged in and using the latest version.

## Deployment Issues

### Deployment Fails with Authentication Error

**Symptoms**: Deployment fails with authentication or permission errors

**Solutions**:
1. Verify Cloudflare API token has correct permissions
2. Check token hasn't expired
3. Ensure account ID is correct
4. Try regenerating API token

### KV Namespace Not Found

**Symptoms**: Worker can't access KV namespace

**Solutions**:
1. Verify KV namespace was created during setup
2. Check `wrangler.toml` has correct KV binding
3. Ensure namespace ID matches in configuration
4. Recreate namespace if needed

### Environment Variables Not Set

**Symptoms**: Worker can't access environment variables

**Solutions**:
1. Check `wrangler.toml` or site-specific toml file
2. Verify secrets were set: `wrangler secret list`
3. Re-add missing secrets: `wrangler secret put VARIABLE_NAME`
4. Check variable names match exactly

### Build Fails

**Symptoms**: `npm run build` fails with errors

**Solutions**:
1. Ensure Node.js 18+ is installed: `node --version`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for syntax errors in code
4. Review build error messages for specific issues

### Worker Not Deploying

**Symptoms**: `wrangler deploy` hangs or fails

**Solutions**:
1. Check internet connection
2. Verify Cloudflare account is active
3. Check Wrangler version: `wrangler --version`
4. Try deploying with verbose logging: `wrangler deploy --log-level debug`

## Runtime Issues

### Products Not Displaying

**Symptoms**: Storefront shows no products

**Solutions**:
1. Check products exist in admin dashboard
2. Verify KV namespace is accessible
3. Check browser console for errors
4. Verify API endpoint is working: `curl https://your-store.workers.dev/api/products`

### Admin Login Not Working

**Symptoms**: Can't log in to admin dashboard

**Solutions**:
1. Verify admin password is correct
2. Check `ADMIN_PASSWORD` environment variable is set
3. Clear browser localStorage and try again
4. Check browser console for errors

### Checkout Not Working

**Symptoms**: Stripe checkout fails or doesn't load

**Solutions**:
1. Verify Stripe keys are correct (test vs live)
2. Check `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are set
3. Verify Stripe account is active
4. Check browser console for errors
5. Test with Stripe test cards

### Images Not Loading

**Symptoms**: Product images don't display

**Solutions**:
1. Verify image URLs are valid
2. Check CORS settings if using external images
3. Use image proxy for Google Drive images: `/api/image-proxy?src=...`
4. Verify image URLs are accessible
5. Check browser console for 404 errors

## Performance Issues

### Slow Response Times

**Symptoms**: Pages load slowly

**Solutions**:
1. Check KV operation count (may be hitting limits)
2. Verify caching is enabled
3. Optimize images (compress before upload)
4. Check for heavy dependencies
5. Monitor Cloudflare dashboard for issues

### High Request Counts

**Symptoms**: Approaching or exceeding free tier limits

**Solutions**:
1. Enable caching to reduce duplicate requests
2. Optimize frontend to reduce API calls
3. Use CDN for static assets
4. Block unnecessary bot traffic
5. Consider upgrading to paid tier

### KV Limit Issues

**Symptoms**: KV operations failing

**Solutions**:
1. Optimize reads (cache frequently accessed data)
2. Batch operations when possible
3. Review data structure for efficiency
4. Monitor KV usage in Cloudflare dashboard
5. Consider upgrading to paid tier

## Configuration Issues

### Missing Environment Variables

**Symptoms**: Features not working, errors about missing variables

**Solutions**:
1. Check `.env` file for local development
2. Verify secrets in Cloudflare: `wrangler secret list`
3. Re-add missing secrets: `wrangler secret put VARIABLE_NAME`
4. Check variable names match exactly (case-sensitive)

### Wrong API Keys

**Symptoms**: External services (Stripe, Gemini, etc.) not working

**Solutions**:
1. Verify API keys are correct
2. Check test vs live mode keys match environment
3. Verify API keys haven't expired
4. Check service accounts are active
5. Review API key permissions

## Getting Help

### Before Asking for Help

1. **Check Node.js Version** - Ensure you have Node.js 18+ installed
2. **Verify Credentials** - Double-check your Cloudflare API token and account ID
3. **Check Wrangler Version** - Run `wrangler --version` (should be 3.0+)
4. **Review Logs** - Check the Wrangler logs mentioned in error messages
5. **Check Documentation** - Review relevant documentation files

### Useful Commands

```bash
# Check Node.js version
node --version

# Check Wrangler version
wrangler --version

# List Cloudflare secrets
wrangler secret list

# Check Worker logs
wrangler tail

# Test API endpoint
curl https://your-store.workers.dev/api/products
```

### Where to Get Help

- **📚 Documentation** - Check the docs folder for detailed guides
- **🐛 GitHub Issues** - [Report bugs](https://github.com/ajfrio/openshop/issues)
- **💡 GitHub Discussions** - [Ask questions](https://github.com/ajfrio/openshop/discussions)
- **💬 Discord Server** - [Join community chat](https://discord.gg/qAnDxHmEmS)

### Reporting Issues

When reporting an issue, please include:

1. **Error Message** - Full error text
2. **Steps to Reproduce** - What you did before the error
3. **Environment** - Node.js version, OS, Wrangler version
4. **Logs** - Relevant log output
5. **Configuration** - (Redacted) relevant config details

## Common Solutions Summary

| Issue | Quick Fix |
|------|-----------|
| Setup fails | Update Wrangler, check API token permissions |
| Can't deploy | Verify credentials, check Wrangler version |
| Products not showing | Check KV namespace, verify API endpoint |
| Admin login fails | Verify ADMIN_PASSWORD is set correctly |
| Checkout fails | Check Stripe keys, verify test/live mode |
| Images not loading | Verify URLs, use image proxy for Drive |
| Slow performance | Check KV limits, enable caching |
| Missing variables | Add secrets via `wrangler secret put` |

For more specific help, refer to the relevant documentation:
- [Configuration Guide](CONFIGURATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [API Reference](API.md)
- [Performance Guide](PERFORMANCE.md)

