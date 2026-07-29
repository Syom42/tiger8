// In-memory fixed-window limiter. Per-instance only — good enough to blunt
// bursts on a serverless function, not a distributed quota.
import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Namespace so different limits don't share a bucket. */
  key: string;
  max: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

function clientAddress(c: Context<AppEnv>): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return c.req.header('x-real-ip') ?? 'unknown';
}

export function rateLimit({ key, max, windowMs }: RateLimitOptions): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const now = Date.now();
    // May run before `requireAuth`, in which case there is no uid yet.
    const uid: number | undefined = c.get('uid');
    const bucketKey = `${key}:${uid ?? clientAddress(c)}`;

    const existing = buckets.get(bucketKey);
    const bucket: Bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      return c.json(
        { error: 'too many requests' },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }

    await next();
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Blanket limit on state-changing requests. Runs before `requireAuth`, so it
 *  buckets by client address rather than user id. */
export function limitWrites(options: Omit<RateLimitOptions, 'key'>): MiddlewareHandler<AppEnv> {
  const limiter = rateLimit({ key: 'write', ...options });
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();
    return limiter(c, next);
  };
}
