// Launch flow:
//   1. create the SPL mint + on-chain metadata (name / symbol / image)
//   2. mint the full supply to the wallet
//   3. revoke the mint authority   (supply can never be inflated)
//   4. revoke the freeze authority (holders can never be frozen)
//
// Defaults to devnet. A mainnet-beta launch requires the explicit --yes-mainnet flag.
import { createFungible } from "@metaplex-foundation/mpl-token-metadata";
import {
  setAuthority,
  AuthorityType,
  createAssociatedToken,
  findAssociatedTokenPda,
  mintTokensTo,
} from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  percentAmount,
  some,
  none,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { loadConfig, makeUmi, explorerUrl, getFlag } from "./util";

async function main() {
  const args = process.argv.slice(2);
  const configPath = getFlag(args, "--config") ?? "./config.json";
  const yesMainnet = args.includes("--yes-mainnet");

  const cfg = loadConfig(configPath);
  const { token } = cfg;

  // Safety gate: never let a real mainnet launch happen by accident.
  if (cfg.cluster === "mainnet-beta" && !yesMainnet) {
    console.error("This config targets MAINNET (real money, irreversible).");
    console.error("Re-run with the explicit flag to confirm:");
    console.error("  npm run launch -- --yes-mainnet");
    process.exit(1);
  }

  const umi = makeUmi(cfg);
  const wallet = umi.identity.publicKey;

  // Pre-flight: an unfunded wallet is the #1 cause of failed launches.
  const balance = await umi.rpc.getBalance(wallet);
  const sol = Number(balance.basisPoints) / 1e9;
  if (balance.basisPoints === 0n) {
    console.error(`Wallet ${wallet} has 0 SOL on ${cfg.cluster}. Fund it before launching.`);
    if (cfg.cluster === "devnet") {
      console.error("Devnet SOL is free: `solana airdrop 2 " + wallet + " --url devnet` or https://faucet.solana.com");
    }
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(`Launching on:  ${cfg.cluster.toUpperCase()}`);
  console.log(`Wallet:        ${wallet}  (${sol.toFixed(4)} SOL)`);
  console.log(`Token:         ${token.name} (${token.symbol})`);
  console.log(`Supply:        ${token.supply.toLocaleString()} @ ${token.decimals} decimals`);
  console.log("=".repeat(60));

  // 1+2. Create the mint + metadata, the ATA, and mint the full supply — ALL in
  // one atomic transaction. Splitting create and mint into separate transactions
  // races on public RPC (the 2nd tx can hit a node that hasn't seen the mint yet,
  // which shows up as "IncorrectProgramId"). Minting uses the plain SPL mint-to
  // (not Metaplex mintV1, which fails on fungibles with 0x39).
  const mint = generateSigner(umi);
  const amount = BigInt(token.supply) * 10n ** BigInt(token.decimals);
  const ata = findAssociatedTokenPda(umi, { mint: mint.publicKey, owner: wallet });
  console.log("\n[1/3] Creating mint + metadata + minting supply...");
  await createFungible(umi, {
    mint,
    name: token.name,
    symbol: token.symbol,
    uri: token.metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(token.decimals),
  })
    .add(createAssociatedToken(umi, { mint: mint.publicKey, owner: wallet }))
    .add(mintTokensTo(umi, { mint: mint.publicKey, token: ata, amount, mintAuthority: umi.identity }))
    .sendAndConfirm(umi);
  console.log(`      Mint: ${mint.publicKey}`);

  // 3. Revoke mint authority -> supply is permanently fixed.
  console.log("\n[2/3] Revoking mint authority (fixing supply forever)...");
  await setAuthority(umi, {
    owned: mint.publicKey,
    owner: umi.identity,
    authorityType: AuthorityType.MintTokens,
    newAuthority: none(),
  }).sendAndConfirm(umi);

  // 4. Revoke freeze authority -> nobody's tokens can ever be frozen.
  console.log("\n[3/3] Revoking freeze authority (un-freezable)...");
  await setAuthority(umi, {
    owned: mint.publicKey,
    owner: umi.identity,
    authorityType: AuthorityType.FreezeAccount,
    newAuthority: none(),
  }).sendAndConfirm(umi);

  console.log("\n" + "=".repeat(60));
  console.log("DONE. Token is live and locked down.");
  console.log("=".repeat(60));
  console.log(`Mint address: ${mint.publicKey}`);
  console.log(`Explorer:     ${explorerUrl(mint.publicKey, cfg.cluster)}`);
  console.log("\nNext step: add liquidity on Raydium (https://raydium.io/liquidity/create-pool/)");
  console.log("so people can trade it. See the README for the exact steps.");
}

main().catch((err) => {
  console.error("\nLaunch failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
