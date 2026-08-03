import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Los eventos de inotify no cruzan los bind mounts de Docker en Windows/macOS,
// así que dentro del contenedor hay que sondear para detectar cambios.
// Fuera de Docker se deja desactivado: el watcher nativo es más eficiente.
const usePolling = process.env.VITE_USE_POLLING === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  server: {
    // Escucha en 0.0.0.0: sin esto el servidor solo responde dentro del
    // contenedor y el mapeo de puertos de Docker no alcanza a nada.
    host: true,
    port: 5173,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': {
        // En Docker el API vive en otro contenedor ('server'), no en localhost.
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
