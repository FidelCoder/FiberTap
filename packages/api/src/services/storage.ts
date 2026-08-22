import { MongoClient, type Db, type Collection } from "mongodb";
import type { Creator, WidgetConfig, PaymentRequest, Webhook } from "@fibertap/core";
import { generatePaymentId, PAYMENT_EXPIRY_MS } from "@fibertap/core";

// A Creator record with the API key attached
export type CreatorWithKey = Creator & { apiKey: string };

// Storage interface
export type Storage = {
  // Creators
  createCreator(data: { ckbAddress: string; displayName: string }): Promise<CreatorWithKey>;
  getCreatorById(id: string): Promise<CreatorWithKey | null>;
  getCreatorByAddress(address: string): Promise<CreatorWithKey | null>;
  validateApiKey(key: string): Promise<CreatorWithKey | null>;
  updateCreatorConfig(id: string, config: Partial<WidgetConfig>): Promise<void>;

  // Payments
  createPayment(data: {
    creatorId: string;
    amount: bigint;
    message: string;
  }): Promise<PaymentRequest>;
  getPayment(id: string): Promise<PaymentRequest | null>;
  confirmPayment(id: string, txHash: string, senderAddress: string): Promise<void>;
  updatePaymentStatus(id: string, status: "confirmed" | "failed"): Promise<void>;
  getUnconfirmedPayments(limit?: number): Promise<PaymentRequest[]>;

  // Webhooks
  addWebhook(creatorId: string, url: string, secret: string): Promise<Webhook>;
  getWebhooks(creatorId: string): Promise<Webhook[]>;
  deleteWebhook(webhookId: string): Promise<boolean>;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

// MongoDB document types
type CreatorDoc = Omit<Creator, "widgetConfig"> & {
  apiKey: string;
  widgetConfig: WidgetConfig;
};

type PaymentDoc = {
  id: string;
  creatorId: string;
  amount: string;
  message: string;
  createdAt: number;
  expiresAt: number;
  txHash?: string;
  senderAddress?: string;
  status?: string;
};

type WebhookDoc = Webhook;

function paymentDocToRequest(doc: PaymentDoc): PaymentRequest {
  return {
    id: doc.id,
    creatorId: doc.creatorId,
    amount: BigInt(doc.amount),
    message: doc.message,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
    txHash: doc.txHash,
    senderAddress: doc.senderAddress,
    status: doc.status as PaymentRequest["status"],
  };
}

// ============================================================================
// MongoDB Storage
// ============================================================================

export function createMongoStorage(uri: string, dbName: string = "fibertap"): Storage {
  let client: MongoClient;
  let db: Db;
  let creators: Collection<CreatorDoc>;
  let payments: Collection<PaymentDoc>;
  let webhooks: Collection<WebhookDoc>;

  return {
    async connect() {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
      creators = db.collection("creators");
      payments = db.collection("payments");
      webhooks = db.collection("webhooks");

      // Create indexes
      await creators.createIndex({ ckbAddress: 1 }, { unique: true });
      await creators.createIndex({ apiKey: 1 }, { unique: true });
      await payments.createIndex({ creatorId: 1 });
      await payments.createIndex({ status: 1 });
      await payments.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await webhooks.createIndex({ creatorId: 1 });
    },

    async disconnect() {
      if (client) {
        await client.close();
      }
    },

    async createCreator(data) {
      const id = generatePaymentId();
      const apiKey = `ft_live_${generatePaymentId()}`;
      const doc: CreatorDoc = {
        id,
        ckbAddress: data.ckbAddress,
        displayName: data.displayName,
        createdAt: Date.now(),
        apiKey,
        widgetConfig: {
          theme: "auto",
          position: "bottom-right",
          presetAmounts: [1, 5, 10],
          currency: "ckb",
          customLabel: "Tip",
        },
      };

      await creators.insertOne(doc);
      return doc;
    },

    async getCreatorById(id) {
      return creators.findOne({ id });
    },

    async getCreatorByAddress(address) {
      return creators.findOne({ ckbAddress: address });
    },

    async validateApiKey(key) {
      return creators.findOne({ apiKey: key });
    },

    async updateCreatorConfig(id, config) {
      const updateFields: Record<string, unknown> = {};
      if (config.theme !== undefined) updateFields["widgetConfig.theme"] = config.theme;
      if (config.position !== undefined) updateFields["widgetConfig.position"] = config.position;
      if (config.presetAmounts !== undefined) updateFields["widgetConfig.presetAmounts"] = config.presetAmounts;
      if (config.currency !== undefined) updateFields["widgetConfig.currency"] = config.currency;
      if (config.customLabel !== undefined) updateFields["widgetConfig.customLabel"] = config.customLabel;

      if (Object.keys(updateFields).length > 0) {
        await creators.updateOne({ id }, { $set: updateFields });
      }
    },

    async createPayment(data) {
      const now = Date.now();
      const doc: PaymentDoc = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount.toString(),
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
        status: "pending",
      };

      await payments.insertOne(doc);
      return paymentDocToRequest(doc);
    },

    async getPayment(id) {
      const doc = await payments.findOne({ id });
      if (!doc) return null;
      return paymentDocToRequest(doc);
    },

    async confirmPayment(id, txHash, senderAddress) {
      await payments.updateOne(
        { id },
        { $set: { txHash, senderAddress, status: "pending" } }
      );
    },

    async updatePaymentStatus(id, status) {
      await payments.updateOne({ id }, { $set: { status } });
    },

    async getUnconfirmedPayments(limit = 50) {
      const docs = await payments
        .find({ status: "pending", txHash: { $exists: true } })
        .limit(limit)
        .toArray();
      return docs.map(paymentDocToRequest);
    },

    async addWebhook(creatorId, url, secret) {
      const webhook: WebhookDoc = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now(),
      };

      await webhooks.insertOne(webhook);
      return webhook;
    },

    async getWebhooks(creatorId) {
      return webhooks.find({ creatorId }).toArray();
    },

    async deleteWebhook(webhookId) {
      const result = await webhooks.deleteOne({ id: webhookId });
      return result.deletedCount > 0;
    },
  };
}

// ============================================================================
// In-Memory Storage (development / testing)
// ============================================================================

export function createMemoryStorage(): Storage {
  const creatorStore = new Map<string, CreatorDoc>();
  const paymentStore = new Map<string, PaymentDoc>();
  const webhookStore = new Map<string, WebhookDoc[]>();

  return {
    async connect() {},
    async disconnect() {},

    async createCreator(data) {
      const id = generatePaymentId();
      const apiKey = `ft_live_${generatePaymentId()}`;
      const doc: CreatorDoc = {
        id,
        ckbAddress: data.ckbAddress,
        displayName: data.displayName,
        createdAt: Date.now(),
        apiKey,
        widgetConfig: {
          theme: "auto",
          position: "bottom-right",
          presetAmounts: [1, 5, 10],
          currency: "ckb",
          customLabel: "Tip",
        },
      };
      creatorStore.set(id, doc);
      return doc;
    },

    async getCreatorById(id) {
      return creatorStore.get(id) ?? null;
    },

    async getCreatorByAddress(address) {
      for (const doc of creatorStore.values()) {
        if (doc.ckbAddress === address) return doc;
      }
      return null;
    },

    async validateApiKey(key) {
      for (const doc of creatorStore.values()) {
        if (doc.apiKey === key) return doc;
      }
      return null;
    },

    async updateCreatorConfig(id, config) {
      const doc = creatorStore.get(id);
      if (doc) {
        doc.widgetConfig = { ...doc.widgetConfig, ...config };
      }
    },

    async createPayment(data) {
      const now = Date.now();
      const doc: PaymentDoc = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount.toString(),
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
        status: "pending",
      };
      paymentStore.set(doc.id, doc);
      return paymentDocToRequest(doc);
    },

    async getPayment(id) {
      const doc = paymentStore.get(id);
      if (!doc) return null;
      return paymentDocToRequest(doc);
    },

    async confirmPayment(id, txHash, senderAddress) {
      const doc = paymentStore.get(id);
      if (doc) {
        doc.txHash = txHash;
        doc.senderAddress = senderAddress;
        doc.status = "pending";
      }
    },

    async updatePaymentStatus(id, status) {
      const doc = paymentStore.get(id);
      if (doc) {
        doc.status = status;
      }
    },

    async getUnconfirmedPayments(limit = 50) {
      const results: PaymentDoc[] = [];
      for (const doc of paymentStore.values()) {
        if (doc.status === "pending" && doc.txHash) {
          results.push(doc);
          if (results.length >= limit) break;
        }
      }
      return results.map(paymentDocToRequest);
    },

    async addWebhook(creatorId, url, secret) {
      const webhook: WebhookDoc = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now(),
      };
      const existing = webhookStore.get(creatorId) ?? [];
      existing.push(webhook);
      webhookStore.set(creatorId, existing);
      return webhook;
    },

    async getWebhooks(creatorId) {
      return webhookStore.get(creatorId) ?? [];
    },

    async deleteWebhook(webhookId) {
      for (const [key, hooks] of webhookStore.entries()) {
        const idx = hooks.findIndex((h) => h.id === webhookId);
        if (idx !== -1) {
          hooks.splice(idx, 1);
          webhookStore.set(key, hooks);
          return true;
        }
      }
      return false;
    },
  };
}
