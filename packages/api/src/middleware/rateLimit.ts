import type { Context, Next } from "hono";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();
const MAX_REQUESTS = 100;
const MAX_ENTRIES = 10_000;
const WINDOW_MS = 60 * 1000; // 1 minute

// Clean up expired entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, WINDOW_MS);

// Allow cleanup to not keep the process alive on shutdown
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  const key = c.req.header("x-api-key") ?? c.req.header("x-forwarded-for") ?? "anonymous";
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    // Evict oldest entries if we hit the cap to prevent unbounded memory growth
    if (rateLimits.size >= MAX_ENTRIES) {
      const oldest = rateLimits.keys().next().value;
      if (oldest) rateLimits.delete(oldest);
    }
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
  }

  entry.count++;
  return next();
}
