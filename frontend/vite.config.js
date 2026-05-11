import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the app under /appointments-app/ — set base accordingly.
  // For root-domain hosts (Vercel/Netlify), this still works because relative URLs are fine.
  base: process.env.VITE_BASE_PATH || '/appointments-app/',
  server: {
    port: 5173,
  },
});
