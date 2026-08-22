import type { WidgetOptions } from "@fibertap/core";
import { truncateHash, formatError, ckbToShannons } from "@fibertap/core";
import { showStatus } from "./ui.js";

// CKB wallet provider interface (JoyID, RetroWallet, etc.)
interface CKBWalletProvider {
  request: (params: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ckb?: CKBWalletProvider;
    kickwallet?: CKBWalletProvider;
    indoors?: CKBWalletProvider;
    ethereum?: CKBWalletProvider;
  }
}

// Detect available CKB wallet
function detectWallet(): CKBWalletProvider | null {
  // Priority order: JoyID -> kickwallet -> indoors -> ethereum (for CCC compatibility)
  if (typeof window !== "undefined") {
    if (window.ckb) return window.ckb;
    if (window.kickwallet) return window.kickwallet;
    if (window.indoors) return window.indoors;
    // Ethereum as fallback for CCC-compatible wallets
    if (window.ethereum) return window.ethereum;
  }
  return null;
}

// Connect to CKB wallet and get sender address
async function connectWallet(): Promise<string> {
  const wallet = detectWallet();
  if (!wallet) {
    throw new Error(
      "No CKB wallet found. Install JoyID or a compatible wallet."
    );
  }

  try {
    // Try JoyID/kickwallet style first
    const accounts = await wallet.request({ method: "eth_accounts" });
    if (Array.isArray(accounts) && accounts.length > 0) {
      return accounts[0] as string;
    }

    // Try requesting accounts if none returned
    const requested = await wallet.request({ method: "eth_requestAccounts" });
    if (Array.isArray(requested) && requested.length > 0) {
      return requested[0] as string;
    }
  } catch (err) {
    throw new Error(
      `Wallet connection failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  throw new Error("Wallet returned no accounts.");
}

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
  showStatus(statusEl, "loading", "Connecting…");

  try {
    // 1. Request wallet connection
    const senderAddress = await connectWallet();
    showStatus(statusEl, "loading", "Confirm in wallet…");

    // 2. Create payment request via API
    const paymentId = await createPaymentRequest(options, amount, message, senderAddress);

    // 3. Request wallet signature and broadcast
    const txHash = await requestWalletSignature(senderAddress, options.creator, amount);

    // 4. Confirm payment with API
    showStatus(statusEl, "loading", "Verifying…");
    await confirmPayment(options, paymentId, txHash, senderAddress);

    // 5. Show success
    showStatus(statusEl, "success", `Sent · ${truncateHash(txHash)}`);
  } catch (error) {
    const errorMessage = formatError(error);
    showStatus(statusEl, "error", errorMessage);
  } finally {
    payBtn.disabled = false;
  }
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
      amount: ckbToShannons(amount).toString(),
      message,
      senderAddress,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `Payment request failed (${response.status})`
    );
  }

  const data = (await response.json()) as { paymentId: string };
  return data.paymentId;
}

// Request wallet signature for the CKB transaction
async function requestWalletSignature(
  sender: string,
  recipient: string,
  amount: number
): Promise<string> {
  const wallet = detectWallet();
  if (!wallet) {
    throw new Error("No wallet available to sign transaction");
  }

  // Build the CKB transaction payload
  // This uses a simplified format that CKB wallets understand
  const txPayload = {
    from: sender,
    to: recipient,
    amount: ckbToShannons(amount).toString(),
    network: recipient.startsWith("ckt") ? "testnet" : "mainnet",
  };

  try {
    // Try sending transaction via wallet
    // JoyID and CCC-compatible wallets support eth_sendTransaction
    // with a CKB-specific payload format
    const result = await wallet.request({
      method: "eth_sendTransaction",
      params: [txPayload],
    });

    if (typeof result === "string") {
      return result;
    }

    // Some wallets return an object with txHash
    if (typeof result === "object" && result !== null && "txHash" in result) {
      return (result as { txHash: string }).txHash;
    }

    throw new Error("Wallet returned unexpected response");
  } catch (err) {
    // Re-throw user rejection errors as-is
    if (err instanceof Error) {
      if (err.message.includes("reject") || err.message.includes("denied")) {
        throw new Error("Transaction rejected");
      }
      throw err;
    }
    throw new Error("Failed to sign transaction");
  }
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
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `Payment confirmation failed (${response.status})`
    );
  }
}
