import type { Context, Next } from "hono";
import type { Storage } from "../services/storage.js";

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  "/api/payments/request",
  "/api/payments/",
  "/health",
];

function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}

// Create auth middleware with storage dependency
export function createAuthMiddleware(storage: Storage) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Public endpoints - no auth needed
    if (isPublicEndpoint(path)) {
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
