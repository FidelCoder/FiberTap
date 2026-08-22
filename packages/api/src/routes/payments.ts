import { Hono } from "hono";
import type { Storage } from "../services/storage.js";
import { isExpired } from "@fibertap/core";

export function createPaymentRoutes(storage: Storage) {
  const app = new Hono();

  // POST /api/payments/request
  app.post("/request", async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { creatorAddress, amount, message, senderAddress } = body as {
      creatorAddress?: string;
      amount?: string | number;
      message?: string;
      senderAddress?: string;
    };

    if (!creatorAddress || !amount) {
      return c.json({ error: "creatorAddress and amount are required" }, 400);
    }

    // Sanitize message input
    const sanitizedMessage = sanitizeInput(message ?? "");

    // Find creator by address
    const creator = await storage.getCreatorByAddress(creatorAddress);
    if (!creator) {
      return c.json({ error: "Creator not found" }, 404);
    }

    // Parse amount (shannons as string)
    let amountBigInt: bigint;
    try {
      amountBigInt = BigInt(amount);
    } catch {
      return c.json({ error: "Invalid amount format" }, 400);
    }

    if (amountBigInt <= 0n) {
      return c.json({ error: "Amount must be positive" }, 400);
    }

    const payment = await storage.createPayment({
      creatorId: creator.id,
      amount: amountBigInt,
      message: sanitizedMessage,
    });

    return c.json(
      {
        paymentId: payment.id,
        expiresAt: payment.expiresAt,
      },
      201
    );
  });

  // POST /api/payments/:id/confirm
  app.post("/:id/confirm", async (c) => {
    const id = c.req.param("id");
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { txHash, senderAddress } = body as { txHash?: string; senderAddress?: string };

    if (!txHash || !senderAddress) {
      return c.json({ error: "txHash and senderAddress are required" }, 400);
    }

    // Basic txHash format validation
    if (!/^0x[0-9a-f]+$/i.test(txHash)) {
      return c.json({ error: "Invalid txHash format" }, 400);
    }

    const payment = await storage.getPayment(id);
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    if (isExpired(payment.expiresAt)) {
      return c.json({ error: "Payment request expired" }, 410);
    }

    await storage.confirmPayment(id, txHash, senderAddress);

    // Webhooks are delivered by the background payment verifier
    // when on-chain confirmation is verified — not here.

    return c.json({
      status: "pending",
      paymentId: id,
      txHash,
    });
  });

  // GET /api/payments/:id/status
  app.get("/:id/status", async (c) => {
    const id = c.req.param("id");
    const payment = await storage.getPayment(id);

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    return c.json({
      status: payment.status ?? "pending",
      amount: payment.amount.toString(),
      message: payment.message,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
    });
  });

  return app;
}

// Sanitize user input to prevent XSS and injection
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
    .slice(0, 200); // Enforce max length
}
