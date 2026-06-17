import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Solana's web3.js expects Node globals (Buffer/process/global) in the browser.
// nodePolyfills shims them so the app runs as a plain static site — no backend.
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
})
