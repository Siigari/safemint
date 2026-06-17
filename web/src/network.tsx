import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { clusterApiUrl } from '@solana/web3.js'

export type Network = 'devnet' | 'mainnet-beta'

interface NetworkCtx {
  network: Network
  setNetwork: (n: Network) => void
  endpoint: string
}

const Ctx = createContext<NetworkCtx | null>(null)

/**
 * Holds the selected cluster ABOVE the wallet/connection providers, so flipping
 * devnet <-> mainnet swaps the RPC endpoint and re-wires the whole app.
 */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>('devnet')
  // Public RPC by default. A power user can later point this at a paid endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const value = useMemo(() => ({ network, setNetwork, endpoint }), [network, endpoint])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNetwork(): NetworkCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNetwork must be used within NetworkProvider')
  return v
}
