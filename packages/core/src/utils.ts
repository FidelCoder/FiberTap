const SHANNONS_PER_CKB = 100_000_000n;

// Format shannons to human-readable CKB amount
export function formatCKB(shannons: bigint): string {
  if (shannons < 0n) {
    return "-" + formatCKB(-shannons);
  }

  const ckb = shannons / SHANNONS_PER_CKB;
  const remainder = shannons % SHANNONS_PER_CKB;
  const decimals = Number(remainder) / Number(SHANNONS_PER_CKB);

  const formatted = decimals > 0
    ? `${ckb.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 8 })}${decimals.toString().slice(1)}`
    : ckb.toLocaleString("en-US");

  return formatted + " CKB";
}

// Validate a CKB address format
export function isValidCKBAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Mainnet: ckb1q...  Testnet: ckt1q...
  const ckbAddressRegex = /^(ckb1q|ckt1q)[a-z0-9]+$/;
  return ckbAddressRegex.test(address) && address.length >= 46;
}

// Generate a unique ID for payment requests
export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ft_${timestamp}_${random}`;
}

// Convert between CKB and shannons
export function ckbToShannons(ckb: number): bigint {
  return BigInt(Math.round(ckb * Number(SHANNONS_PER_CKB)));
}

export function shannonsToCKB(shannons: bigint): number {
  return Number(shannons) / Number(SHANNONS_PER_CKB);
}

// Check if a timestamp has expired
export function isExpired(timestamp: number): boolean {
  return Date.now() > timestamp;
}

// Format timestamp to readable string
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

// Truncate a transaction hash for display
export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2 + 3) {
    return hash;
  }
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// Format error message from unknown error type
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

// Default widget configuration
export const DEFAULT_WIDGET_CONFIG = {
  theme: "auto" as const,
  position: "bottom-right" as const,
  presetAmounts: [1, 5, 10],
  currency: "ckb" as const,
  customLabel: "Tip",
};

// Default payment expiry (10 minutes)
export const PAYMENT_EXPIRY_MS = 10 * 60 * 1000;
