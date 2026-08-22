// Widget styles injected into Shadow DOM
export const WIDGET_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* ─── Trigger Button ─── */
  .ft-trigger {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    cursor: pointer;
    box-shadow:
      0 4px 14px rgba(99,102,241,0.35),
      0 1px 3px rgba(0,0,0,0.08);
    z-index: 2147483647;
    transition: transform 0.2s cubic-bezier(.4,0,.2,1),
                box-shadow 0.2s cubic-bezier(.4,0,.2,1);
    -webkit-user-select: none;
    user-select: none;
    outline: none;
  }

  .ft-trigger:hover {
    transform: translateY(-2px) scale(1.06);
    box-shadow:
      0 8px 24px rgba(99,102,241,0.4),
      0 2px 6px rgba(0,0,0,0.1);
  }

  .ft-trigger:active {
    transform: translateY(0) scale(0.96);
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  .ft-trigger:focus-visible {
    outline: 2px solid #818cf8;
    outline-offset: 3px;
  }

  .ft-trigger-icon {
    display: flex;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  .ft-trigger--left {
    right: auto;
    left: 24px;
  }

  /* ─── Panel ─── */
  .ft-panel {
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 300px;
    border-radius: 16px;
    background: white;
    box-shadow:
      0 16px 48px rgba(0,0,0,0.10),
      0 2px 8px rgba(0,0,0,0.04);
    display: block;
    z-index: 2147483646;
    color: #1a1a2e;
    overflow: hidden;
    opacity: 0;
    transform: translateY(10px) scale(0.97);
    pointer-events: none;
    transition: opacity 0.18s cubic-bezier(.4,0,.2,1),
                transform 0.18s cubic-bezier(.4,0,.2,1);
  }

  .ft-panel--open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .ft-panel--left {
    right: auto;
    left: 24px;
  }

  /* ─── Panel Header ─── */
  .ft-panel-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 16px 0;
  }

  /* ─── Mode Toggle (Wallet / QR) ─── */
  .ft-mode-toggle {
    display: flex;
    background: #f1f2f6;
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }

  .ft-mode-btn {
    padding: 5px 14px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #8e8ea0;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: 0.01em;
  }

  .ft-mode-btn:hover {
    color: #6b6b80;
  }

  .ft-mode-btn--active {
    background: white;
    color: #1a1a2e;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  /* ─── Panel Body ─── */
  .ft-panel-body {
    padding: 16px 16px 14px;
  }

  /* ─── Preset Buttons ─── */
  .ft-presets {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .ft-preset-btn {
    flex: 1;
    padding: 9px 0;
    border: 1.5px solid #ebedf0;
    border-radius: 10px;
    background: white;
    color: #4a4a5a;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.12s ease;
    text-align: center;
  }

  .ft-preset-btn:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #f8f7ff;
  }

  .ft-preset-btn--active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
    box-shadow: 0 2px 8px rgba(99,102,241,0.2);
  }

  /* ─── Inputs ─── */
  .ft-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #ebedf0;
    border-radius: 10px;
    font-size: 13px;
    font-family: inherit;
    color: #1a1a2e;
    background: #fafbfc;
    margin-bottom: 8px;
    outline: none;
    transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
  }

  .ft-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
    background: white;
  }

  .ft-input::placeholder {
    color: #c0c0cc;
    font-weight: 400;
  }

  /* ─── Pay Button ─── */
  .ft-pay-btn {
    width: 100%;
    padding: 11px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.12s ease;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.02em;
  }

  .ft-pay-btn:hover {
    background: linear-gradient(135deg, #7c7ff7, #5b53e8);
    box-shadow: 0 4px 12px rgba(99,102,241,0.25);
    transform: translateY(-1px);
  }

  .ft-pay-btn:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .ft-pay-btn:disabled {
    background: #c7d2fe;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* ─── QR Section ─── */
  .ft-qr-section {
    text-align: center;
    padding: 6px 0 2px;
  }

  .ft-qr-container {
    display: inline-block;
    padding: 10px;
    background: white;
    border: 1px solid #ebedf0;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .ft-qr-container svg {
    display: block;
    width: 160px;
    height: 160px;
  }

  .ft-qr-placeholder {
    width: 160px;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #b0b0c0;
    font-size: 12px;
    text-align: center;
    padding: 16px;
  }

  .ft-qr-address {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 10px;
    color: #b0b0c0;
    word-break: break-all;
    padding: 0 4px;
    line-height: 1.4;
  }

  .ft-qr-hint {
    font-size: 11px;
    color: #c0c0cc;
    margin-top: 6px;
  }

  /* ─── Status ─── */
  .ft-status {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    display: none;
  }

  .ft-status--loading {
    display: block;
    background: #eef2ff;
    color: #4f46e5;
  }

  .ft-status--success {
    display: block;
    background: #ecfdf5;
    color: #059669;
  }

  .ft-status--error {
    display: block;
    background: #fef2f2;
    color: #dc2626;
  }

  /* ═══════════════════════════════════════════
     Dark Theme
     ═══════════════════════════════════════════ */
  .ft-panel--dark {
    background: #18181f;
    box-shadow:
      0 16px 48px rgba(0,0,0,0.4),
      0 2px 8px rgba(0,0,0,0.2);
    color: #e8e8f0;
  }

  .ft-panel--dark .ft-mode-toggle {
    background: #222230;
  }

  .ft-panel--dark .ft-mode-btn {
    color: #6b6b80;
  }

  .ft-panel--dark .ft-mode-btn:hover {
    color: #a0a0b0;
  }

  .ft-panel--dark .ft-mode-btn--active {
    background: #2a2a38;
    color: #f0f0ff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .ft-panel--dark .ft-qr-container {
    background: #14141c;
    border-color: #2a2a38;
  }

  .ft-panel--dark .ft-qr-address {
    color: #6b6b80;
  }

  .ft-panel--dark .ft-qr-hint {
    color: #4a4a60;
  }

  .ft-panel--dark .ft-preset-btn {
    border-color: #2a2a38;
    background: #20202c;
    color: #c0c0d0;
  }

  .ft-panel--dark .ft-preset-btn:hover {
    border-color: #818cf8;
    color: #818cf8;
    background: #26263a;
  }

  .ft-panel--dark .ft-preset-btn--active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  .ft-panel--dark .ft-input {
    border-color: #2a2a38;
    background: #14141c;
    color: #e8e8f0;
  }

  .ft-panel--dark .ft-input:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,0.12);
    background: #1c1c28;
  }

  .ft-panel--dark .ft-input::placeholder {
    color: #4a4a60;
  }

  .ft-panel--dark .ft-status--loading {
    background: #1c1c30;
    color: #93c5fd;
  }

  .ft-panel--dark .ft-status--success {
    background: #0d2818;
    color: #86efac;
  }

  .ft-panel--dark .ft-status--error {
    background: #2a0a0a;
    color: #fca5a5;
  }

  /* ─── Dark Trigger ─── */
  .ft-trigger--dark {
    background: linear-gradient(135deg, #4338ca, #3730a3);
    box-shadow:
      0 4px 14px rgba(67,56,202,0.4),
      0 1px 3px rgba(0,0,0,0.2);
  }

  .ft-trigger--dark:hover {
    box-shadow:
      0 8px 24px rgba(67,56,202,0.45),
      0 2px 6px rgba(0,0,0,0.2);
  }

  /* ─── Spinner ─── */
  @keyframes ft-spin {
    to { transform: rotate(360deg); }
  }
  .ft-spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: ft-spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
`;

// Inject styles into shadow root
export function injectStyles(root: ShadowRoot): void {
  const style = document.createElement("style");
  style.textContent = WIDGET_STYLES;
  root.appendChild(style);
}
