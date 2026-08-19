export type Config = {
  port: number;
  mongoUri: string;
  mongoDb: string;
  network: "mainnet" | "testnet";
  ckbRpcUrl: string;
  ckbIndexerUrl: string;
};

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT ?? "3001"),
    mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017",
    mongoDb: process.env.MONGODB_DB ?? "fibertap",
    network: (process.env.CKB_NETWORK as "mainnet" | "testnet") ?? "testnet",
    ckbRpcUrl: process.env.CKB_RPC_URL ?? "https://testnet.ckbapp.dev/rpc",
    ckbIndexerUrl: process.env.CKB_INDEXER_URL ?? "https://testnet.ckbapp.dev/indexer",
  };
}
