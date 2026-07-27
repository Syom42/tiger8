const buckets = new Map();

function clientAddress(c) {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
}

export function rateLimit({ key, max, windowMs }) {
  return async (c, next) => {
    const now = Date.now();
    const bucketKey = `${key}:${c.get('uid') ?? clientAddress(c)}`;
    const existing = buckets.get(bucketKey);
    const bucket = !existing || existing.resetAt <= now
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