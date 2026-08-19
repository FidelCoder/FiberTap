import type { WidgetOptions } from "@fibertap/core";
import { parseScriptAttributes, validateOptions, findScriptTag } from "./config.js";
import { injectStyles } from "./styles.js";
import { renderWidget, showStatus } from "./ui.js";
import { handlePayment } from "./payment.js";

// Initialize the FiberTap widget
export function createWidget(options: WidgetOptions): void {
  // Validate options
  if (!validateOptions(options)) {
    return;
  }

  // Create host element
  const host = document.createElement("div");
  host.id = "fibertap-host";

  // Attach shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles
  injectStyles(shadow);

  // Render widget UI
  renderWidget(shadow, options);

  // Listen for payment events from the panel
  shadow.addEventListener("fibertap:pay", ((e: CustomEvent) => {
    const { amount, message } = e.detail;
    const statusEl = shadow.querySelector(".ft-status") as HTMLElement;
    const payBtn = shadow.querySelector(".ft-pay-btn") as HTMLButtonElement;

    if (statusEl && payBtn) {
      handlePayment(options, amount, message, statusEl, payBtn);
    }
  }) as EventListener);

  // Append to document body
  document.body.appendChild(host);
}

// Auto-initialize when script loads
export function autoInit(): void {
  const scriptTag = findScriptTag();
  if (!scriptTag) {
    return;
  }

  const options = parseScriptAttributes(scriptTag);
  createWidget(options);
}
