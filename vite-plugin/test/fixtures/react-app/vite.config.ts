import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import goodscript from '../../../src/index';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',
      include: ['**/*.gs.ts', '**/*.gs.tsx']
    }),
    react()
  ]
});
