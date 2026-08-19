import { Hono } from "hono";
import type { Storage } from "../services/storage.js";
import { PAYMENT_EXPIRY_MS, isExpired } from "@fibertap/core";

export function createPaymentRoutes(storage: Storage) {
  const app = new Hono();

  // POST /api/payments/request
  app.post("/request", async (c) => {
    const body = await c.req.json();
    const { creatorAddress, amount, message, senderAddress } = body;

    if (!creatorAddress || !amount) {
      return c.json({ error: "creatorAddress and amount are required" }, 400);
    }

    // Find creator by address
    const creator = storage.getCreatorByAddress(creatorAddress);
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

    const payment = storage.createPayment({
      creatorId: creator.id,
      amount: amountBigInt,
      message: message ?? "",
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
    const body = await c.req.json();
    const { txHash, senderAddress } = body;

    if (!txHash || !senderAddress) {
      return c.json({ error: "txHash and senderAddress are required" }, 400);
    }

    const payment = storage.getPayment(id);
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    if (isExpired(payment.expiresAt)) {
      return c.json({ error: "Payment request expired" }, 410);
    }

    storage.confirmPayment(id, txHash, senderAddress);

    return c.json({
      status: "pending",
      paymentId: id,
      txHash,
    });
  });

  // GET /api/payments/:id/status
  app.get("/:id/status", async (c) => {
    const id = c.req.param("id");
    const payment = storage.getPayment(id);

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    // Cast to access optional fields
    const p = payment as typeof payment & { txHash?: string; status?: string };

    return c.json({
      status: p.status ?? "pending",
      txHash: p.txHash ?? null,
      amount: payment.amount.toString(),
      message: payment.message,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
    });
  });

  return app;
}
