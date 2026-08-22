const { readFileSync } = require("fs");
const { join } = require("path");

// Read HTML files
let landingHtml = "";
let docsHtml = "";
try {
  landingHtml = readFileSync(join(__dirname, "_landing.html"), "utf-8");
} catch {}
try {
  docsHtml = readFileSync(join(__dirname, "_docs.html"), "utf-8");
} catch {}

// Try to read widget from dist
let widgetJs = "";
const widgetPaths = [
  join(__dirname, "..", "widget", "dist", "widget.min.js"),
  join(__dirname, "..", "packages", "widget", "dist", "widget.min.js"),
];
for (const p of widgetPaths) {
  try {
    widgetJs = readFileSync(p, "utf-8");
    break;
  } catch {}
}

function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
  };

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health
  if (path === "/health") {
    return new Response(JSON.stringify({ status: "ok", network: "testnet", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Landing page
  if (path === "/") {
    return new Response(landingHtml || "<h1>FiberTap</h1>", {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  // Docs
  if (path === "/docs" || path.startsWith("/docs/")) {
    return new Response(docsHtml || "<h1>Docs</h1>", {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  // Widget JS
  if (path === "/widget.min.js") {
    if (widgetJs) {
      return new Response(widgetJs, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders,
        },
      });
    }
    return new Response(JSON.stringify({ error: "Widget not built" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 404
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

module.exports = handleRequest;
module.exports.GET = handleRequest;
module.exports.POST = handleRequest;
module.exports.DELETE = handleRequest;
module.exports.PATCH = handleRequest;
module.exports.PUT = handleRequest;
