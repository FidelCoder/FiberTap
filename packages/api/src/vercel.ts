import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/vercel";
import { loadConfig } from "./config.js";
import { createMongoStorage, createMemoryStorage, type Storage } from "./services/storage.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { createCreatorRoutes } from "./routes/creators.js";
import { createPaymentRoutes } from "./routes/payments.js";
import { LANDING_PAGE } from "./landing.js";
import { DOCS_PAGE } from "./docs.js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const config = loadConfig();
const useMongo =
  (process.env.NODE_ENV === "production" || process.env.USE_MONGO === "true") &&
  !!process.env.MONGODB_URI;
const storage: Storage = useMongo
  ? createMongoStorage(config.mongoUri, config.mongoDb)
  : createMemoryStorage();

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "x-api-key"],
    maxAge: 86400,
  })
);

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

// Landing page
app.get("/", (c) => c.html(LANDING_PAGE));

// Serve widget JS — try to read from disk (works locally), fall back to CDN
let widgetJs = "";
try {
  // At bundle time, this path will be resolved relative to the package
  const widgetPath = resolve(
    process.cwd(),
    "packages/widget/dist/widget.min.js"
  );
  if (existsSync(widgetPath)) {
    widgetJs = readFileSync(widgetPath, "utf-8");
  }
} catch {
  // Ignore — widget might not be available
}

app.get("/widget.min.js", (c) => {
  if (!widgetJs) {
    // Redirect to CDN if widget not available locally
    return c.redirect("https://cdn.fibertap.dev/widget.min.js", 302);
  }
  return new Response(widgetJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// Docs page
app.get("/docs", (c) => c.html(DOCS_PAGE));
app.get("/docs/*", (c) => c.html(DOCS_PAGE));

app.notFound((c) => c.json({ error: "Not found" }, 404));

// Vercel serverless handler
export default handle(app);
