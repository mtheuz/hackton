import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [react(), Icons({ compiler: 'jsx', jsx: 'react' })],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
