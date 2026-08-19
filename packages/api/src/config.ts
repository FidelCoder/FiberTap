export type Config = {
  port: number;
  dbPath: string;
  network: "mainnet" | "testnet";
  ckbRpcUrl: string;
  ckbIndexerUrl: string;
};

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT ?? "3001"),
    dbPath: process.env.DB_PATH ?? "./data/fibertap.db",
    network: (process.env.CKB_NETWORK as "mainnet" | "testnet") ?? "testnet",
    ckbRpcUrl: process.env.CKB_RPC_URL ?? "https://testnet.ckbapp.dev/rpc",
    ckbIndexerUrl: process.env.CKB_INDEXER_URL ?? "https://testnet.ckbapp.dev/indexer",
  };
}
