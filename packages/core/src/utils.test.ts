import { describe, it, expect } from "vitest";
import {
  formatCKB,
  isValidCKBAddress,
  generatePaymentId,
  ckbToShannons,
  shannonsToCKB,
  isExpired,
  formatTimestamp,
  truncateHash,
  formatError,
} from "./utils.js";

describe("formatCKB", () => {
  it("formats zero", () => {
    expect(formatCKB(0n)).toBe("0 CKB");
  });

  it("formats whole CKB amounts", () => {
    expect(formatCKB(100000000n)).toBe("1 CKB");
    expect(formatCKB(500000000n)).toBe("5 CKB");
    expect(formatCKB(10000000000n)).toBe("100 CKB");
  });

  it("formats large amounts with commas", () => {
    expect(formatCKB(1000000000000n)).toBe("10,000 CKB");
  });

  it("formats fractional amounts", () => {
    expect(formatCKB(150000000n)).toBe("1.5 CKB");
    expect(formatCKB(123456789n)).toMatch(/1.23456789 CKB/);
  });

  it("handles negative amounts", () => {
    expect(formatCKB(-100000000n)).toBe("-1 CKB");
  });
});

describe("isValidCKBAddress", () => {
  it("validates mainnet addresses", () => {
    expect(isValidCKBAddress("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c")).toBe(true);
  });

  it("validates testnet addresses", () => {
    expect(isValidCKBAddress("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(isValidCKBAddress("")).toBe(false);
  });

  it("rejects too short addresses", () => {
    expect(isValidCKBAddress("ckb1q")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidCKBAddress("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c!@#")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isValidCKBAddress(null as unknown as string)).toBe(false);
    expect(isValidCKBAddress(undefined as unknown as string)).toBe(false);
  });
});

describe("generatePaymentId", () => {
  it("generates unique IDs", () => {
    const id1 = generatePaymentId();
    const id2 = generatePaymentId();
    expect(id1).not.toBe(id2);
  });

  it("starts with ft_ prefix", () => {
    const id = generatePaymentId();
    expect(id.startsWith("ft_")).toBe(true);
  });

  it("contains underscore separator", () => {
    const id = generatePaymentId();
    expect(id.split("_").length).toBe(3);
  });
});

describe("ckbToShannons and shannonsToCKB", () => {
  it("converts CKB to shannons", () => {
    expect(ckbToShannons(1)).toBe(100000000n);
    expect(ckbToShannons(5)).toBe(500000000n);
    expect(ckbToShannons(0)).toBe(0n);
  });

  it("converts shannons to CKB", () => {
    expect(shannonsToCKB(100000000n)).toBe(1);
    expect(shannonsToCKB(500000000n)).toBe(5);
    expect(shannonsToCKB(0n)).toBe(0);
  });

  it("round-trips correctly", () => {
    const ckb = 42;
    const shannons = ckbToShannons(ckb);
    expect(shannonsToCKB(shannons)).toBe(ckb);
  });
});

describe("isExpired", () => {
  it("returns true for past timestamps", () => {
    expect(isExpired(Date.now() - 1000)).toBe(true);
  });

  it("returns false for future timestamps", () => {
    expect(isExpired(Date.now() + 100000)).toBe(false);
  });
});

describe("formatTimestamp", () => {
  it("formats to ISO string", () => {
    const ts = 1700000000000;
    const result = formatTimestamp(ts);
    expect(result).toContain("2023");
  });
});

describe("truncateHash", () => {
  it("truncates long hashes", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const result = truncateHash(hash);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(hash.length);
  });

  it("does not truncate short hashes", () => {
    const hash = "0x1234";
    expect(truncateHash(hash)).toBe(hash);
  });

  it("respects custom char count", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const result = truncateHash(hash, 4);
    expect(result.startsWith("0x12")).toBe(true);
    expect(result.endsWith("ef")).toBe(true);
  });
});

describe("formatError", () => {
  it("formats Error objects", () => {
    expect(formatError(new Error("test"))).toBe("test");
  });

  it("formats string errors", () => {
    expect(formatError("something went wrong")).toBe("something went wrong");
  });

  it("formats unknown errors", () => {
    expect(formatError(42)).toBe("An unknown error occurred");
    expect(formatError(null)).toBe("An unknown error occurred");
  });
});
