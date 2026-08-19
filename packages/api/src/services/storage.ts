import type { Creator, WidgetConfig, PaymentRequest, Webhook } from "@fibertap/core";
import { generatePaymentId, PAYMENT_EXPIRY_MS } from "@fibertap/core";

// Storage interface
export type Storage = {
  // Creators
  createCreator(data: { ckbAddress: string; displayName: string }): Creator & { apiKey: string };
  getCreatorById(id: string): (Creator & { apiKey: string }) | null;
  getCreatorByAddress(address: string): (Creator & { apiKey: string }) | null;
  validateApiKey(key: string): (Creator & { apiKey: string }) | null;
  updateCreatorConfig(id: string, config: Partial<WidgetConfig>): void;

  // Payments
  createPayment(data: {
    creatorId: string;
    amount: bigint;
    message: string;
  }): PaymentRequest;
  getPayment(id: string): PaymentRequest | null;
  confirmPayment(id: string, txHash: string, senderAddress: string): void;
  updatePaymentStatus(id: string, status: "confirmed" | "failed"): void;

  // Webhooks
  addWebhook(creatorId: string, url: string, secret: string): Webhook;
  getWebhooks(creatorId: string): Webhook[];
};

// In-memory storage for development
export function createMemoryStorage(): Storage {
  const creators = new Map<string, Creator & { apiKey: string }>();
  const payments = new Map<string, PaymentRequest & { txHash?: string; senderAddress?: string; status?: string }>();
  const webhooks = new Map<string, Webhook[]>();

  return {
    createCreator(data) {
      const id = generatePaymentId();
      const apiKey = `ft_live_${generatePaymentId()}`;
      const creator: Creator & { apiKey: string } = {
        id,
        ckbAddress: data.ckbAddress,
        displayName: data.displayName,
        createdAt: Date.now(),
        widgetConfig: {
          theme: "auto",
          position: "bottom-right",
          presetAmounts: [1, 5, 10],
          currency: "ckb",
          customLabel: "Tip",
        },
        apiKey,
      };
      creators.set(id, creator);
      return creator;
    },

    getCreatorById(id) {
      return creators.get(id) ?? null;
    },

    getCreatorByAddress(address) {
      for (const creator of creators.values()) {
        if (creator.ckbAddress === address) {
          return creator;
        }
      }
      return null;
    },

    validateApiKey(key) {
      for (const creator of creators.values()) {
        if (creator.apiKey === key) {
          return creator;
        }
      }
      return null;
    },

    updateCreatorConfig(id, config) {
      const creator = creators.get(id);
      if (creator) {
        creator.widgetConfig = { ...creator.widgetConfig, ...config };
      }
    },

    createPayment(data) {
      const now = Date.now();
      const payment: PaymentRequest & { status?: string } = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount,
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
        status: "pending",
      };
      payments.set(payment.id, payment);
      return payment;
    },

    getPayment(id) {
      return payments.get(id) ?? null;
    },

    confirmPayment(id, txHash, senderAddress) {
      const payment = payments.get(id);
      if (payment) {
        payment.txHash = txHash;
        payment.senderAddress = senderAddress;
        payment.status = "pending";
      }
    },

    updatePaymentStatus(id, status) {
      const payment = payments.get(id);
      if (payment) {
        payment.status = status;
      }
    },

    addWebhook(creatorId, url, secret) {
      const webhook: Webhook = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now(),
      };
      const existing = webhooks.get(creatorId) ?? [];
      existing.push(webhook);
      webhooks.set(creatorId, existing);
      return webhook;
    },

    getWebhooks(creatorId) {
      return webhooks.get(creatorId) ?? [];
    },
  };
}
