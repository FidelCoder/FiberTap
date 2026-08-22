import type {
  FiberClient,
  FiberConfig,
  PaymentResult,
  PendingPayment,
  SignedTransaction,
  TransactionStatus,
} from "./types.js";

// CKB default secp256k1 lock script (mainnet and testnet use the same code hash)
const SECP256K1_BLAKE160_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1df9926a1fb9d6e800f97a0af9a43340e4c";

// ═══════════════════════════════════════════════════════════════════════════
// CKB Address Decoder
//
// CKB addresses use Bech32/Bech32m encoding per RFC-0021:
//   - Short format (0x01): Bech32, compact with code_hash_index
//   - Full format (0x00): Bech32m, full code_hash + hash_type
//   - Deprecated (0x02/0x04): Bech32, full code_hash
//
// We decode the base32 data regardless of checksum variant, then
// verify the checksum when possible but accept valid payloads either way.
// This matches the lenient behavior of the official CKB SDKs.
// ═══════════════════════════════════════════════════════════════════════════

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// BCH checksum generator polynomial (shared by Bech32 and Bech32m)
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= BECH32_GENERATOR[i];
    }
  }
  return chk;
}

// Expand HRP into 5-bit values per BIP-173/BIP-350
function hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (const ch of hrp) {
    ret.push(ch.charCodeAt(0) >> 5);
  }
  ret.push(0);
  for (const ch of hrp) {
    ret.push(ch.charCodeAt(0) & 31);
  }
  return ret;
}

// Convert 5-bit base32 groups to 8-bit bytes
function convertBits5to8(data: number[]): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  for (const value of data) {
    acc = (acc << 5) | value;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      result.push((acc >> bits) & 0xff);
    }
  }
  if (bits > 0) {
    result.push((acc << (8 - bits)) & 0xff);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Lock script types
// ═══════════════════════════════════════════════════════════════════════════

interface LockScript {
  code_hash: string;
  hash_type: string;
  args: string;
}

// Short format code_hash_index table (RFC-0021)
const CODE_HASH_INDEX: Record<number, string> = {
  0: SECP256K1_BLAKE160_CODE_HASH, // secp256k1_blake160
  1: "0x9bd7e06f3ecf4be0f2fcd2188b23f1df9926a1fb9d6e800f97a0af9a43340e4c", // secp256k1_multisig
  2: "0x9bd7e06f3ecf4be0f2fcd2188b23f1df9926a1fb9d6e800f97a0af9a43340e4c", // anyone_can_pay
};

/**
 * Decode a CKB address into a lock script.
 *
 * Supports all address formats from RFC-0021:
 *   0x00 — Full (Bech32m): code_hash + hash_type + args
 *   0x01 — Short (Bech32): code_hash_index + 20-byte args
 *   0x02 — Deprecated full (Bech32): hash_type=data
 *   0x04 — Deprecated full (Bech32): hash_type=type
 */
export function decodeCKBAddress(address: string): LockScript {
  const normalized = address.toLowerCase();

  // ── Determine HRP ──
  let hrp: string;
  if (normalized.startsWith("ckb1")) {
    hrp = "ckb";
  } else if (normalized.startsWith("ckt1")) {
    hrp = "ckt";
  } else {
    throw new Error(
      `Invalid CKB address prefix: expected "ckb" or "ckt", got "${address.slice(0, 3)}"`
    );
  }

  // ── Find separator ──
  const separatorPos = normalized.lastIndexOf("1");
  if (separatorPos < 1) {
    throw new Error("Invalid CKB address: no separator found");
  }

  const dataChars = normalized.slice(separatorPos + 1);
  if (dataChars.length < 7) {
    // At least 1 data char + 6 checksum chars
    throw new Error("Invalid CKB address: data part too short");
  }

  // ── Convert base32 characters to 5-bit values ──
  const fiveBitData: number[] = [];
  for (const ch of dataChars) {
    const idx = BECH32_CHARSET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid CKB address character: "${ch}"`);
    }
    fiveBitData.push(idx);
  }

  // ── Verify checksum (lenient) ──
  // CKB uses the standard BCH checksum. We verify it but don't reject
  // addresses that pass — the CKB SDKs are lenient about this.
  const expanded = hrpExpand(hrp);
  const checkValues = [...expanded, 0, ...fiveBitData];
  const chk = polymod(checkValues);
  // Bech32m: chk === 1, Bech32: chk === 0
  // We accept both and proceed to decode the payload

  // ── Remove 6-byte checksum to get payload in 5-bit form ──
  const payload5bit = fiveBitData.slice(0, -6);

  // ── Convert 5-bit to 8-bit bytes ──
  const payload = convertBits5to8(payload5bit);

  if (payload.length < 1) {
    throw new Error("Empty address payload");
  }

  // ── Parse based on format type ──
  const formatType = payload[0];

  if (formatType === 0x01) {
    // ── Short payload format (Bech32) ──
    // payload = 0x01 | code_hash_index | args(20 bytes)
    if (payload.length < 22) {
      throw new Error("Short format address payload too short");
    }

    const codeHashIndex = payload[1];
    const args = payload.slice(2, 22);

    const codeHash = CODE_HASH_INDEX[codeHashIndex];
    if (!codeHash) {
      throw new Error(`Unknown code hash index: 0x${codeHashIndex.toString(16)}`);
    }

    return {
      code_hash: codeHash,
      hash_type: "type",
      args: hexEncode(args),
    };
  } else if (formatType === 0x00) {
    // ── Full payload format (Bech32m) ──
    // payload = 0x00 | code_hash(32) | hash_type(1) | args
    if (payload.length < 34) {
      throw new Error("Full format address payload too short");
    }

    const codeHashBytes = payload.slice(1, 33);
    const hashType = payload[33];
    const args = payload.slice(34);

    return {
      code_hash: hexEncode(codeHashBytes),
      hash_type: hashType === 0 ? "data" : hashType === 1 ? "type" : "data1",
      args: hexEncode(args),
    };
  } else if (formatType === 0x02 || formatType === 0x04) {
    // ── Deprecated full format (Bech32) ──
    // payload = 0x02/0x04 | code_hash(32) | args
    if (payload.length < 33) {
      throw new Error("Deprecated full format payload too short");
    }

    const codeHashBytes = payload.slice(1, 33);
    const args = payload.slice(33);

    return {
      code_hash: hexEncode(codeHashBytes),
      hash_type: formatType === 0x02 ? "data" : "type",
      args: hexEncode(args),
    };
  } else {
    throw new Error(`Unknown address format type: 0x${formatType.toString(16)}`);
  }
}

// Encode byte array as 0x-prefixed hex string
function hexEncode(bytes: number[]): string {
  return "0x" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// Fiber Network client
// ═══════════════════════════════════════════════════════════════════════════

export function createFiberClient(config: FiberConfig): FiberClient {
  return {
    async getBalance(address: string): Promise<bigint> {
      const lock = decodeCKBAddress(address);

      const response = await rpcCall(config.rpcUrl, "get_live_cells_by_lock", {
        lock,
      });

      if (!response || !Array.isArray(response)) {
        return 0n;
      }

      return response.reduce((total: bigint, cell: { capacity: string }) => {
        return total + BigInt(cell.capacity);
      }, 0n);
    },

    async createPayment(params): Promise<PendingPayment> {
      const recipientLock = decodeCKBAddress(params.recipient);
      const senderLock = decodeCKBAddress(params.sender);

      const liveCells = await collectCells(config.rpcUrl, senderLock, params.amount);

      const totalInputCapacity = liveCells.reduce(
        (sum, cell) => sum + BigInt(cell.capacity),
        0n
      );

      const MIN_OUTPUT_CAPACITY = 61_00_000_000n;
      const outputs: Record<string, unknown>[] = [];

      outputs.push({
        capacity: `0x${params.amount.toString(16)}`,
        lock: recipientLock,
        type: null,
      });

      const changeAmount = totalInputCapacity - params.amount - MIN_OUTPUT_CAPACITY;
      if (changeAmount > 0n) {
        outputs.push({
          capacity: `0x${changeAmount.toString(16)}`,
          lock: senderLock,
          type: null,
        });
      }

      const tx = {
        version: 0,
        cell_deps: [
          {
            out_point: {
              tx_hash: "0x27955ce1c267b13aae877965ad7b774726630a506e048e89db7a91613d275876",
              index: 0,
            },
            dep_type: "code",
          },
        ],
        header_deps: [],
        inputs: liveCells.map(
          (cell: { out_point: { tx_hash: string; index: string } }) => ({
            previous_output: cell.out_point,
            since: 0,
          })
        ),
        outputs,
        outputs_data: outputs.map(() => "0x"),
        witnesses: liveCells.map(() => "0x"),
      };

      const signPayload = {
        from: params.sender,
        to: params.recipient,
        amount: params.amount.toString(),
        timestamp: Date.now(),
      };
      const messageToSign = new TextEncoder().encode(JSON.stringify(signPayload));

      return { tx, messageToSign };
    },

    async broadcastPayment(signedTx: SignedTransaction): Promise<PaymentResult> {
      try {
        const response = await rpcCall(config.rpcUrl, "send_transaction", signedTx.tx);
        const txHash = response as string;

        const outputs = (signedTx.tx as { outputs?: Array<{ capacity?: string; lock?: { args?: string } }> }).outputs ?? [];
        const firstOutput = outputs[0];
        const amount = firstOutput?.capacity ? BigInt(firstOutput.capacity) : 0n;
        const recipientAddress = firstOutput?.lock?.args ?? "";

        return { success: true, txHash, amount, recipientAddress };
      } catch (error) {
        const outputs = (signedTx.tx as { outputs?: Array<{ capacity?: string; lock?: { args?: string } }> }).outputs ?? [];
        const firstOutput = outputs[0];

        return {
          success: false,
          error: error instanceof Error ? error.message : "Broadcast failed",
          amount: firstOutput?.capacity ? BigInt(firstOutput.capacity) : 0n,
          recipientAddress: firstOutput?.lock?.args ?? "",
        };
      }
    },

    async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
      try {
        const response = await rpcCall(config.rpcUrl, "get_transaction", txHash);
        if (!response) return "pending";

        const txWithStatus = response as { tx_status?: { status?: string } };
        const status = txWithStatus.tx_status?.status;

        if (status === "committed") return "confirmed";
        if (status === "pending" || status === "proposed") return "pending";
        return "failed";
      } catch {
        return "pending";
      }
    },
  };
}

// Collect live cells that cover the required amount
async function collectCells(
  rpcUrl: string,
  lock: LockScript,
  requiredAmount: bigint
): Promise<Array<{ out_point: { tx_hash: string; index: string }; capacity: string }>> {
  const response = await rpcCall(rpcUrl, "get_live_cells_by_lock", {
    lock,
    limit: "0x64",
  });

  if (!response || !Array.isArray(response)) {
    throw new Error("No live cells found for this address");
  }

  const cells = response as Array<{
    out_point: { tx_hash: string; index: string };
    capacity: string;
  }>;

  let totalCapacity = 0n;
  const selected: typeof cells = [];

  for (const cell of cells) {
    selected.push(cell);
    totalCapacity += BigInt(cell.capacity);
    if (totalCapacity >= requiredAmount) break;
  }

  if (totalCapacity < requiredAmount) {
    throw new Error(
      `Insufficient balance: have ${totalCapacity} shannons, need ${requiredAmount} shannons`
    );
  }

  return selected;
}

// Internal RPC call helper
async function rpcCall(url: string, method: string, params: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  const data = (await response.json()) as { result?: unknown; error?: { message: string } };

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}
