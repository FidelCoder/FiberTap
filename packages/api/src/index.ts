import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createMongoStorage, createMemoryStorage, type Storage } from "./services/storage.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { createCreatorRoutes } from "./routes/creators.js";
import { createPaymentRoutes } from "./routes/payments.js";

const config = loadConfig();

// Use MongoDB in production, in-memory for development
const useMongo = process.env.NODE_ENV === "production" || process.env.USE_MONGO === "true";
const storage: Storage = useMongo
  ? createMongoStorage(config.mongoUri, config.mongoDb)
  : createMemoryStorage();

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
    storage: useMongo ? "mongodb" : "memory",
    network: config.network,
    timestamp: Date.now(),
  })
);

// Start server
async function start() {
  if (useMongo) {
    await storage.connect();
    console.log(`Connected to MongoDB: ${config.mongoDb}`);
  }

  serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    (info) => {
      console.log(`FiberTap API running on http://localhost:${info.port}`);
      console.log(`Network: ${config.network}`);
      console.log(`Storage: ${useMongo ? "mongodb" : "memory"}`);
    }
  );
}

start().catch(console.error);

export default app;
