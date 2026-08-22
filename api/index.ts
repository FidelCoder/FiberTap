// Vercel serverless entry point
// This file is built by tsup into api/index.js
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "../packages/api/src/config.js";
import { createMemoryStorage, type Storage } from "../packages/api/src/services/storage.js";
import { createCreatorRoutes } from "../packages/api/src/routes/creators.js";
import { createPaymentRoutes } from "../packages/api/src/routes/payments.js";
import { LANDING_PAGE } from "../packages/api/src/landing.js";
import { DOCS_PAGE } from "../packages/api/src/docs.js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const storage: Storage = createMemoryStorage();

const app = new Hono();

app.use("*", cors({
  origin: config.corsOrigins,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "x-api-key"],
  maxAge: 86400,
}));

// Health
app.get("/health", (c) => c.json({ status: "ok", storage: "memory", network: config.network, timestamp: Date.now() }));

// API routes
app.route("/api/creators", createCreatorRoutes(storage));
app.route("/api/payments", createPaymentRoutes(storage));

// Landing page
app.get("/", (c) => c.html(LANDING_PAGE));

// Docs page
app.get("/docs", (c) => c.html(DOCS_PAGE));
app.get("/docs/*", (c) => c.html(DOCS_PAGE));

// Widget JS
let widgetJs = "";
const widgetPaths = [
  resolve(__dirname, "../packages/api/public/widget.min.js"),
  resolve(__dirname, "../packages/widget/dist/widget.min.js"),
];
for (const p of widgetPaths) {
  if (existsSync(p)) { widgetJs = readFileSync(p, "utf-8"); break; }
}
app.get("/widget.min.js", (c) => {
  if (!widgetJs) return c.json({ error: "Widget not built" }, 404);
  return new Response(widgetJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
