// Generates a fresh Solana wallet in the standard CLI keypair format (a JSON
// byte array). Use this to create a dedicated launch wallet, then fund its
// address with SOL before launching. Never commit the resulting file.
import { writeFileSync, existsSync } from "node:fs";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const outPath = process.argv[2] ?? "./keypair.json";

if (existsSync(outPath)) {
  console.error(`Refusing to overwrite existing file: ${outPath}`);
  console.error("Delete it first if you really want a new wallet, or pass a different path:");
  console.error("  npm run keygen -- ./my-wallet.json");
  process.exit(1);
}

const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.generateKeypair();

writeFileSync(outPath, JSON.stringify(Array.from(keypair.secretKey)));

console.log("New wallet created.");
console.log("  File:    ", outPath, "  <-- keep this secret, it IS the wallet");
console.log("  Address: ", keypair.publicKey);
console.log("");
console.log("Next: fund this address with SOL, then set keypairPath to this file in config.json.");
