// OPTIONAL helper: upload an image + metadata JSON to permanent storage
// (Arweave, via Irys) and print a metadataUri to paste into config.json.
//
// Usage:  npm run upload -- ./logo.png "A short description of the coin"
//
// Note: on mainnet this costs a tiny amount of SOL (the upload fee). On devnet
// it is effectively free. If you'd rather host the JSON yourself (e.g. on your
// own site or IPFS), you can skip this and just set metadataUri by hand.
import { readFileSync } from "node:fs";
import { extname, basename } from "node:path";
import { createGenericFile } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { loadConfig, makeUmi, getFlag } from "./util";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

async function main() {
  const args = process.argv.slice(2);
  const configPath = getFlag(args, "--config") ?? "./config.json";
  const positional = args.filter((a) => !a.startsWith("--") && a !== configPath);
  const imagePath = positional[0];
  const description = positional[1] ?? "";

  if (!imagePath) {
    console.error('Usage: npm run upload -- ./logo.png "Optional description"');
    process.exit(1);
  }

  const cfg = loadConfig(configPath);
  const umi = makeUmi(cfg).use(irysUploader());

  const ext = extname(imagePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    console.error(`Unsupported image type "${ext}". Use png, jpg, gif, or webp.`);
    process.exit(1);
  }

  console.log(`Uploading image (${imagePath})...`);
  const imageBytes = readFileSync(imagePath);
  const file = createGenericFile(new Uint8Array(imageBytes), basename(imagePath), { contentType });
  const [imageUri] = await umi.uploader.upload([file]);
  console.log("  image uri:", imageUri);

  console.log("Uploading metadata JSON...");
  const metadataUri = await umi.uploader.uploadJson({
    name: cfg.token.name,
    symbol: cfg.token.symbol,
    description,
    image: imageUri,
  });

  console.log("\nDone. Paste this into config.json -> token.metadataUri :\n");
  console.log("  " + metadataUri);
}

main().catch((err) => {
  console.error("\nUpload failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
