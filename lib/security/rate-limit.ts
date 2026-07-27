type Bucket = { count: number; resetAt: number };

const globalBuckets = globalThis as typeof globalThis & {
  restroCostRateLimits?: Map<string, Bucket>;
};
const buckets = globalBuckets.restroCostRateLimits ?? new Map<string, Bucket>();
globalBuckets.restroCostRateLimits = buckets;

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
  now = Date.now(),
) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterMs: 0 };
  }
  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: current.resetAt - now,
    };
  }
  current.count += 1;
  return {
    allowed: true,
    remaining: options.limit - current.count,
    retryAfterMs: 0,
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
