import { useMemo, useState, type ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { useNetwork } from './network'
import { createToken } from './lib/createToken'
import { uploadMetadata } from './lib/uploadMetadata'
import { computeSafety } from './lib/safety'
import './App.css'

export default function App() {
  const wallet = useWallet()
  const { network, setNetwork, endpoint } = useNetwork()

  // Token fields
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState(9)
  const [supply, setSupply] = useState(1_000_000_000)
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [showSocials, setShowSocials] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [metaUri, setMetaUri] = useState('')

  // Safety toggles (all ON by default = safest)
  const [revokeMint, setRevokeMint] = useState(true)
  const [revokeFreeze, setRevokeFreeze] = useState(true)
  const [revokeUpdate, setRevokeUpdate] = useState(true)

  // Run state
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [mintAddr, setMintAddr] = useState('')

  const safety = useMemo(
    () => computeSafety({ revokeMint, revokeFreeze, revokeUpdate }),
    [revokeMint, revokeFreeze, revokeUpdate],
  )
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ''), [imageFile])
  const canCreate = wallet.connected && name.trim() !== '' && symbol.trim() !== '' && !busy

  const explorer = mintAddr
    ? `https://explorer.solana.com/address/${mintAddr}${network === 'devnet' ? '?cluster=devnet' : ''}`
    : ''

  async function handleCreate() {
    setError('')
    setMintAddr('')
    setBusy(true)
    try {
      const umi = createUmi(endpoint)
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(irysUploader())
        .use(walletAdapterIdentity(wallet))

      // Metadata hosting is OPTIONAL. The token's name + symbol are stored
      // on-chain by createFungible no matter what; only the logo/description/
      // socials live in an off-chain JSON. So we only touch Arweave/Irys if
      // there's something to host AND no manual URI was given — keeping the core
      // create path independent of a flaky uploader (Irys is unreliable on devnet).
      let metadataUri = metaUri.trim()
      const wantsHosted =
        !metadataUri &&
        (!!imageFile ||
          description.trim() !== '' ||
          website.trim() !== '' ||
          twitter.trim() !== '' ||
          telegram.trim() !== '')
      if (wantsHosted) {
        setStep('Uploading image + metadata to Arweave…')
        try {
          metadataUri = await uploadMetadata(umi, {
            name,
            symbol,
            description,
            imageFile,
            website,
            twitter,
            telegram,
          })
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e)
          throw new Error(
            'Metadata upload failed — Arweave/Irys is unreliable, especially on devnet. ' +
              'To mint right now: remove the logo (and description/socials) and hit Create, ' +
              'or paste your own metadata URL under “Advanced”. [' +
              m.slice(0, 140) +
              ']',
          )
        }
      }

      const { mint } = await createToken(
        umi,
        { name, symbol, decimals, supply, metadataUri, revokeMint, revokeFreeze, revokeUpdate },
        setStep,
      )
      setMintAddr(mint)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="lock">🔒</span> SafeMint
        </div>
        <div className="top-actions">
          <a
            className="gh-link"
            href="https://github.com/Siigari/safemint"
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
          </a>
          <div className="net-toggle" role="tablist" aria-label="Network">
            <button
              className={network === 'devnet' ? 'on' : ''}
              onClick={() => setNetwork('devnet')}
              disabled={busy}
            >
              Devnet
            </button>
            <button
              className={network === 'mainnet-beta' ? 'on' : ''}
              onClick={() => setNetwork('mainnet-beta')}
              disabled={busy}
            >
              Mainnet
            </button>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <div className="trust-banner">
        This app is open source and <strong>never sees your private key</strong>. You approve every
        action in your own wallet. <strong>We will never ask for your seed phrase.</strong>
      </div>

      {network === 'devnet' && (
        <div className="hint">
          You're on <strong>Devnet</strong> — a free test network. Practice here for free, then
          switch to Mainnet for the real thing.
        </div>
      )}

      <main className="grid">
        <section className="card">
          <h2>Token details</h2>

          <Field label="Name" hint="The full name, e.g. “My Meme Coin”.">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Meme Coin" />
          </Field>

          <Field label="Ticker / Symbol" hint="Short, e.g. “MEME”.">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="MEME"
              maxLength={10}
            />
          </Field>

          <div className="row">
            <Field label="Decimals" hint="9 is the Solana convention.">
              <input
                type="number"
                min={0}
                max={9}
                value={decimals}
                onChange={(e) => setDecimals(clampInt(e.target.value, 0, 9, 9))}
              />
            </Field>
            <Field label="Total supply" hint="Whole tokens to create.">
              <input
                type="number"
                min={1}
                value={supply}
                onChange={(e) => setSupply(clampInt(e.target.value, 1, Number.MAX_SAFE_INTEGER, 1))}
              />
            </Field>
          </div>

          <Field label="Logo" hint="PNG/JPG/GIF. Uploaded to Arweave when you create.">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          {imagePreview && <img className="logo-preview" src={imagePreview} alt="logo preview" />}

          <Field label="Description" hint="Optional.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this coin about?"
            />
          </Field>

          <button className="link-btn" onClick={() => setShowSocials((s) => !s)}>
            {showSocials ? '− Hide social links' : '+ Add social links'}
          </button>
          {showSocials && (
            <div className="socials">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website URL" />
              <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="Twitter / X URL" />
              <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="Telegram URL" />
            </div>
          )}

          <button className="link-btn" onClick={() => setShowAdvanced((s) => !s)}>
            {showAdvanced ? '− Hide advanced' : '+ Advanced'}
          </button>
          {showAdvanced && (
            <div className="socials">
              <input
                value={metaUri}
                onChange={(e) => setMetaUri(e.target.value)}
                placeholder="Metadata URI (optional, e.g. https://…/metadata.json)"
              />
              <span className="field-hint">
                Host your own metadata JSON to skip the Arweave upload entirely. Leave blank to
                upload automatically (only happens if you added a logo/description/socials).
              </span>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Safety &amp; authorities</h2>
          <p className="muted">
            These decide whether buyers will trust your token. All on = safest.
          </p>

          <Toggle
            label="Revoke mint authority"
            sub="Supply can never be increased. Recommended."
            checked={revokeMint}
            onChange={setRevokeMint}
          />
          <Toggle
            label="Revoke freeze authority"
            sub="You can never freeze anyone's tokens. Recommended."
            checked={revokeFreeze}
            onChange={setRevokeFreeze}
          />
          <Toggle
            label="Make metadata immutable"
            sub="Name / symbol / image are locked forever."
            checked={revokeUpdate}
            onChange={setRevokeUpdate}
          />

          <div className={`meter ${safety.level}`}>
            <div className="meter-head">
              <span>Safety</span>
              <span className="meter-score">
                {safety.score}/100 · {safety.level.toUpperCase()}
              </span>
            </div>
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: `${safety.score}%` }} />
            </div>
            {safety.warnings.length > 0 && (
              <ul className="warnings">
                {safety.warnings.map((w) => (
                  <li key={w}>⚠️ {w}</li>
                ))}
              </ul>
            )}
          </div>

          {!wallet.connected ? (
            <div className="connect-cta">
              <p>Connect a wallet to create your token.</p>
              <WalletMultiButton />
            </div>
          ) : (
            <button className="create-btn" disabled={!canCreate} onClick={handleCreate}>
              {busy ? (step || 'Working…') : `Create token on ${network === 'devnet' ? 'Devnet' : 'Mainnet'}`}
            </button>
          )}

          {busy && <p className="status">{step}</p>}
          {error && <p className="error">⚠️ {error}</p>}

          {mintAddr && (
            <div className="result">
              <h3>✅ Token created</h3>
              <p className="mono">{mintAddr}</p>
              <a href={explorer} target="_blank" rel="noreferrer">
                View on Solana Explorer →
              </a>
              <p className="muted next">
                Next: add liquidity so people can trade it —{' '}
                <a href="https://raydium.io/liquidity/create-pool/" target="_blank" rel="noreferrer">
                  create a pool on Raydium
                </a>
                .
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div>Open source · non-custodial · run it yourself. Always test on Devnet first.</div>
        <div className="byline">
          Made by <strong>Siigari</strong> · Need something custom? Reach me on Discord{' '}
          <strong>@Siigari</strong>
        </div>
      </footer>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        <span className="toggle-sub">{sub}</span>
      </span>
    </button>
  )
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
