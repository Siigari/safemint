import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@solana/wallet-adapter-react-ui/styles.css'
import './index.css'
import App from './App.tsx'
import { NetworkProvider } from './network'
import { SolanaProviders } from './providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkProvider>
      <SolanaProviders>
        <App />
      </SolanaProviders>
    </NetworkProvider>
  </StrictMode>,
)
