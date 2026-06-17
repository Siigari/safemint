import { readFileSync } from "node:fs";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, type Umi } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

export type Cluster = "devnet" | "mainnet-beta";

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  metadataUri: string;
}

export interface AppConfig {
  cluster: Cluster;
  rpcUrl?: string;
  keypairPath: string;
  token: TokenConfig;
}

/** Read + validate the JSON config file. Throws a friendly error on anything missing. */
export function loadConfig(path: string): AppConfig {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Could not read config file at "${path}". Copy config.example.json to config.json and edit it.`
    );
  }

  let cfg: AppConfig;
  try {
    cfg = JSON.parse(raw) as AppConfig;
  } catch {
    throw new Error(`Config file "${path}" is not valid JSON.`);
  }

  if (cfg.cluster !== "devnet" && cfg.cluster !== "mainnet-beta") {
    throw new Error(`config.cluster must be "devnet" or "mainnet-beta" (got: ${String(cfg.cluster)}).`);
  }
  if (typeof cfg.keypairPath !== "string" || cfg.keypairPath.length === 0) {
    throw new Error("config.keypairPath is required (path to your wallet keypair JSON).");
  }
  const t = cfg.token;
  if (!t || typeof t !== "object") throw new Error("config.token is required.");
  if (!t.name) throw new Error("config.token.name is required.");
  if (!t.symbol) throw new Error("config.token.symbol is required.");
  if (!Number.isInteger(t.decimals) || t.decimals < 0 || t.decimals > 9) {
    throw new Error("config.token.decimals must be an integer 0–9 (9 is the Solana convention).");
  }
  if (!Number.isInteger(t.supply) || t.supply <= 0) {
    throw new Error("config.token.supply must be a positive whole number (tokens, excluding decimals).");
  }
  if (!t.metadataUri || !/^https?:\/\//.test(t.metadataUri)) {
    throw new Error(
      "config.token.metadataUri must be an http(s) URL to your metadata JSON. Run `npm run upload` to create one."
    );
  }
  return cfg;
}

/** Public RPC by default; honor an explicit rpcUrl override (recommended for mainnet). */
export function resolveEndpoint(cfg: AppConfig): string {
  if (cfg.rpcUrl && cfg.rpcUrl.trim().length > 0) return cfg.rpcUrl.trim();
  return cfg.cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

/** Load a wallet from the Solana CLI keypair format (a JSON array of 64 bytes). */
function loadSecretKey(path: string): Uint8Array {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Could not read keypair at "${path}". Generate one with \`npm run keygen\` (then fund that address with SOL).`
    );
  }
  let bytes: number[];
  try {
    bytes = JSON.parse(raw);
  } catch {
    throw new Error(`Keypair file "${path}" is not valid JSON. Expected a byte array like [12,34,...].`);
  }
  if (!Array.isArray(bytes) || (bytes.length !== 64 && bytes.length !== 32)) {
    throw new Error(`Keypair file "${path}" must be a JSON array of 32 or 64 numbers (Solana CLI format).`);
  }
  return Uint8Array.from(bytes);
}

/** Build a configured Umi client with the wallet loaded as the signing identity. */
export function makeUmi(cfg: AppConfig): Umi {
  const umi = createUmi(resolveEndpoint(cfg)).use(mplTokenMetadata()).use(mplToolbox());
  const keypair = umi.eddsa.createKeypairFromSecretKey(loadSecretKey(cfg.keypairPath));
  umi.use(keypairIdentity(keypair));
  return umi;
}

export function explorerUrl(address: string, cluster: Cluster): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${suffix}`;
}

/** Read a named CLI flag value, e.g. getFlag(args, "--config") for `--config foo.json`. */
export function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
