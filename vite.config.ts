import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'))

// Copy the RNNoise WASM binary into the dist output so the worklet can
// fetch it from a stable URL in both `vite dev` and the Electron build.
const rnnoiseWasmSrc = path.resolve(
  __dirname,
  'node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm'
)
const rnnoiseWasmDest = path.resolve(__dirname, 'public/rnnoise.wasm')
try {
  fs.mkdirSync(path.dirname(rnnoiseWasmDest), { recursive: true })
  fs.copyFileSync(rnnoiseWasmSrc, rnnoiseWasmDest)
} catch (e) {
  console.warn('[vite] could not pre-stage rnnoise.wasm:', e?.message ?? e)
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js',
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // The RNNoise package ships a hand-rolled Emscripten loader that resolves
    // the .wasm via fetch(); pre-bundling it confuses that path.
    exclude: ['@jitsi/rnnoise-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 5173,
    host: true,
    watch: {
      // Data files written at runtime by the Electron main process via IPC
      // (saveNativeAssets/saveNativeSpaces). They are imported as JSON modules,
      // so any change triggers a FULL page reload — recreating the camera at
      // the spawn point and teleporting the view to the top of the map on
      // every editor save. Runtime data also lives in localStorage, so
      // skipping the watch here has no functional downside in dev.
      ignored: ['**/src/data/nativeAssets.json', '**/src/data/nativeSpaces.json'],
    },
  },
})
