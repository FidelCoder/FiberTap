import type {
  FiberClient,
  FiberConfig,
  PaymentResult,
  PendingPayment,
  SignedTransaction,
  TransactionStatus,
} from "./types.js";

// Create a Fiber Network client
export function createFiberClient(config: FiberConfig): FiberClient {
  return {
    async getBalance(address: string): Promise<bigint> {
      const response = await rpcCall(config.rpcUrl, "get_live_cells_by_lock", {
        lock: {
          code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          hash_type: "data",
          args: address,
        },
      });

      if (!response || !Array.isArray(response)) {
        return 0n;
      }

      return response.reduce((total: bigint, cell: { capacity: string }) => {
        return total + BigInt(cell.capacity);
      }, 0n);
    },

    async createPayment(params): Promise<PendingPayment> {
      const tx = {
        version: 0,
        cell_deps: [],
        header_deps: [],
        inputs: [],
        outputs: [
          {
            capacity: `0x${params.amount.toString(16)}`,
            lock: {
              code_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
              hash_type: "data",
              args: params.recipient,
            },
          },
        ],
        outputs_data: ["0x"],
        witnesses: [],
      };

      const messageToSign = new TextEncoder().encode(
        JSON.stringify({ from: params.sender, to: params.recipient, amount: params.amount.toString() })
      );

      return { tx, messageToSign };
    },

    async broadcastPayment(signedTx: SignedTransaction): Promise<PaymentResult> {
      try {
        const response = await rpcCall(config.rpcUrl, "send_transaction", signedTx.tx);

        return {
          success: true,
          txHash: response as string,
          amount: 0n,
          recipientAddress: "",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Broadcast failed",
          amount: 0n,
          recipientAddress: "",
        };
      }
    },

    async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
      try {
        const response = await rpcCall(config.rpcUrl, "get_transaction", txHash);

        if (!response) {
          return "pending";
        }

        const txWithStatus = response as { tx_status?: { status?: string } };
        const status = txWithStatus.tx_status?.status;

        if (status === "committed") {
          return "confirmed";
        }
        if (status === "pending" || status === "proposed") {
          return "pending";
        }
        return "failed";
      } catch {
        return "pending";
      }
    },
  };
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
