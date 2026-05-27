# Reliability

Expectations for stable behavior on Cloudflare Workers.

## Platform constraints

- **CPU time** per request is limited (Workers free tier ~10ms CPU; watch heavy loops).
- **KV** is eventually consistent; avoid assuming read-after-write across keys in separate requests without care.
- **Cold starts** are usually small; still avoid loading large modules in hot paths unnecessarily.

## Error handling

- Use `errorHandler` middleware for consistent JSON errors.
- Map domain errors (`NotFoundError`) to 404; unexpected errors to 500 without leaking secrets.
- Log server-side details only in Worker (never return `STRIPE_SECRET_KEY` or `ADMIN_PASSWORD`).

## Limits

- `productLimitMiddleware` enforces product caps on free-tier deployments—see [CONFIGURATION.md](./CONFIGURATION.md).

## External dependencies

| Dependency | Failure mode | Mitigation |
|------------|--------------|------------|
| Stripe API | 5xx / network | Return clear checkout error; retry idempotent reads in service layer |
| KV | timeout | Propagate 503-style message; don’t corrupt partial writes |
| R2 / Google (optional) | auth or quota | Graceful degradation in media flows |

## Testing reliability

- Integration tests under `tests/integration/` mock or use test doubles where possible.
- Run `npm test -- --run` before merge; flaky tests should be fixed or quarantined with an issue—not ignored silently.

## Related

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [PERFORMANCE.md](./PERFORMANCE.md)
