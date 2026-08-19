import { autoInit } from "./widget.js";

// Auto-initialize when script loads
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}

// Export for manual initialization
export { createWidget } from "./widget.js";
export type { WidgetOptions } from "@fibertap/core";
