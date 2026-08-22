import type { WidgetOptions } from "@fibertap/core";
import { DEFAULT_WIDGET_CONFIG } from "@fibertap/core";

// Parse data-* attributes from the script tag
export function parseScriptAttributes(script: HTMLScriptElement): WidgetOptions {
  // Parse preset amounts from comma-separated string (e.g., "1,5,10,25")
  const presetRaw = script.getAttribute("data-preset");
  let presetAmounts: number[] | undefined;
  if (presetRaw) {
    const parsed = presetRaw
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (parsed.length > 0) {
      presetAmounts = parsed;
    }
  }

  return {
    creator: script.getAttribute("data-creator") ?? "",
    theme: (script.getAttribute("data-theme") as WidgetOptions["theme"]) ?? DEFAULT_WIDGET_CONFIG.theme,
    position: (script.getAttribute("data-position") as WidgetOptions["position"]) ?? DEFAULT_WIDGET_CONFIG.position,
    presetAmounts,
    customLabel: script.getAttribute("data-label") ?? undefined,
    apiEndpoint: script.getAttribute("data-api") ?? "https://api.fibertap.dev",
    defaultMode: (script.getAttribute("data-mode") as WidgetOptions["defaultMode"]) ?? undefined,
  };
}

// Validate widget options
export function validateOptions(options: WidgetOptions): boolean {
  if (!options.creator || options.creator.length === 0) {
    console.warn("[FiberTap] data-creator attribute is required");
    return false;
  }

  // Basic CKB address validation
  if (!/^(ckb1q|ckt1q)[a-z0-9]+$/i.test(options.creator) || options.creator.length < 46) {
    console.warn("[FiberTap] Invalid CKB address format");
    return false;
  }

  return true;
}

// Get the script tag element for FiberTap
export function findScriptTag(): HTMLScriptElement | null {
  return document.querySelector("script[data-creator]");
}
