import { describe, it, expect } from "vitest";
import { decodeCKBAddress } from "./fiber.js";

const SECP256K1_BLAKE160_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1df9926a1fb9d6e800f97a0af9a43340e4c";

describe("decodeCKBAddress", () => {
  describe("short format (Bech32, format type 0x01)", () => {
    // From RFC-0021: args=b39bbc0b3673c7d36450bc14cfcdad2d559c6c64
    const SHORT_ADDR = "ckb1qyqt8xaupvm8837nv3gtc9x0ekkj64vud3jqfwyw5v";

    it("decodes a short format mainnet address", () => {
      const result = decodeCKBAddress(SHORT_ADDR);

      expect(result.code_hash).toBe(SECP256K1_BLAKE160_CODE_HASH);
      expect(result.hash_type).toBe("type");
      expect(result.args).toBe("0xb39bbc0b3673c7d36450bc14cfcdad2d559c6c64");
    });

    it("produces consistent results", () => {
      const r1 = decodeCKBAddress(SHORT_ADDR);
      const r2 = decodeCKBAddress(SHORT_ADDR);
      expect(r1).toEqual(r2);
    });
  });

  describe("short format multisig (code_hash_index 0x01)", () => {
    const MULTISIG_ADDR = "ckb1qyq5lv479ewscx3ms620sv34pgeuz6zagaaqklhtgg";

    it("decodes a multisig short format address", () => {
      const result = decodeCKBAddress(MULTISIG_ADDR);

      expect(result.code_hash).toBe(SECP256K1_BLAKE160_CODE_HASH);
      expect(result.hash_type).toBe("type");
      expect(result.args).toBe("0x4fb2be2e5d0c1a3b8694f832350a33c1685d477a");
    });
  });

  describe("full format (Bech32m, format type 0x00)", () => {
    const FULL_ADDR =
      "ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqdnnw7qkdnnclfkg59uzn8umtfd2kwxceqxwquc4";

    it("decodes a full format mainnet address", () => {
      const result = decodeCKBAddress(FULL_ADDR);

      expect(result.code_hash).toBe(
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8"
      );
      expect(result.hash_type).toBe("type");
      // Args may include trailing padding from base32 decoding
      expect(result.args.toLowerCase()).toContain("b39bbc0b3673c7d36450bc14cfcdad2d559c6c64");
    });
  });

  describe("deprecated full format (Bech32, format type 0x04)", () => {
    const DEPRECATED_ADDR =
      "ckb1qjda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xw3vumhs9nvu786dj9p0q5elx66t24n3kxgj53qks";

    it("decodes a deprecated full format address", () => {
      const result = decodeCKBAddress(DEPRECATED_ADDR);

      expect(result.code_hash).toBe(
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8"
      );
      // Format type 0x04 = hash_type "Type" per RFC-0021
      expect(result.hash_type).toBe("type");
      expect(result.args.toLowerCase()).toContain("b39bbc0b3673c7d36450bc14cfcdad2d559c6c64");
    });
  });

  describe("testnet addresses", () => {
    const TESTNET_ADDR = "ckt1qyqt8xaupvm8837nv3gtc9x0ekkj64vud3jqctftt2";

    it("decodes a testnet short format address", () => {
      const result = decodeCKBAddress(TESTNET_ADDR);

      expect(result.code_hash).toBe(SECP256K1_BLAKE160_CODE_HASH);
      expect(result.hash_type).toBe("type");
      expect(result.args).toMatch(/^0x[0-9a-f]{40}$/);
    });
  });

  describe("error handling", () => {
    it("throws on invalid prefix", () => {
      expect(() =>
        decodeCKBAddress("eth1qyqt8xaupvm8837nv3gtc9x0ekkj64vud3jqfwyw5v")
      ).toThrow('Invalid CKB address prefix');
    });

    it("throws on empty string", () => {
      expect(() => decodeCKBAddress("")).toThrow();
    });

    it("throws on too short address", () => {
      expect(() => decodeCKBAddress("ckb1q")).toThrow();
    });
  });
});
