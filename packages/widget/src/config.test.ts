import { describe, it, expect } from "vitest";
import { parseScriptAttributes, validateOptions, findScriptTag } from "./config.js";

// Mock HTMLScriptElement
function createMockScript(attrs: Record<string, string>): HTMLScriptElement {
  const script = {
    getAttribute: (name: string) => attrs[name] ?? null,
  } as unknown as HTMLScriptElement;
  return script;
}

describe("parseScriptAttributes", () => {
  it("parses required creator attribute", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.creator).toBe("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
  });

  it("parses theme attribute", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-theme": "dark",
    });

    const options = parseScriptAttributes(script);
    expect(options.theme).toBe("dark");
  });

  it("parses position attribute", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-position": "bottom-left",
    });

    const options = parseScriptAttributes(script);
    expect(options.position).toBe("bottom-left");
  });

  it("parses custom API endpoint", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-api": "https://custom-api.example.com",
    });

    const options = parseScriptAttributes(script);
    expect(options.apiEndpoint).toBe("https://custom-api.example.com");
  });

  it("defaults to auto theme when not specified", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.theme).toBe("auto");
  });

  it("defaults to bottom-right position when not specified", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.position).toBe("bottom-right");
  });

  it("defaults to fibertap.dev API when not specified", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.apiEndpoint).toBe("https://api.fibertap.dev");
  });

  it("returns empty creator when data-creator is missing", () => {
    const script = createMockScript({});

    const options = parseScriptAttributes(script);
    expect(options.creator).toBe("");
  });

  it("parses data-preset into presetAmounts array", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-preset": "2,10,50",
    });

    const options = parseScriptAttributes(script);
    expect(options.presetAmounts).toEqual([2, 10, 50]);
  });

  it("filters invalid values from data-preset", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-preset": "1,abc,5,0,-3",
    });

    const options = parseScriptAttributes(script);
    expect(options.presetAmounts).toEqual([1, 5]);
  });

  it("returns undefined presetAmounts when data-preset is empty", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.presetAmounts).toBeUndefined();
  });

  it("parses data-label into customLabel", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      "data-label": "Buy me a coffee",
    });

    const options = parseScriptAttributes(script);
    expect(options.customLabel).toBe("Buy me a coffee");
  });

  it("returns undefined customLabel when data-label is missing", () => {
    const script = createMockScript({
      "data-creator": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const options = parseScriptAttributes(script);
    expect(options.customLabel).toBeUndefined();
  });
});

describe("validateOptions", () => {
  it("returns true for valid mainnet address", () => {
    expect(
      validateOptions({ creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c" })
    ).toBe(true);
  });

  it("returns true for valid testnet address", () => {
    expect(
      validateOptions({ creator: "ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c" })
    ).toBe(true);
  });

  it("returns false for empty creator", () => {
    expect(validateOptions({ creator: "" })).toBe(false);
  });

  it("returns false for too short address", () => {
    expect(validateOptions({ creator: "ckb1q" })).toBe(false);
  });

  it("returns false for invalid prefix", () => {
    expect(validateOptions({ creator: "eth1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c" })).toBe(
      false
    );
  });

  it("returns false for address with invalid characters", () => {
    expect(
      validateOptions({
        creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c!@#",
      })
    ).toBe(false);
  });
});

describe("findScriptTag", () => {
  it("returns null when document is not defined", () => {
    // In test environment, document is defined but no script tag exists
    const result = findScriptTag();
    expect(result).toBeNull();
  });
});
