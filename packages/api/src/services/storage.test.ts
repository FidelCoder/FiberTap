import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMemoryStorage, type Storage } from "./storage.js";

describe("MemoryStorage", () => {
  let storage: Storage;

  beforeAll(() => {
    storage = createMemoryStorage();
  });

  describe("creators", () => {
    it("creates a creator", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Test Blog",
      });

      expect(creator.id).toBeDefined();
      expect(creator.apiKey).toBeDefined();
      expect(creator.ckbAddress).toBe("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
      expect(creator.displayName).toBe("Test Blog");
      expect(creator.widgetConfig.theme).toBe("auto");
    });

    it("gets creator by id", async () => {
      const created = await storage.createCreator({
        ckbAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Test 2",
      });

      const found = await storage.getCreatorById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("gets creator by address", async () => {
      const address = "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c";
      const found = await storage.getCreatorByAddress(address);
      expect(found).not.toBeNull();
      expect(found?.ckbAddress).toBe(address);
    });

    it("validates API key", async () => {
      const created = await storage.createCreator({
        ckbAddress: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Test 3",
      });

      const found = await storage.validateApiKey(created.apiKey);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("returns null for invalid API key", async () => {
      expect(await storage.validateApiKey("invalid_key")).toBeNull();
    });

    it("updates creator config", async () => {
      const created = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Test 4",
      });

      await storage.updateCreatorConfig(created.id, { theme: "dark" });
      const updated = await storage.getCreatorById(created.id);
      expect(updated?.widgetConfig.theme).toBe("dark");
    });
  });

  describe("payments", () => {
    it("creates a payment", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Payment Test",
      });

      const payment = storage.createPayment({
        creatorId: creator.id,
        amount: 100000000n,
        message: "Test payment",
      });

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(100000000n);
      expect(payment.message).toBe("Test payment");
      expect(payment.expiresAt).toBeGreaterThan(Date.now());
    });

    it("gets payment by id", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Payment Test 2",
      });

      const created = storage.createPayment({
        creatorId: creator.id,
        amount: 500000000n,
        message: "Get test",
      });

      const found = await storage.getPayment(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("confirms payment", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Confirm Test",
      });

      const payment = storage.createPayment({
        creatorId: creator.id,
        amount: 200000000n,
        message: "Confirm test",
      });

      await storage.confirmPayment(payment.id, "0xabc123", "ckt1q...");
      const found = await storage.getPayment(payment.id);
      expect(found).not.toBeNull();
    });
  });

  describe("webhooks", () => {
    it("adds a webhook", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Webhook Test",
      });

      const webhook = storage.addWebhook(creator.id, "https://example.com/hook", "secret123");
      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe("https://example.com/hook");
      expect(webhook.secret).toBe("secret123");
    });

    it("gets webhooks for creator", async () => {
      const creator = await storage.createCreator({
        ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
        displayName: "Webhook Test 2",
      });

      storage.addWebhook(creator.id, "https://example.com/hook1", "secret1");
      storage.addWebhook(creator.id, "https://example.com/hook2", "secret2");

      const webhooks = await storage.getWebhooks(creator.id);
      expect(webhooks.length).toBe(2);
    });
  });

  describe("lifecycle", () => {
    it("connects and disconnects without error", async () => {
      const memStorage = createMemoryStorage();
      await memStorage.connect();
      await memStorage.disconnect();
    });
  });
});
