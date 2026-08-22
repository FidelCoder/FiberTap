import type { Context, Next } from "hono";
import type { Storage, CreatorWithKey } from "../services/storage.js";

// Hono environment with typed variables
type AuthEnv = {
  Variables: {
    creator: CreatorWithKey;
  };
};

// Public endpoints that don't require authentication
// Note: These are checked with startsWith, so order matters
const PUBLIC_PREFIXES = [
  "/api/payments/request",
  "/api/payments/",
  "/api/creators/register",
  "/api/creators/",
  "/health",
];

function isPublicEndpoint(path: string, method: string): boolean {
  // All methods on payment request and register are public
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    // But non-GET on creators/:id/config and creators/:id/webhooks need auth
    if (
      method !== "GET" &&
      path.startsWith("/api/creators/") &&
      !path.endsWith("/register") &&
      (path.endsWith("/config") || path.includes("/webhooks"))
    ) {
      return false;
    }
    return true;
  }
  return false;
}

// Create auth middleware with storage dependency
export function createAuthMiddleware(storage: Storage) {
  return async (c: Context<AuthEnv>, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;

    // Public endpoints - no auth needed
    if (isPublicEndpoint(path, method)) {
      return next();
    }

    const apiKey = c.req.header("x-api-key");
    if (!apiKey) {
      return c.json({ error: "Missing x-api-key header" }, 401);
    }

    const creator = await storage.validateApiKey(apiKey);
    if (!creator) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    // Attach creator to context for route handlers
    c.set("creator", creator);
    return next();
  };
}
