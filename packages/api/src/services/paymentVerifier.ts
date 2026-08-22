import type { Storage } from "./storage.js";
import type { Config } from "../config.js";
import { createFiberClient } from "@fibertap/core";
import type { FiberClient, PaymentEvent } from "@fibertap/core";
import { deliverWebhook } from "./webhooks.js";

const POLL_INTERVAL_MS = 10_000; // Check every 10 seconds

// Start a background loop that polls the chain for pending payment confirmations
export function startPaymentVerifier(
  storage: Storage,
  config: Config
): AbortController {
  const abortController = new AbortController();

  const fiberClient: FiberClient = createFiberClient({
    rpcUrl: config.ckbRpcUrl,
    indexerUrl: config.ckbIndexerUrl,
    network: config.network,
  });

  const loop = async () => {
    while (!abortController.signal.aborted) {
      try {
        await verifyPendingPayments(storage, fiberClient);
      } catch (err) {
        console.error("Payment verification error:", err);
      }

      // Wait for next interval, but check for abort
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, POLL_INTERVAL_MS);
        abortController.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      });
    }
  };

  loop().catch((err) => {
    if (!abortController.signal.aborted) {
      console.error("Payment verifier loop crashed:", err);
    }
  });

  return abortController;
}

async function verifyPendingPayments(
  storage: Storage,
  fiberClient: FiberClient
): Promise<void> {
  const pendingPayments = await storage.getUnconfirmedPayments(50);

  for (const payment of pendingPayments) {
    if (!payment.txHash) continue;

    try {
      const status = await fiberClient.getTransactionStatus(payment.txHash);

      if (status === "confirmed") {
        await storage.updatePaymentStatus(payment.id, "confirmed");
        console.log(`Payment ${payment.id} confirmed (tx: ${payment.txHash})`);

        // Deliver webhook notifications
        await notifyCreator(storage, payment);
      } else if (status === "failed") {
        await storage.updatePaymentStatus(payment.id, "failed");
        console.log(`Payment ${payment.id} failed (tx: ${payment.txHash})`);

        // Notify creator of failure
        await notifyCreatorFailure(storage, payment);
      }
      // If still "pending", do nothing — will be checked again next cycle
    } catch (err) {
      console.error(`Error checking payment ${payment.id}:`, err);
    }
  }
}

async function notifyCreator(
  storage: Storage,
  payment: {
    id: string;
    creatorId: string;
    amount: bigint;
    message: string;
    txHash?: string;
    senderAddress?: string;
  }
): Promise<void> {
  const webhooks = await storage.getWebhooks(payment.creatorId);
  if (webhooks.length === 0) return;

  const event: PaymentEvent = {
    type: "payment.confirmed",
    paymentId: payment.id,
    amount: payment.amount.toString(),
    senderAddress: payment.senderAddress ?? "",
    txHash: payment.txHash ?? "",
    confirmedAt: Date.now(),
    message: payment.message,
  };

  for (const webhook of webhooks) {
    deliverWebhook(webhook, event).catch((err) => {
      console.error(`Webhook delivery failed for ${webhook.url}:`, err);
    });
  }
}

async function notifyCreatorFailure(
  storage: Storage,
  payment: {
    id: string;
    creatorId: string;
    amount: bigint;
    message: string;
    txHash?: string;
    senderAddress?: string;
  }
): Promise<void> {
  const webhooks = await storage.getWebhooks(payment.creatorId);
  if (webhooks.length === 0) return;

  const event: PaymentEvent = {
    type: "payment.failed",
    paymentId: payment.id,
    amount: payment.amount.toString(),
    senderAddress: payment.senderAddress ?? "",
    txHash: payment.txHash ?? "",
    confirmedAt: Date.now(),
    message: payment.message,
  };

  for (const webhook of webhooks) {
    deliverWebhook(webhook, event).catch((err) => {
      console.error(`Webhook delivery failed for ${webhook.url}:`, err);
    });
  }
}
