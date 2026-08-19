import { Hono } from "hono";
import type { Storage } from "../services/storage.js";

export function createCreatorRoutes(storage: Storage) {
  const app = new Hono();

  // POST /api/creators/register
  app.post("/register", async (c) => {
    const body = await c.req.json();
    const { ckbAddress, displayName } = body;

    if (!ckbAddress || !displayName) {
      return c.json({ error: "ckbAddress and displayName are required" }, 400);
    }

    // Validate CKB address format
    if (!/^(ckb1q|ckt1q)[a-z0-9]+$/i.test(ckbAddress) || ckbAddress.length < 46) {
      return c.json({ error: "Invalid CKB address format" }, 400);
    }

    // Check if address already registered
    const existing = await storage.getCreatorByAddress(ckbAddress);
    if (existing) {
      return c.json({ error: "Address already registered" }, 409);
    }

    const creator = storage.createCreator({ ckbAddress, displayName });

    return c.json(
      {
        id: creator.id,
        apiKey: creator.apiKey,
        ckbAddress: creator.ckbAddress,
        displayName: creator.displayName,
      },
      201
    );
  });

  // GET /api/creators/:id
  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const creator = await storage.getCreatorById(id);

    if (!creator) {
      return c.json({ error: "Creator not found" }, 404);
    }

    return c.json({
      id: creator.id,
      displayName: creator.displayName,
      ckbAddress: creator.ckbAddress,
      createdAt: creator.createdAt,
    });
  });

  // PATCH /api/creators/:id/config
  app.patch("/:id/config", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");

    // Ensure the authenticated creator can only update their own config
    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();
    const { theme, presetAmounts, customLabel } = body;

    await storage.updateCreatorConfig(id, {
      ...(theme && { theme }),
      ...(presetAmounts && { presetAmounts }),
      ...(customLabel && { customLabel }),
    });

    return c.json({ success: true });
  });

  // POST /api/creators/:id/webhooks
  app.post("/:id/webhooks", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");

    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();
    const { url, secret } = body;

    if (!url || !secret) {
      return c.json({ error: "url and secret are required" }, 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return c.json({ error: "Invalid URL format" }, 400);
    }

    const webhook = storage.addWebhook(id, url, secret);

    return c.json({ webhookId: webhook.id }, 201);
  });

  return app;
}
