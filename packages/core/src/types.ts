// Creator account
export type Creator = {
  id: string;
  ckbAddress: string;
  displayName: string;
  createdAt: number;
  widgetConfig: WidgetConfig;
};

// Widget appearance and behavior
export type WidgetConfig = {
  theme: "light" | "dark" | "auto";
  position: "bottom-right" | "bottom-left";
  presetAmounts: number[];
  currency: "ckb" | "usd";
  customLabel: string;
};

// A payment request initiated by the widget
export type PaymentRequest = {
  id: string;
  creatorId: string;
  amount: bigint;
  message: string;
  createdAt: number;
  expiresAt: number;
  // Set after user confirms payment, before on-chain verification
  txHash?: string;
  senderAddress?: string;
  status?: "pending" | "confirmed" | "failed";
};

// Result after payment is submitted
export type PaymentResult = {
  success: boolean;
  txHash?: string;
  error?: string;
  amount: bigint;
  recipientAddress: string;
};

// Widget initialization options from data attributes
export type WidgetOptions = {
  creator: string;
  apiEndpoint?: string;
  presetAmounts?: number[];
  customLabel?: string;
  theme?: "light" | "dark" | "auto";
  position?: "bottom-right" | "bottom-left";
  defaultMode?: "wallet" | "qr";
};

// Fiber Network client configuration
export type FiberConfig = {
  rpcUrl: string;
  indexerUrl: string;
  network: "mainnet" | "testnet";
};

// Pending payment waiting for wallet signature
export type PendingPayment = {
  tx: Record<string, unknown>;
  messageToSign: Uint8Array;
};

// Transaction confirmation status
export type TransactionStatus = "pending" | "confirmed" | "failed";

// Signed transaction from wallet
export type SignedTransaction = {
  tx: Record<string, unknown>;
  signature: Uint8Array;
};

// Fiber client interface
export type FiberClient = {
  getBalance(address: string): Promise<bigint>;
  createPayment(params: {
    sender: string;
    recipient: string;
    amount: bigint;
  }): Promise<PendingPayment>;
  broadcastPayment(signedTx: SignedTransaction): Promise<PaymentResult>;
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;
};

// Webhook event for payment notifications
export type PaymentEvent = {
  type: "payment.confirmed" | "payment.failed";
  paymentId: string;
  amount: string;
  senderAddress: string;
  txHash: string;
  confirmedAt: number;
  message: string;
};

// Webhook registration
export type Webhook = {
  id: string;
  creatorId: string;
  url: string;
  secret: string;
  createdAt: number;
};
