import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Si el backend corre en local, el proxy evita problemas de CORS en desarrollo.
// Ajusta el target a la URL del backend de tu compañero.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
