import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Solana's web3.js expects Node globals (Buffer/process/global) in the browser.
// nodePolyfills shims them so the app runs as a plain static site — no backend.
// base: './' makes asset URLs relative, so the same build works on a GitHub
// Pages project subpath (siigari.github.io/safemint/) AND a future custom domain
// at the root (safemint.app) with no reconfiguration.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
})
