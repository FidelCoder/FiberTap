import { Hono } from "hono";
import crypto from "crypto";
import type { WidgetConfig } from "@fibertap/core";
import type { Storage, CreatorWithKey } from "../services/storage.js";

// Hono environment with typed variables
type CreatorEnv = {
  Variables: {
    creator: CreatorWithKey;
  };
};

export function createCreatorRoutes(storage: Storage) {
  const app = new Hono<CreatorEnv>();

  // POST /api/creators/register
  app.post("/register", async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { ckbAddress, displayName } = body as { ckbAddress?: string; displayName?: string };

    if (!ckbAddress || !displayName) {
      return c.json({ error: "ckbAddress and displayName are required" }, 400);
    }

    // Validate CKB address format
    if (!/^(ckb1q|ckt1q)[a-z0-9]+$/i.test(ckbAddress) || ckbAddress.length < 46) {
      return c.json({ error: "Invalid CKB address format" }, 400);
    }

    // Validate displayName length
    if (displayName.length < 1 || displayName.length > 100) {
      return c.json({ error: "displayName must be between 1 and 100 characters" }, 400);
    }

    // Check if address already registered
    const existing = await storage.getCreatorByAddress(ckbAddress);
    if (existing) {
      return c.json({ error: "Address already registered" }, 409);
    }

    const creator = await storage.createCreator({ ckbAddress, displayName });

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
      widgetConfig: creator.widgetConfig,
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

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { theme, presetAmounts, customLabel } = body as {
      theme?: string;
      presetAmounts?: number[];
      customLabel?: string;
    };

    const configUpdate: Partial<WidgetConfig> = {};
    if (theme) configUpdate.theme = theme as WidgetConfig["theme"];
    if (presetAmounts && Array.isArray(presetAmounts)) configUpdate.presetAmounts = presetAmounts;
    if (customLabel) configUpdate.customLabel = customLabel;

    if (Object.keys(configUpdate).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    await storage.updateCreatorConfig(id, configUpdate);

    return c.json({ success: true });
  });

  // POST /api/creators/:id/webhooks
  app.post("/:id/webhooks", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");

    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { url } = body as { url?: string };

    if (!url) {
      return c.json({ error: "url is required" }, 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return c.json({ error: "Invalid URL format" }, 400);
    }

    // Auto-generate a cryptographically secure webhook secret
    const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

    const webhook = await storage.addWebhook(id, url, secret);

    // Return the secret to the creator — they need it to verify signatures
    return c.json({ webhookId: webhook.id, secret }, 201);
  });

  // DELETE /api/creators/:id/webhooks/:webhookId
  app.delete("/:id/webhooks/:webhookId", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");
    const webhookId = c.req.param("webhookId");

    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const deleted = await storage.deleteWebhook(webhookId);
    if (!deleted) {
      return c.json({ error: "Webhook not found" }, 404);
    }

    return c.json({ success: true });
  });

  return app;
}
