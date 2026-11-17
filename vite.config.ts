import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const ROOT_DIR =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." still resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(ROOT_DIR, 'dist');
          const srcAssets = path.resolve(ROOT_DIR, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': ROOT_DIR,
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('react-dom') || id.includes('react')) return 'vendor-react';
            return 'vendor';
          },
        },
      },
    },
    server: {
      allowedHosts: ['sb-4xril02bvjhx.vercel.run'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
