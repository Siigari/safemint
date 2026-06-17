// The token-creation engine — signed by a browser wallet (Phantom/Solflare).
//
//   tx1: create SPL mint + metadata + ATA + mint the full supply  (ALL ATOMIC)
//   tx2: (optional) revoke mint + freeze authority                (batched)
//
// Why tx1 is one atomic transaction: creating the mint and then its associated
// token account in SEPARATE transactions races on public RPC — the 2nd tx can
// be simulated by a node that hasn't seen the mint yet, which surfaces as
// "IncorrectProgramId" (the token program thinks the mint doesn't exist).
// Bundling them guarantees the mint exists before the ATA/mint-to run.
//
// Minting uses the plain SPL mint-to (not Metaplex mintV1, which fails on
// fungibles with "Incorrect account owner" / 0x39).
import { createFungible } from '@metaplex-foundation/mpl-token-metadata'
import {
  setAuthority,
  AuthorityType,
  createAssociatedToken,
  findAssociatedTokenPda,
  mintTokensTo,
} from '@metaplex-foundation/mpl-toolbox'
import {
  generateSigner,
  percentAmount,
  some,
  none,
  transactionBuilder,
  type Umi,
} from '@metaplex-foundation/umi'

export interface TokenOptions {
  name: string
  symbol: string
  decimals: number
  supply: number
  metadataUri: string
  revokeMint: boolean
  revokeFreeze: boolean
  /** When true, metadata is created immutable (update authority can't change it). */
  revokeUpdate: boolean
}

export interface CreateResult {
  mint: string
}

export async function createToken(
  umi: Umi,
  opts: TokenOptions,
  onStep?: (msg: string) => void,
): Promise<CreateResult> {
  const mint = generateSigner(umi)
  const owner = umi.identity.publicKey

  // tx1: create + (optionally) mint supply, all in one atomic transaction.
  onStep?.('Creating token + minting supply…')
  let create = createFungible(umi, {
    mint,
    name: opts.name,
    symbol: opts.symbol,
    uri: opts.metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(opts.decimals),
    isMutable: !opts.revokeUpdate,
  })

  if (opts.supply > 0) {
    // base units = whole tokens * 10^decimals — BigInt because this overflows Number.
    const amount = BigInt(opts.supply) * 10n ** BigInt(opts.decimals)
    const ata = findAssociatedTokenPda(umi, { mint: mint.publicKey, owner })
    create = create
      .add(createAssociatedToken(umi, { mint: mint.publicKey, owner }))
      .add(
        mintTokensTo(umi, {
          mint: mint.publicKey,
          token: ata,
          amount,
          mintAuthority: umi.identity,
        }),
      )
  }
  await create.sendAndConfirm(umi)

  // tx2: batch the revocations into a single transaction = a single wallet popup.
  let revokes = transactionBuilder()
  if (opts.revokeMint) {
    revokes = revokes.add(
      setAuthority(umi, {
        owned: mint.publicKey,
        owner: umi.identity,
        authorityType: AuthorityType.MintTokens,
        newAuthority: none(),
      }),
    )
  }
  if (opts.revokeFreeze) {
    revokes = revokes.add(
      setAuthority(umi, {
        owned: mint.publicKey,
        owner: umi.identity,
        authorityType: AuthorityType.FreezeAccount,
        newAuthority: none(),
      }),
    )
  }
  if (revokes.items.length > 0) {
    onStep?.('Locking down authorities…')
    await revokes.sendAndConfirm(umi)
  }

  return { mint: mint.publicKey }
}
