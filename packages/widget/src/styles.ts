// Widget styles injected into Shadow DOM
export const WIDGET_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .ft-trigger {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 24px;
    border-radius: 9999px;
    border: none;
    background: #2563eb;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483647;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    white-space: nowrap;
  }

  .ft-trigger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  }

  .ft-trigger:active {
    transform: translateY(0);
  }

  .ft-trigger--left {
    right: auto;
    left: 24px;
  }

  .ft-panel {
    position: fixed;
    bottom: 80px;
    right: 24px;
    width: 320px;
    padding: 20px;
    border-radius: 12px;
    background: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    display: none;
    z-index: 2147483646;
    color: #1a1a1a;
  }

  .ft-panel--open {
    display: block;
  }

  .ft-panel--left {
    right: auto;
    left: 24px;
  }

  .ft-panel-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #1a1a1a;
  }

  .ft-presets {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .ft-preset-btn {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .ft-preset-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .ft-preset-btn--active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .ft-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    color: #1a1a1a;
    background: white;
    margin-bottom: 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .ft-input:focus {
    border-color: #2563eb;
  }

  .ft-input::placeholder {
    color: #9ca3af;
  }

  .ft-pay-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .ft-pay-btn:hover {
    background: #1d4ed8;
  }

  .ft-pay-btn:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }

  .ft-status {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
  }

  .ft-status--loading {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .ft-status--success {
    background: #f0fdf4;
    color: #16a34a;
  }

  .ft-status--error {
    background: #fef2f2;
    color: #dc2626;
  }

  .ft-footer {
    margin-top: 12px;
    text-align: center;
    font-size: 11px;
    color: #9ca3af;
  }

  .ft-footer a {
    color: #6b7280;
    text-decoration: none;
  }

  .ft-footer a:hover {
    color: #374151;
  }

  /* Dark theme */
  .ft-panel--dark {
    background: #1a1a1a;
    color: #f3f4f6;
  }

  .ft-panel--dark .ft-panel-title {
    color: #f3f4f6;
  }

  .ft-panel--dark .ft-preset-btn {
    border-color: #374151;
    background: #1a1a1a;
    color: #d1d5db;
  }

  .ft-panel--dark .ft-preset-btn:hover {
    border-color: #60a5fa;
    color: #60a5fa;
  }

  .ft-panel--dark .ft-preset-btn--active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .ft-panel--dark .ft-input {
    border-color: #374151;
    background: #111827;
    color: #f3f4f6;
  }

  .ft-panel--dark .ft-input:focus {
    border-color: #60a5fa;
  }
`;

// Inject styles into shadow root
export function injectStyles(root: ShadowRoot): void {
  const style = document.createElement("style");
  style.textContent = WIDGET_STYLES;
  root.appendChild(style);
}
