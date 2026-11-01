import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/web-archivo-tactico/',
  plugins: [react()],
  // Cada ejército es un chunk de datos propio (carga en paralelo); superar 500 kB es esperado.
  build: { chunkSizeWarningLimit: 2500 },
});
