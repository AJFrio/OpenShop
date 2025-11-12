# Performance Guide

Performance metrics, optimization features, and scalability information for OpenShop.

## Cloudflare Workers Benefits

### Global Edge Network

- **🚀 Sub-100ms Response Times** - Content served from edge locations worldwide
- **⚡ Zero Cold Starts** - Instant function execution with minimal latency
- **📊 100k Requests/Day** - Generous free tier limits
- **🔄 Auto-scaling** - Handles traffic spikes automatically
- **💾 KV Storage** - 100k reads, 1k writes daily (free tier)

### Reduced Latency

- **Single Runtime**: No context switching between services
- **Edge Execution**: Code runs closer to users globally
- **Efficient Routing**: Hono framework optimized for Workers
- **Static Caching**: Assets cached at edge locations

### Better Scalability

- **Auto-scaling**: Workers scale automatically with demand
- **No Cold Starts**: Minimal startup time
- **Global Distribution**: Runs on Cloudflare's global network
- **High Availability**: Built-in redundancy and failover

### Cost Efficiency

- **Free Tier**: 100k requests/day at no cost
- **No Separate Billing**: Static assets included
- **KV Included**: Database operations within free tier
- **Bandwidth Free**: Cloudflare bandwidth at no cost

## Optimization Features

### Static Asset Caching

- **CDN Caching**: Images, CSS, and JS files cached at edge locations
- **Cache Headers**: Proper cache-control headers for optimal performance
- **Asset Versioning**: Automatic cache busting on updates
- **Compression**: Automatic gzip/brotli compression

### API Response Caching

- **Smart Caching**: Product and collection data cached intelligently
- **Cache Invalidation**: Automatic cache updates on data changes
- **Edge Caching**: API responses cached at edge for faster delivery
- **Reduced KV Reads**: Caching reduces database load

### Image Optimization

- **Cloudflare Image Resizing**: Automatic image optimization
- **Format Conversion**: Automatic WebP conversion when supported
- **Lazy Loading**: Images load on demand
- **Responsive Images**: Multiple sizes for different devices

### Minification

- **Automatic JS Minification**: Production builds are minified
- **CSS Optimization**: CSS is minified and optimized
- **Tree Shaking**: Unused code removed from bundles
- **Code Splitting**: Efficient code splitting for faster loads

## Performance Metrics

### Typical Response Times

- **Static Assets**: < 50ms (cached at edge)
- **API Endpoints**: < 100ms (edge execution)
- **Product Pages**: < 200ms (including KV reads)
- **Checkout Flow**: < 300ms (including Stripe API calls)

### Free Tier Limits

- **Requests**: 100,000 per day
- **CPU Time**: 10ms per request
- **KV Reads**: 100,000 per day
- **KV Writes**: 1,000 per day
- **KV Storage**: 1 GB total

### Scaling Beyond Free Tier

When you exceed free tier limits:

- **Workers Paid**: $5/month for 10M requests
- **KV Paid**: $0.50 per million reads, $5 per million writes
- **Automatic Upgrade**: Seamless transition to paid plans
- **Cost Predictable**: Pay only for what you use

## Best Practices

### Frontend Optimization

- **Code Splitting**: Use React lazy loading for routes
- **Image Optimization**: Compress images before upload
- **Bundle Size**: Monitor and minimize bundle sizes
- **Caching Strategy**: Leverage browser caching

### Backend Optimization

- **KV Caching**: Cache frequently accessed data
- **Batch Operations**: Minimize KV write operations
- **Error Handling**: Efficient error handling to avoid retries
- **Request Optimization**: Minimize API calls

### Database Optimization

- **Efficient Queries**: Design data models for efficient reads
- **Indexing**: Use proper key structures in KV
- **Data Structure**: Optimize JSON structures for size
- **Batch Reads**: Read multiple items when possible

## Monitoring Performance

### Cloudflare Analytics

Monitor your Worker performance in the Cloudflare dashboard:

- **Request Count**: Track daily request volume
- **Error Rate**: Monitor error rates
- **Response Times**: Track average response times
- **CPU Time**: Monitor CPU usage per request

### Key Metrics to Watch

- **Requests per Day**: Track against free tier limit
- **KV Operations**: Monitor read/write counts
- **Error Rate**: Should be < 1%
- **Response Time**: Should be < 200ms average

## Performance Testing

### Load Testing

Test your store's performance under load:

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-store.workers.dev/api/products

# Using curl for timing
curl -w "@curl-format.txt" -o /dev/null -s https://your-store.workers.dev/
```

### Monitoring Tools

- **Cloudflare Dashboard**: Built-in analytics
- **Real User Monitoring**: Track actual user performance
- **Synthetic Monitoring**: Test from multiple locations
- **Error Tracking**: Monitor and alert on errors

## Troubleshooting Performance Issues

### Slow Response Times

- **Check KV Operations**: Too many reads/writes can slow down
- **Review Caching**: Ensure proper cache headers
- **Optimize Images**: Large images slow down page loads
- **Check Dependencies**: Heavy dependencies increase bundle size

### High Request Counts

- **Enable Caching**: Reduce duplicate requests
- **Optimize Frontend**: Reduce unnecessary API calls
- **Use CDN**: Leverage Cloudflare's CDN for static assets
- **Monitor Bots**: Block unnecessary bot traffic

### KV Limit Issues

- **Optimize Reads**: Cache frequently accessed data
- **Batch Operations**: Combine multiple operations
- **Review Data Structure**: Optimize for efficient queries
- **Consider Upgrading**: Move to paid tier if needed

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

