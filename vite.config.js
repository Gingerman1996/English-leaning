import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  // Transformers.js dynamically loads ONNX runtime + WASM binaries; pre-
  // bundling those breaks the loader. Exclude it so Vite ships it as-is.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep the transformers chunk separate so the initial bundle stays
          // small — it only loads when the user clicks "Practice".
          transformers: ['@huggingface/transformers'],
        },
      },
    },
  },
});
