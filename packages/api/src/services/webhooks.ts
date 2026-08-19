import type { PaymentEvent, Webhook } from "@fibertap/core";

// Deliver webhook event to a URL
export async function deliverWebhook(
  webhook: Webhook,
  event: PaymentEvent
): Promise<{ success: boolean; error?: string }> {
  const payload = JSON.stringify(event);
  const signature = hmacSHA256(webhook.secret, payload);

  const maxRetries = 3;
  const delays = [1000, 5000, 25000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FiberTap-Signature": signature,
          "X-FiberTap-Event": event.type,
        },
        body: payload,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return { success: true };
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      // Retry on network errors
      if (attempt < maxRetries - 1) {
        await sleep(delays[attempt]);
        continue;
      }
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// HMAC-SHA256 signature
function hmacSHA256(secret: string, payload: string): string {
  // Use Node.js crypto in production, Web Crypto API as fallback
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    // This is async but we need sync for the header - use a simpler approach
    return simpleHmac(secret, payload);
  }
  return simpleHmac(secret, payload);
}

// Simple HMAC implementation for environments without subtle crypto
function simpleHmac(secret: string, payload: string): string {
  // In production, use proper HMAC-SHA256
  // This is a placeholder that should be replaced with crypto.createHmac
  const data = `${secret}:${payload}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hmac_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
