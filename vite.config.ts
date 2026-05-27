import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Externalizar todos los paquetes de node_modules para el proceso main.
              // pg y sus sub-dependencias (pg-pool, pg-protocol) necesitan ejecutarse
              // como módulos nativos, no bundleados.
              external: (id: string) => {
                if (id.startsWith('node:') || id === 'electron') return true;
                // No externalizar rutas relativas ni absolutas (nuestro código)
                if (id.startsWith('.') || id.startsWith('/') || /^[A-Z]:/.test(id)) return false;
                return true; // externalizar todo lo de node_modules
              },
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
});
