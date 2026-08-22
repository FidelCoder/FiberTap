import { describe, it, expect, vi } from "vitest";
import { WIDGET_STYLES, injectStyles } from "./styles.js";

describe("WIDGET_STYLES", () => {
  it("contains trigger button styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-trigger");
    expect(WIDGET_STYLES).toContain("position: fixed");
    expect(WIDGET_STYLES).toContain("border-radius: 50%");
  });

  it("contains panel styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-panel");
    expect(WIDGET_STYLES).toContain("border-radius: 16px");
  });

  it("contains dark theme styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-panel--dark");
    expect(WIDGET_STYLES).toContain("background: #18181f");
  });

  it("contains preset button styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-preset-btn");
  });

  it("contains pay button styles with gradient", () => {
    expect(WIDGET_STYLES).toContain(".ft-pay-btn");
    expect(WIDGET_STYLES).toContain("linear-gradient(135deg, #6366f1, #4f46e5)");
  });

  it("contains status indicator styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-status--loading");
    expect(WIDGET_STYLES).toContain(".ft-status--success");
    expect(WIDGET_STYLES).toContain(".ft-status--error");
  });

  it("contains panel header styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-panel-header");
  });

  it("contains dark trigger styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-trigger--dark");
    expect(WIDGET_STYLES).toContain("linear-gradient(135deg, #4338ca, #3730a3)");
  });

  it("contains mode toggle styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-mode-toggle");
    expect(WIDGET_STYLES).toContain(".ft-mode-btn");
    expect(WIDGET_STYLES).toContain(".ft-mode-btn--active");
  });

  it("contains QR section styles", () => {
    expect(WIDGET_STYLES).toContain(".ft-qr-section");
    expect(WIDGET_STYLES).toContain(".ft-qr-container");
    expect(WIDGET_STYLES).toContain(".ft-qr-address");
  });

  it("contains spinner animation", () => {
    expect(WIDGET_STYLES).toContain("@keyframes ft-spin");
    expect(WIDGET_STYLES).toContain(".ft-spinner");
  });

  it("contains open/close transition on panel", () => {
    expect(WIDGET_STYLES).toContain("opacity: 0");
    expect(WIDGET_STYLES).toContain("transform: translateY(10px) scale(0.97)");
    expect(WIDGET_STYLES).toContain("pointer-events: none");
  });

  it("sets high z-index for widget elements", () => {
    expect(WIDGET_STYLES).toContain("z-index: 2147483647");
  });

  it("sets max z-index for panel", () => {
    expect(WIDGET_STYLES).toContain("z-index: 2147483646");
  });
});

describe("injectStyles", () => {
  it("injects a style element into the shadow root", () => {
    const styleElement = document.createElement("style");
    const appendChild = vi.fn();

    const shadowRoot = {
      appendChild,
    } as unknown as ShadowRoot;

    injectStyles(shadowRoot);

    expect(appendChild).toHaveBeenCalledTimes(1);
    const calledWith = appendChild.mock.calls[0][0] as HTMLStyleElement;
    expect(calledWith.tagName).toBe("STYLE");
    expect(calledWith.textContent).toBe(WIDGET_STYLES);
  });
});
