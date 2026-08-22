import type { WidgetOptions } from "@fibertap/core";
import { DEFAULT_WIDGET_CONFIG } from "@fibertap/core";
import { qrCodeSvg, ckbTransferUri } from "./qr.js";

// Render the complete widget UI into shadow root
export function renderWidget(root: ShadowRoot, options: WidgetOptions): void {
  const isDark = options.theme === "dark" || (options.theme === "auto" && prefersDark());
  const isLeft = options.position === "bottom-left";
  const label = options.customLabel ?? DEFAULT_WIDGET_CONFIG.customLabel;

  // Create trigger button — icon-only floating action button
  const button = document.createElement("button");
  button.className = `ft-trigger${isLeft ? " ft-trigger--left" : ""}${isDark ? " ft-trigger--dark" : ""}`;
  button.setAttribute("aria-label", `Send a tip via FiberTap`);
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `
    <span class="ft-trigger-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </span>
  `;

  // Create payment panel
  const panel = createPaymentPanel(options, isDark, isLeft);

  // Toggle panel on button click
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !panel.classList.contains("ft-panel--open");
    panel.classList.toggle("ft-panel--open");
    button.setAttribute("aria-expanded", String(opening));

    // Auto-focus first input when opening
    if (opening) {
      setTimeout(() => {
        const firstInput = panel.querySelector(".ft-input") as HTMLInputElement | null;
        firstInput?.focus();
      }, 200);
    }
  });

  // Prevent mousedown on panel from closing it (stops event before it reaches document)
  panel.addEventListener("mousedown", (e) => e.stopPropagation());

  // Prevent clicks inside the panel from bubbling to document
  panel.addEventListener("click", (e) => e.stopPropagation());

  // Close panel when clicking outside — listen on shadow root, not document
  root.addEventListener("click", (e) => {
    // Ignore clicks that originated inside the panel or on the button
    const target = e.target as Node;
    if (panel.contains(target) || button.contains(target)) return;
    panel.classList.remove("ft-panel--open");
    button.setAttribute("aria-expanded", "false");
  });

  // Close on Escape — listen on document for keyboard events
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("ft-panel--open")) {
      panel.classList.remove("ft-panel--open");
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  });

  root.appendChild(button);
  root.appendChild(panel);
}

// Create the payment panel
function createPaymentPanel(
  options: WidgetOptions,
  isDark: boolean,
  isLeft: boolean
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = `ft-panel${isDark ? " ft-panel--dark" : ""}${isLeft ? " ft-panel--left" : ""}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Tip payment");

  // ── Header: mode toggle only ──
  const header = document.createElement("div");
  header.className = "ft-panel-header";

  const modeToggle = document.createElement("div");
  modeToggle.className = "ft-mode-toggle";

  const walletBtn = document.createElement("button");
  walletBtn.className = "ft-mode-btn ft-mode-btn--active";
  walletBtn.dataset.mode = "wallet";
  walletBtn.textContent = "Wallet";

  const qrBtn = document.createElement("button");
  qrBtn.className = "ft-mode-btn";
  qrBtn.dataset.mode = "qr";
  qrBtn.textContent = "QR";

  modeToggle.append(walletBtn, qrBtn);
  header.append(modeToggle);

  // ── Body ──
  const body = document.createElement("div");
  body.className = "ft-panel-body";

  // Preset buttons
  const presetContainer = document.createElement("div");
  presetContainer.className = "ft-presets";

  const amounts = options.presetAmounts ?? DEFAULT_WIDGET_CONFIG.presetAmounts;

  amounts.forEach((amount) => {
    const btn = document.createElement("button");
    btn.className = "ft-preset-btn";
    btn.textContent = `${amount}`;
    btn.dataset.amount = String(amount);
    btn.setAttribute("aria-label", `${amount} CKB`);

    btn.addEventListener("click", () => {
      presetContainer.querySelectorAll(".ft-preset-btn").forEach((b) => {
        b.classList.remove("ft-preset-btn--active");
      });
      btn.classList.add("ft-preset-btn--active");

      const customInput = panel.querySelector(".ft-custom-amount") as HTMLInputElement;
      if (customInput) customInput.value = String(amount);

      // Update QR if visible
      updateQRCode(panel, options);
    });

    presetContainer.appendChild(btn);
  });

  // Custom amount input
  const customInput = document.createElement("input");
  customInput.type = "number";
  customInput.className = "ft-input ft-custom-amount";
  customInput.placeholder = "Amount";
  customInput.min = "0.00000001";
  customInput.step = "any";

  customInput.addEventListener("input", () => {
    presetContainer.querySelectorAll(".ft-preset-btn").forEach((b) => {
      b.classList.remove("ft-preset-btn--active");
    });
    updateQRCode(panel, options);
  });

  // Message input
  const messageInput = document.createElement("input");
  messageInput.type = "text";
  messageInput.className = "ft-input ft-message";
  messageInput.placeholder = "Note";
  messageInput.maxLength = 200;
  messageInput.addEventListener("input", () => updateQRCode(panel, options));

  // Pay button (wallet mode)
  const payButton = document.createElement("button");
  payButton.className = "ft-pay-btn";
  payButton.textContent = "Send";

  // QR section (hidden by default)
  const qrSection = document.createElement("div");
  qrSection.className = "ft-qr-section";
  qrSection.style.display = "none";

  const qrContainer = document.createElement("div");
  qrContainer.className = "ft-qr-container";
  qrContainer.innerHTML = '<div class="ft-qr-placeholder">Pick an amount</div>';

  const qrAddress = document.createElement("div");
  qrAddress.className = "ft-qr-address";
  qrAddress.textContent = options.creator;

  const qrHint = document.createElement("div");
  qrHint.className = "ft-qr-hint";
  qrHint.textContent = "Scan with any CKB wallet";

  qrSection.append(qrContainer, qrAddress, qrHint);

  // Status indicator
  const status = document.createElement("div");
  status.className = "ft-status";

  body.append(presetContainer, customInput, messageInput, payButton, qrSection, status);
  panel.append(header, body);

  // ── Mode toggle logic ──
  const setMode = (mode: "wallet" | "qr") => {
    modeToggle.querySelectorAll(".ft-mode-btn").forEach((b) => {
      b.classList.toggle("ft-mode-btn--active", (b as HTMLElement).dataset.mode === mode);
    });

    if (mode === "wallet") {
      payButton.style.display = "";
      qrSection.style.display = "none";
    } else {
      payButton.style.display = "none";
      qrSection.style.display = "";
      updateQRCode(panel, options);
    }
  };

  walletBtn.addEventListener("click", () => setMode("wallet"));
  qrBtn.addEventListener("click", () => setMode("qr"));

  // Apply default mode if specified
  if (options.defaultMode === "qr") {
    setMode("qr");
  }

  // ── Pay button handler ──
  payButton.addEventListener("click", () => {
    const amount = parseFloat(customInput.value);
    if (!amount || amount <= 0) {
      showStatus(status, "error", "Enter an amount");
      return;
    }

    payButton.disabled = true;
    payButton.dataset.originalText = payButton.textContent ?? "";
    payButton.innerHTML = '<span class="ft-spinner"></span> Sending…';

    panel.dispatchEvent(
      new CustomEvent("fibertap:pay", {
        detail: {
          amount,
          message: messageInput.value,
          creator: options.creator,
        },
        bubbles: true,
      })
    );
  });

  return panel;
}

// Update the QR code display
function updateQRCode(panel: HTMLElement, options: WidgetOptions): void {
  const container = panel.querySelector(".ft-qr-container");
  if (!container) return;

  const amountInput = panel.querySelector(".ft-custom-amount") as HTMLInputElement;
  const messageInput = panel.querySelector(".ft-message") as HTMLInputElement;

  const amount = amountInput ? parseFloat(amountInput.value) : 0;
  const message = messageInput?.value ?? "";

  if (!amount || amount <= 0) {
    container.innerHTML = '<div class="ft-qr-placeholder">Pick an amount</div>';
    return;
  }

  const uri = ckbTransferUri(options.creator, amount, message);
  const svg = qrCodeSvg(uri, 200);
  container.innerHTML = svg;
}

// Show status message
export function showStatus(
  element: HTMLElement,
  type: "loading" | "success" | "error",
  message: string
): void {
  element.className = `ft-status ft-status--${type}`;
  element.textContent = message;

  // Reset the pay button if it was loading
  const panel = element.closest(".ft-panel");
  if (panel) {
    const payBtn = panel.querySelector(".ft-pay-btn") as HTMLButtonElement | null;
    if (payBtn && payBtn.disabled) {
      payBtn.disabled = false;
      payBtn.textContent = payBtn.dataset.originalText ?? "Send";
      delete payBtn.dataset.originalText;
    }
  }
}

// Hide status
export function hideStatus(element: HTMLElement): void {
  element.className = "ft-status";
  element.textContent = "";
}

function prefersDark(): boolean {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
