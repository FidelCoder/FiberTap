import type { WidgetOptions } from "@fibertap/core";

// Default preset amounts in CKB
const PRESET_AMOUNTS = [1, 5, 10];

// Render the complete widget UI into shadow root
export function renderWidget(root: ShadowRoot, options: WidgetOptions): void {
  const isDark = options.theme === "dark" || (options.theme === "auto" && prefersDark());
  const isLeft = options.position === "bottom-left";

  // Create trigger button
  const button = document.createElement("button");
  button.className = `ft-trigger${isLeft ? " ft-trigger--left" : ""}`;
  button.textContent = "Tip";
  button.setAttribute("aria-label", "Send a tip via FiberTap");

  // Create payment panel
  const panel = createPaymentPanel(options, isDark, isLeft);

  // Toggle panel on button click
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("ft-panel--open");
  });

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target as Node) && !button.contains(e.target as Node)) {
      panel.classList.remove("ft-panel--open");
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

  // Title
  const title = document.createElement("div");
  title.className = "ft-panel-title";
  title.textContent = "Send a tip";

  // Preset buttons
  const presetContainer = document.createElement("div");
  presetContainer.className = "ft-presets";

  PRESET_AMOUNTS.forEach((amount) => {
    const btn = document.createElement("button");
    btn.className = "ft-preset-btn";
    btn.textContent = `${amount} CKB`;
    btn.dataset.amount = String(amount);

    btn.addEventListener("click", () => {
      // Remove active from all presets
      presetContainer.querySelectorAll(".ft-preset-btn").forEach((b) => {
        b.classList.remove("ft-preset-btn--active");
      });
      btn.classList.add("ft-preset-btn--active");

      // Update custom input
      const customInput = panel.querySelector(".ft-custom-amount") as HTMLInputElement;
      if (customInput) {
        customInput.value = String(amount);
      }
    });

    presetContainer.appendChild(btn);
  });

  // Custom amount input
  const customInput = document.createElement("input");
  customInput.type = "number";
  customInput.className = "ft-input ft-custom-amount";
  customInput.placeholder = "Custom amount (CKB)";
  customInput.min = "0.00000001";
  customInput.step = "any";

  customInput.addEventListener("input", () => {
    // Remove active from presets when typing custom amount
    presetContainer.querySelectorAll(".ft-preset-btn").forEach((b) => {
      b.classList.remove("ft-preset-btn--active");
    });
  });

  // Message input
  const messageInput = document.createElement("input");
  messageInput.type = "text";
  messageInput.className = "ft-input ft-message";
  messageInput.placeholder = "Message (optional)";
  messageInput.maxLength = 200;

  // Pay button
  const payButton = document.createElement("button");
  payButton.className = "ft-pay-btn";
  payButton.textContent = "Pay with Fiber";

  // Status indicator
  const status = document.createElement("div");
  status.className = "ft-status";
  status.style.display = "none";

  // Footer
  const footer = document.createElement("div");
  footer.className = "ft-footer";
  footer.innerHTML = 'Powered by <a href="https://fibertap.dev" target="_blank">FiberTap</a>';

  panel.append(title, presetContainer, customInput, messageInput, payButton, status, footer);

  // Attach payment handler
  payButton.addEventListener("click", () => {
    const amount = parseFloat(customInput.value);
    if (!amount || amount <= 0) {
      showStatus(status, "error", "Please enter an amount");
      return;
    }

    // Dispatch custom event with payment details
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

// Show status message
export function showStatus(
  element: HTMLElement,
  type: "loading" | "success" | "error",
  message: string
): void {
  element.style.display = "block";
  element.className = `ft-status ft-status--${type}`;
  element.textContent = message;
}

// Hide status
export function hideStatus(element: HTMLElement): void {
  element.style.display = "none";
}

// Check if user prefers dark mode
function prefersDark(): boolean {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
