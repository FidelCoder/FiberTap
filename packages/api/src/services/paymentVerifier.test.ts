import { describe, it, expect, vi, beforeEach } from "vitest";
import { startPaymentVerifier } from "./paymentVerifier.js";
import { createMemoryStorage, type Storage } from "./storage.js";
import type { Config } from "../config.js";

const mockGetTransactionStatus = vi.fn().mockResolvedValue("pending");

vi.mock("@fibertap/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fibertap/core")>();
  return {
    ...actual,
    createFiberClient: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue(0n),
      getTransactionStatus: mockGetTransactionStatus,
      createPayment: vi.fn(),
      broadcastPayment: vi.fn(),
    })),
  };
});

vi.mock("./webhooks.js", () => ({
  deliverWebhook: vi.fn().mockResolvedValue({ success: true }),
}));

const testConfig: Config = {
  port: 3001,
  mongoUri: "",
  mongoDb: "",
  network: "testnet",
  ckbRpcUrl: "https://testnet.ckbapp.dev/rpc",
  ckbIndexerUrl: "https://testnet.ckbapp.dev/indexer",
  corsOrigins: ["*"],
};

describe("PaymentVerifier", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.clearAllMocks();
    mockGetTransactionStatus.mockResolvedValue("pending");
  });

  it("starts and can be aborted", async () => {
    const abort = startPaymentVerifier(storage, testConfig);
    expect(abort).toBeDefined();
    expect(typeof abort.abort).toBe("function");
    abort.abort();
  });

  it("does not crash with no pending payments", { timeout: 15000 }, async () => {
    const abort = startPaymentVerifier(storage, testConfig);
    await new Promise((resolve) => setTimeout(resolve, 200));
    abort.abort();
  });

  it("checks unconfirmed payments and updates status", { timeout: 20000 }, async () => {
    // Create a creator and payment, then confirm with a txHash
    const creator = await storage.createCreator({
      ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      displayName: "Verifier Test",
    });
    const payment = await storage.createPayment({
      creatorId: creator.id,
      amount: 100000000n,
      message: "Test",
    });
    await storage.confirmPayment(payment.id, "0xabcdef1234", "ckt1q...");

    // Mock the fiber client to return "confirmed"
    mockGetTransactionStatus.mockResolvedValue("confirmed");

    const abort = startPaymentVerifier(storage, testConfig);

    // Wait for at least one verification cycle (poll interval is 10s)
    await new Promise((resolve) => setTimeout(resolve, 12000));

    abort.abort();

    // Verify the payment was updated
    const updated = await storage.getPayment(payment.id);
    expect(updated?.status).toBe("confirmed");
  });

  it("marks payment as failed when chain reports failure", { timeout: 20000 }, async () => {
    const creator = await storage.createCreator({
      ckbAddress: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      displayName: "Fail Test",
    });
    const payment = await storage.createPayment({
      creatorId: creator.id,
      amount: 50000000n,
      message: "Fail test",
    });
    await storage.confirmPayment(payment.id, "0xdeadbeef", "ckt1q...");

    mockGetTransactionStatus.mockResolvedValue("failed");

    const abort = startPaymentVerifier(storage, testConfig);

    await new Promise((resolve) => setTimeout(resolve, 12000));

    abort.abort();

    const updated = await storage.getPayment(payment.id);
    expect(updated?.status).toBe("failed");
  });
});
