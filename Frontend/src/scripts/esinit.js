import * as esbuild from 'esbuild-wasm';

let initializePromise = null;

export async function ensureEsbuildInitialized() {
  if (!initializePromise) {
    initializePromise = esbuild.initialize({
      wasmURL: '/esbuild.wasm', // ✅ Served from public directory
      worker: true,
    });
  }
  await initializePromise;
}
