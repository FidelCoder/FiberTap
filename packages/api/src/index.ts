import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createMemoryStorage } from "./services/storage.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { createCreatorRoutes } from "./routes/creators.js";
import { createPaymentRoutes } from "./routes/payments.js";

const config = loadConfig();
const storage = createMemoryStorage();

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors());
app.use("/api/*", rateLimitMiddleware);
app.use("/api/*", createAuthMiddleware(storage));

// Routes
app.route("/api/creators", createCreatorRoutes(storage));
app.route("/api/payments", createPaymentRoutes(storage));

// Health check
app.get("/health", (c) =>
  c.json({
    status: "ok",
    network: config.network,
    timestamp: Date.now(),
  })
);

// Start server
serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`FiberTap API running on http://localhost:${info.port}`);
    console.log(`Network: ${config.network}`);
  }
);

export default app;
