import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMemoryStorage, type Storage } from "../services/storage.js";
import { createAuthMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { createCreatorRoutes } from "./creators.js";
import { createPaymentRoutes } from "./payments.js";

// Helper to parse JSON from a Response
async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

// Create a test app with all routes
function createTestApp(storage: Storage) {
  const app = new Hono();

  app.use("*", cors());
  app.use("/api/*", rateLimitMiddleware);
  app.use("/api/*", createAuthMiddleware(storage));

  app.route("/api/creators", createCreatorRoutes(storage));
  app.route("/api/payments", createPaymentRoutes(storage));

  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}

describe("API Integration", () => {
  let storage: Storage;
  let app: Hono;
  let creatorId: string;
  let creatorApiKey: string;
  let creatorAddress: string;

  beforeAll(async () => {
    storage = createMemoryStorage();
    app = createTestApp(storage);

    // Register a creator for shared use across tests
    const res = await app.request("/api/creators/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Integration Test Creator",
      }),
    });
    const body = await json(res);
    creatorId = body.id as string;
    creatorApiKey = body.apiKey as string;
    creatorAddress = body.ckbAddress as string;
  });

  describe("Health check", () => {
    it("returns ok status", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
    });
  });

  describe("Creator registration", () => {
    it("registers a new creator", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
          displayName: "Second Creator",
        }),
      });

      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.id).toBeDefined();
      expect(body.apiKey).toBeDefined();
      expect(body.ckbAddress).toBe("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
      expect(body.displayName).toBe("Second Creator");
    });

    it("rejects missing fields", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("rejects invalid JSON body", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json at all",
      });

      expect(res.status).toBe(400);
    });

    it("rejects displayName that is too long", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
          displayName: "x".repeat(101),
        }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects empty displayName", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
          displayName: "",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects invalid CKB address", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "invalid",
          displayName: "Bad Address",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects duplicate address", async () => {
      const res = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
          displayName: "Duplicate",
        }),
      });

      expect(res.status).toBe(409);
    });
  });

  describe("Creator profile", () => {
    it("gets creator by id", async () => {
      const res = await app.request(`/api/creators/${creatorId}`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.displayName).toBe("Integration Test Creator");
      expect(body.ckbAddress).toBe(creatorAddress);
    });

    it("returns 404 for unknown id", async () => {
      const res = await app.request("/api/creators/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("Creator config update", () => {
    it("updates config with valid API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creatorApiKey,
        },
        body: JSON.stringify({ theme: "dark" }),
      });

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.success).toBe(true);
    });

    it("rejects without API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "dark" }),
      });

      expect(res.status).toBe(401);
    });

    it("rejects with invalid API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "ft_live_invalid",
        },
        body: JSON.stringify({ theme: "dark" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Payment flow", () => {
    it("creates a payment request", async () => {
      const res = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "100000000",
          message: "Great article!",
        }),
      });

      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.paymentId).toBeDefined();
      expect(body.expiresAt).toBeGreaterThan(Date.now());
    });

    it("rejects missing creator", async () => {
      const res = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c_nonexistent",
          amount: "100000000",
        }),
      });

      expect(res.status).toBe(404);
    });

    it("rejects zero amount", async () => {
      const res = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "0",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("confirms payment", async () => {
      const createRes = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "500000000",
          message: "Coffee!",
        }),
      });
      const { paymentId } = (await json(createRes)) as { paymentId: string };

      const res = await app.request(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          senderAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        }),
      });

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("pending");
      expect(body.paymentId).toBe(paymentId);
    });

    it("rejects invalid txHash format", async () => {
      const createRes = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "100000000",
          message: "Test",
        }),
      });
      const { paymentId } = (await json(createRes)) as { paymentId: string };

      const res = await app.request(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: "not-a-hash",
          senderAddress: "ckt1q...",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("gets payment status", async () => {
      const createRes = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "200000000",
          message: "Status test",
        }),
      });
      const { paymentId } = (await json(createRes)) as { paymentId: string };

      const res = await app.request(`/api/payments/${paymentId}/status`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBeDefined();
      expect(body.amount).toBe("200000000");
    });

    it("returns 404 for unknown payment", async () => {
      const res = await app.request("/api/payments/nonexistent/status");
      expect(res.status).toBe(404);
    });
  });

  describe("Payment request JSON error handling", () => {
    it("rejects invalid JSON in payment request", async () => {
      const res = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ broken json",
      });

      expect(res.status).toBe(400);
    });

    it("rejects invalid JSON in payment confirm", async () => {
      const createRes = await app.request("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          amount: "100000000",
        }),
      });
      const { paymentId } = (await json(createRes)) as { paymentId: string };

      const res = await app.request(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("404 handler", () => {
    it("returns 404 for unknown non-API routes", async () => {
      const res = await app.request("/nonexistent");
      expect(res.status).toBe(404);
    });

    it("returns 401 for unknown API routes without auth", async () => {
      const res = await app.request("/api/nonexistent");
      expect(res.status).toBe(401);
    });
  });

  describe("Webhook registration", () => {
    it("registers a webhook with valid API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creatorApiKey,
        },
        body: JSON.stringify({
          url: "https://example.com/webhook",
        }),
      });

      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.webhookId).toBeDefined();
      expect(body.secret).toBeDefined();
      expect(typeof body.secret).toBe("string");
      expect((body.secret as string).startsWith("whsec_")).toBe(true);
    });

    it("rejects webhook without API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/webhook",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("rejects invalid webhook URL", async () => {
      const res = await app.request(`/api/creators/${creatorId}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creatorApiKey,
        },
        body: JSON.stringify({
          url: "not-a-url",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("deletes a webhook", async () => {
      // First create one
      const createRes = await app.request(`/api/creators/${creatorId}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creatorApiKey,
        },
        body: JSON.stringify({
          url: "https://example.com/delete-me",
        }),
      });
      const { webhookId } = (await json(createRes)) as { webhookId: string };

      const res = await app.request(`/api/creators/${creatorId}/webhooks/${webhookId}`, {
        method: "DELETE",
        headers: {
          "x-api-key": creatorApiKey,
        },
      });

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.success).toBe(true);
    });

    it("returns 404 for nonexistent webhook", async () => {
      const res = await app.request(`/api/creators/${creatorId}/webhooks/nonexistent`, {
        method: "DELETE",
        headers: {
          "x-api-key": creatorApiKey,
        },
      });

      expect(res.status).toBe(404);
    });

    it("rejects delete without API key", async () => {
      const res = await app.request(`/api/creators/${creatorId}/webhooks/nonexistent`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("rejects delete for wrong creator", async () => {
      // Register a second creator with a different valid address
      const regRes = await app.request("/api/creators/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ckbAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3d",
          displayName: "Other Creator",
        }),
      });
      const { apiKey: otherKey } = (await json(regRes)) as { id: string; apiKey: string };

      const res = await app.request(`/api/creators/${creatorId}/webhooks/nonexistent`, {
        method: "DELETE",
        headers: {
          "x-api-key": otherKey,
        },
      });

      expect(res.status).toBe(403);
    });
  });
});
