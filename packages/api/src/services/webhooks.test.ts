import { describe, it, expect, vi, beforeEach } from "vitest";
import { deliverWebhook, verifyHmacSignature } from "./webhooks.js";
import crypto from "crypto";
import type { Webhook, PaymentEvent } from "@fibertap/core";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("verifyHmacSignature", () => {
  it("returns true for valid signature", () => {
    const secret = "test-secret-123";
    const payload = JSON.stringify({ type: "payment.confirmed" });
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyHmacSignature(secret, payload, expected)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const secret = "test-secret-123";
    const payload = JSON.stringify({ type: "payment.confirmed" });

    expect(verifyHmacSignature(secret, payload, "deadbeef00000000000000000000000000000000000000000000000000000000")).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const payload = JSON.stringify({ type: "payment.confirmed" });
    const sig = crypto.createHmac("sha256", "wrong-secret").update(payload).digest("hex");

    expect(verifyHmacSignature("correct-secret", payload, sig)).toBe(false);
  });

  it("returns false for empty signature", () => {
    const payload = JSON.stringify({ type: "payment.confirmed" });
    expect(verifyHmacSignature("secret", payload, "")).toBe(false);
  });

  it("returns false for short signature", () => {
    const payload = JSON.stringify({ type: "payment.confirmed" });
    expect(verifyHmacSignature("secret", payload, "abcd")).toBe(false);
  });
});

describe("deliverWebhook", () => {
  const webhook: Webhook = {
    id: "wh_1",
    creatorId: "cr_1",
    url: "https://example.com/hook",
    secret: "my-secret",
    createdAt: Date.now(),
  };

  const event: PaymentEvent = {
    type: "payment.confirmed",
    paymentId: "pay_1",
    amount: "100000000",
    senderAddress: "ckt1q...",
    txHash: "0xabc123",
    confirmedAt: Date.now(),
    message: "Thanks!",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends webhook with correct headers and signature", { timeout: 30000 }, async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-FiberTap-Event"]).toBe("payment.confirmed");
    expect(typeof options.headers["X-FiberTap-Signature"]).toBe("string");
    expect(options.headers["X-FiberTap-Signature"].length).toBe(64);
  });

  it("retries on 5xx errors", { timeout: 30000 }, async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx errors", { timeout: 30000 }, async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP 404");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns error after max retries", { timeout: 60000 }, async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Max retries exceeded");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("handles network errors with retries", { timeout: 30000 }, async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue({ ok: true, status: 200 });

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("sends correct payload body", { timeout: 30000 }, async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await deliverWebhook(webhook, event);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.type).toBe("payment.confirmed");
    expect(body.paymentId).toBe("pay_1");
    expect(body.amount).toBe("100000000");
    expect(body.senderAddress).toBe("ckt1q...");
    expect(body.txHash).toBe("0xabc123");
  });

  it("returns error for network failure after all retries", { timeout: 60000 }, async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await deliverWebhook(webhook, event);

    expect(result.success).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("includes AbortSignal timeout", { timeout: 30000 }, async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await deliverWebhook(webhook, event);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.signal).toBeDefined();
  });
});
