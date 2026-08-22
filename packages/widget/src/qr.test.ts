import { describe, it, expect } from "vitest";
import { qrCodeSvg, ckbTransferUri } from "./qr.js";

describe("qrCodeSvg", () => {
  it("returns a valid SVG string", () => {
    const svg = qrCodeSvg("hello");
    expect(svg).toContain("<svg");
    expect(svg).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
    expect(svg).toContain("</svg>");
  });

  it("encodes data into a path element", () => {
    const svg = qrCodeSvg("test");
    expect(svg).toContain("<path");
    expect(svg).toContain("fill=\"#000\"");
  });

  it("has a white background by default", () => {
    const svg = qrCodeSvg("data");
    expect(svg).toContain("fill=\"#fff\"");
  });

  it("supports custom colors", () => {
    const svg = qrCodeSvg("data", 200, "#333", "#eee");
    expect(svg).toContain("fill=\"#333\"");
    expect(svg).toContain("fill=\"#eee\"");
  });

  it("supports custom size", () => {
    const svg = qrCodeSvg("data", 300);
    expect(svg).toContain("width=\"300\"");
    expect(svg).toContain("height=\"300\"");
    expect(svg).toContain("viewBox=\"0 0 300 300\"");
  });

  it("generates different SVGs for different data", () => {
    const svg1 = qrCodeSvg("hello");
    const svg2 = qrCodeSvg("world");
    expect(svg1).not.toBe(svg2);
  });

  it("can encode a CKB transfer URI", () => {
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 5);
    const svg = qrCodeSvg(uri);
    expect(svg).toContain("<svg");
    // URI should be encoded in the QR
    expect(uri).toContain("web+ckb:transfer");
    expect(uri).toContain("address=ckt1qyqvsv");
    expect(uri).toContain("amount=5");
  });
});

describe("ckbTransferUri", () => {
  it("generates a URI with address only", () => {
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
    expect(uri).toBe("web+ckb:transfer?address=ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
  });

  it("generates a URI with address and amount", () => {
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 10);
    expect(uri).toContain("address=ckt1qyqvsv");
    expect(uri).toContain("amount=10");
  });

  it("generates a URI with address, amount, and message", () => {
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 5, "Great post!");
    expect(uri).toContain("address=ckt1qyqvsv");
    expect(uri).toContain("amount=5");
    expect(uri).toContain("message=Great+post%21");
  });

  it("truncates long messages", () => {
    const longMsg = "a".repeat(200);
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 1, longMsg);
    const msgMatch = uri.match(/message=([^&]+)/);
    expect(msgMatch).not.toBeNull();
    expect(msgMatch![1].length).toBeLessThanOrEqual(100);
  });

  it("omits amount when zero or undefined", () => {
    const uri1 = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
    expect(uri1).not.toContain("amount=");

    const uri2 = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 0);
    expect(uri2).not.toContain("amount=");
  });

  it("omits message when empty", () => {
    const uri = ckbTransferUri("ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 5, "");
    expect(uri).not.toContain("message=");
  });

  it("uses mainnet address format", () => {
    const uri = ckbTransferUri("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c", 1);
    expect(uri).toContain("address=ckb1qyqvsv");
  });
});
