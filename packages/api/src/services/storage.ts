import { MongoClient, type Db, type Collection } from "mongodb";
import type { Creator, WidgetConfig, PaymentRequest, Webhook } from "@fibertap/core";
import { generatePaymentId, PAYMENT_EXPIRY_MS } from "@fibertap/core";

// Storage interface
export type Storage = {
  // Creators
  createCreator(data: { ckbAddress: string; displayName: string }): Creator & { apiKey: string };
  getCreatorById(id: string): Promise<(Creator & { apiKey: string }) | null>;
  getCreatorByAddress(address: string): Promise<(Creator & { apiKey: string }) | null>;
  validateApiKey(key: string): Promise<(Creator & { apiKey: string }) | null>;
  updateCreatorConfig(id: string, config: Partial<WidgetConfig>): Promise<void>;

  // Payments
  createPayment(data: {
    creatorId: string;
    amount: bigint;
    message: string;
  }): PaymentRequest;
  getPayment(id: string): Promise<PaymentRequest | null>;
  confirmPayment(id: string, txHash: string, senderAddress: string): Promise<void>;
  updatePaymentStatus(id: string, status: "confirmed" | "failed"): Promise<void>;

  // Webhooks
  addWebhook(creatorId: string, url: string, secret: string): Webhook;
  getWebhooks(creatorId: string): Promise<Webhook[]>;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

// MongoDB document types
type CreatorDoc = Omit<Creator, "widgetConfig"> & {
  apiKey: string;
  widgetConfig: WidgetConfig;
};

type PaymentDoc = Omit<PaymentRequest, "amount"> & {
  amount: string; // stored as string for MongoDB
  txHash?: string;
  senderAddress?: string;
  status?: string;
};

type WebhookDoc = Webhook;

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
      await creators.updateOne({ id }, { $set: { widgetConfig: config } });
    },

    createPayment(data) {
      const now = Date.now();
      const payment: PaymentRequest = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount,
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
      };

      // Fire-and-forget insert (return before DB write)
      const doc: PaymentDoc = {
        ...payment,
        amount: data.amount.toString(),
        status: "pending",
      };
      payments.insertOne(doc).catch(console.error);

      return payment;
    },

    async getPayment(id) {
      const doc = await payments.findOne({ id });
      if (!doc) return null;

      return {
        ...doc,
        amount: BigInt(doc.amount),
      };
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

    addWebhook(creatorId, url, secret) {
      const webhook: WebhookDoc = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now(),
      };

      // Fire-and-forget insert
      webhooks.insertOne(webhook).catch(console.error);

      return webhook;
    },

    async getWebhooks(creatorId) {
      return webhooks.find({ creatorId }).toArray();
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

    createCreator(data) {
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

    createPayment(data) {
      const now = Date.now();
      const payment: PaymentRequest = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount,
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
      };

      const doc: PaymentDoc = {
        ...payment,
        amount: data.amount.toString(),
        status: "pending",
      };
      paymentStore.set(payment.id, doc);

      return payment;
    },

    async getPayment(id) {
      const doc = paymentStore.get(id);
      if (!doc) return null;
      return { ...doc, amount: BigInt(doc.amount) };
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

    addWebhook(creatorId, url, secret) {
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
  };
}
