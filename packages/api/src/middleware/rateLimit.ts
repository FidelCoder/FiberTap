import type { Context, Next } from "hono";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();
const MAX_REQUESTS = 100;
const WINDOW_MS = 60 * 1000; // 1 minute

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, WINDOW_MS);

export async function rateLimitMiddleware(c: Context, next: Next) {
  const key = c.req.header("x-api-key") ?? c.req.header("x-forwarded-for") ?? "anonymous";
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
  }

  entry.count++;
  return next();
}
