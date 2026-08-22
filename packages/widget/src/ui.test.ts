import { describe, it, expect, beforeEach } from "vitest";
import { renderWidget, showStatus, hideStatus } from "./ui.js";

// Mock ShadowRoot
function createMockShadowRoot(): { element: HTMLElement; shadow: ShadowRoot } {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  return { element: host, shadow };
}

describe("renderWidget", () => {
  let shadowRoot: ShadowRoot;

  beforeEach(() => {
    const mock = createMockShadowRoot();
    shadowRoot = mock.shadow;
  });

  it("creates an icon-only trigger button", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const button = shadowRoot.querySelector(".ft-trigger") as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute("aria-label")).toBe("Send a tip via FiberTap");
    expect(button.querySelector(".ft-trigger-icon svg")).not.toBeNull();
  });

  it("creates a payment panel with mode toggle", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const panel = shadowRoot.querySelector(".ft-panel") as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.classList.contains("ft-panel--open")).toBe(false);
    expect(panel.getAttribute("role")).toBe("dialog");

    // Mode toggle
    const toggle = shadowRoot.querySelector(".ft-mode-toggle") as HTMLElement;
    expect(toggle).not.toBeNull();
    const walletBtn = shadowRoot.querySelector(".ft-mode-btn[data-mode='wallet']") as HTMLElement;
    const qrBtn = shadowRoot.querySelector(".ft-mode-btn[data-mode='qr']") as HTMLElement;
    expect(walletBtn).not.toBeNull();
    expect(qrBtn).not.toBeNull();
    expect(walletBtn.classList.contains("ft-mode-btn--active")).toBe(true);
    expect(qrBtn.classList.contains("ft-mode-btn--active")).toBe(false);
  });

  it("creates preset amount buttons", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const presets = shadowRoot.querySelectorAll(".ft-preset-btn");
    expect(presets.length).toBe(3);
    expect(presets[0].textContent).toBe("1");
    expect(presets[1].textContent).toBe("5");
    expect(presets[2].textContent).toBe("10");
  });

  it("creates custom amount input with minimal placeholder", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const input = shadowRoot.querySelector(".ft-custom-amount") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe("number");
    expect(input.placeholder).toBe("Amount");
  });

  it("creates message input with minimal placeholder", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const input = shadowRoot.querySelector(".ft-message") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe("text");
    expect(input.placeholder).toBe("Note");
  });

  it("creates pay button with short label", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const btn = shadowRoot.querySelector(".ft-pay-btn") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Send");
  });

  it("creates QR section hidden by default", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const qrSection = shadowRoot.querySelector(".ft-qr-section") as HTMLElement;
    expect(qrSection).not.toBeNull();
    expect(qrSection.style.display).toBe("none");

    const qrContainer = shadowRoot.querySelector(".ft-qr-container") as HTMLElement;
    expect(qrContainer).not.toBeNull();
    expect(qrContainer.textContent).toContain("Pick an amount");

    const qrAddress = shadowRoot.querySelector(".ft-qr-address") as HTMLElement;
    expect(qrAddress).not.toBeNull();
    expect(qrAddress.textContent).toBe("ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c");
  });

  it("creates status indicator", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const status = shadowRoot.querySelector(".ft-status") as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.classList.contains("ft-status--loading")).toBe(false);
    expect(status.classList.contains("ft-status--success")).toBe(false);
    expect(status.classList.contains("ft-status--error")).toBe(false);
  });

  it("applies dark theme when theme is dark", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      theme: "dark",
    });

    const panel = shadowRoot.querySelector(".ft-panel") as HTMLElement;
    expect(panel.classList.contains("ft-panel--dark")).toBe(true);

    const button = shadowRoot.querySelector(".ft-trigger") as HTMLElement;
    expect(button.classList.contains("ft-trigger--dark")).toBe(true);
  });

  it("applies left position when position is bottom-left", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      position: "bottom-left",
    });

    const button = shadowRoot.querySelector(".ft-trigger") as HTMLElement;
    expect(button.classList.contains("ft-trigger--left")).toBe(true);

    const panel = shadowRoot.querySelector(".ft-panel") as HTMLElement;
    expect(panel.classList.contains("ft-panel--left")).toBe(true);
  });

  it("uses custom preset amounts when provided", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      presetAmounts: [2, 10, 50],
    });

    const presets = shadowRoot.querySelectorAll(".ft-preset-btn");
    expect(presets.length).toBe(3);
    expect(presets[0].textContent).toBe("2");
    expect(presets[1].textContent).toBe("10");
    expect(presets[2].textContent).toBe("50");
  });

  it("defaults to QR mode when defaultMode is qr", () => {
    renderWidget(shadowRoot, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
      defaultMode: "qr",
    });

    const qrBtn = shadowRoot.querySelector(".ft-mode-btn[data-mode='qr']") as HTMLElement;
    expect(qrBtn.classList.contains("ft-mode-btn--active")).toBe(true);

    const payBtn = shadowRoot.querySelector(".ft-pay-btn") as HTMLButtonElement;
    expect(payBtn.style.display).toBe("none");

    const qrSection = shadowRoot.querySelector(".ft-qr-section") as HTMLElement;
    expect(qrSection.style.display).not.toBe("none");
  });
});

describe("showStatus", () => {
  it("shows loading status and resets pay button", () => {
    const { shadow } = createMockShadowRoot();
    renderWidget(shadow, {
      creator: "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    });

    const element = shadow.querySelector(".ft-status") as HTMLElement;
    const payBtn = shadow.querySelector(".ft-pay-btn") as HTMLButtonElement;

    payBtn.disabled = true;
    payBtn.dataset.originalText = "Send";
    payBtn.innerHTML = '<span class="ft-spinner"></span> Sending…';

    showStatus(element, "loading", "Preparing…");

    expect(element.textContent).toBe("Preparing…");
    expect(element.classList.contains("ft-status--loading")).toBe(true);
    expect(payBtn.disabled).toBe(false);
    expect(payBtn.textContent).toBe("Send");
  });

  it("shows success status", () => {
    const element = document.createElement("div");

    showStatus(element, "success", "Sent!");

    expect(element.textContent).toBe("Sent!");
    expect(element.classList.contains("ft-status--success")).toBe(true);
  });

  it("shows error status", () => {
    const element = document.createElement("div");

    showStatus(element, "error", "Failed!");

    expect(element.textContent).toBe("Failed!");
    expect(element.classList.contains("ft-status--error")).toBe(true);
  });
});

describe("hideStatus", () => {
  it("hides the status element", () => {
    const element = document.createElement("div");
    element.className = "ft-status ft-status--loading";

    hideStatus(element);

    expect(element.classList.contains("ft-status--loading")).toBe(false);
    expect(element.classList.contains("ft-status--success")).toBe(false);
    expect(element.textContent).toBe("");
  });
});
