// Uploads the logo + a standard token metadata JSON to Arweave (via Irys) and
// returns the metadata URI. The connected wallet pays/signs the upload — free on
// devnet, a few cents of SOL on mainnet. The umi passed in must already have the
// irysUploader plugin installed.
import { createGenericFile, type Umi } from '@metaplex-foundation/umi'

export interface MetadataInput {
  name: string
  symbol: string
  description?: string
  imageFile?: File | null
  imageUrl?: string
  website?: string
  twitter?: string
  telegram?: string
}

export async function uploadMetadata(umi: Umi, input: MetadataInput): Promise<string> {
  let image = input.imageUrl?.trim() ?? ''

  if (input.imageFile) {
    const bytes = new Uint8Array(await input.imageFile.arrayBuffer())
    const file = createGenericFile(bytes, input.imageFile.name, {
      contentType: input.imageFile.type || 'image/png',
    })
    const [uri] = await umi.uploader.upload([file])
    image = uri
  }

  const json: Record<string, unknown> = {
    name: input.name,
    symbol: input.symbol,
    description: input.description ?? '',
    image,
  }

  const links: Record<string, string> = {}
  if (input.website?.trim()) {
    json.external_url = input.website.trim()
    links.website = input.website.trim()
  }
  if (input.twitter?.trim()) links.twitter = input.twitter.trim()
  if (input.telegram?.trim()) links.telegram = input.telegram.trim()
  if (Object.keys(links).length > 0) json.extensions = links

  return await umi.uploader.uploadJson(json)
}
