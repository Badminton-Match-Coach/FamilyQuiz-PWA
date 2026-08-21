import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Relative URLs allow the build to work on GitHub Pages project sites.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      javascriptObfuscator({
        compact: true,
        controlFlowFlattening: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('@google/genai')) return 'vendor-ai';
              if (id.includes('lz-string')) return 'vendor-lz';
              if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
              return 'vendor-misc';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});