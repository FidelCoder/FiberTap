import type { WidgetOptions } from "@fibertap/core";
import { truncateHash, formatError } from "@fibertap/core";
import { showStatus } from "./ui.js";

// Handle the payment flow
export async function handlePayment(
  options: WidgetOptions,
  amount: number,
  message: string,
  statusEl: HTMLElement,
  payBtn: HTMLButtonElement
): Promise<void> {
  // Disable button, show loading
  payBtn.disabled = true;
  showStatus(statusEl, "loading", "Preparing payment...");

  try {
    // Request wallet connection
    const senderAddress = await connectWallet();
    showStatus(statusEl, "loading", "Confirm in your wallet...");

    // Create payment request via API
    const paymentId = await createPaymentRequest(options, amount, message, senderAddress);

    // Request wallet signature
    const txHash = await requestWalletSignature(senderAddress, options.creator, amount);

    // Confirm payment with API
    showStatus(statusEl, "loading", "Broadcasting...");
    await confirmPayment(options, paymentId, txHash, senderAddress);

    // Show success
    showStatus(statusEl, "success", `Sent! Tx: ${truncateHash(txHash)}`);
  } catch (error) {
    showStatus(statusEl, "error", formatError(error));
  } finally {
    payBtn.disabled = false;
  }
}

// Connect to CKB wallet
async function connectWallet(): Promise<string> {
  // Check for JoyID or CCC-compatible wallet
  if (typeof window !== "undefined" && "ckb" in window) {
    const ckb = (window as Record<string, unknown>).ckb as {
      request: (params: { method: string }) => Promise<string[]>;
    };
    const accounts = await ckb.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
  }

  // Check for injected wallet (Ethereum-style)
  if (typeof window !== "undefined" && "ethereum" in window) {
    const ethereum = (window as Record<string, unknown>).ethereum as {
      request: (params: { method: string }) => Promise<string[]>;
    };
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
  }

  throw new Error("No CKB wallet found. Please install JoyID or a compatible wallet.");
}

// Create payment request via API
async function createPaymentRequest(
  options: WidgetOptions,
  amount: number,
  message: string,
  senderAddress: string
): Promise<string> {
  const apiEndpoint = options.apiEndpoint ?? "https://api.fibertap.dev";

  const response = await fetch(`${apiEndpoint}/api/payments/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creatorAddress: options.creator,
      amount: Math.round(amount * 100_000_000).toString(), // Convert to shannons
      message,
      senderAddress,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment request");
  }

  const data = (await response.json()) as { paymentId: string };
  return data.paymentId;
}

// Request wallet signature for the transaction
async function requestWalletSignature(
  sender: string,
  recipient: string,
  amount: number
): Promise<string> {
  // Build the transaction payload
  const txPayload = {
    from: sender,
    to: recipient,
    amount: Math.round(amount * 100_000_000).toString(),
  };

  // Request signature from wallet
  if (typeof window !== "undefined" && "ckb" in window) {
    const ckb = (window as Record<string, unknown>).ckb as {
      request: (params: { method: string; params: unknown[] }) => Promise<string>;
    };
    const txHash = await ckb.request({
      method: "eth_sendTransaction",
      params: [txPayload],
    });
    return txHash;
  }

  if (typeof window !== "undefined" && "ethereum" in window) {
    const ethereum = (window as Record<string, unknown>).ethereum as {
      request: (params: { method: string; params: unknown[] }) => Promise<string>;
    };
    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [txPayload],
    });
    return txHash;
  }

  throw new Error("No wallet available to sign transaction");
}

// Confirm payment with API after broadcast
async function confirmPayment(
  options: WidgetOptions,
  paymentId: string,
  txHash: string,
  senderAddress: string
): Promise<void> {
  const apiEndpoint = options.apiEndpoint ?? "https://api.fibertap.dev";

  const response = await fetch(`${apiEndpoint}/api/payments/${paymentId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, senderAddress }),
  });

  if (!response.ok) {
    throw new Error("Failed to confirm payment");
  }
}
