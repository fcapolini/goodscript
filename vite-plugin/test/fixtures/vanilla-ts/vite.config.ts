import { defineConfig } from 'vite';
import goodscript from '../../../src/index';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',
      include: ['**/*.gs.ts']
    })
  ]
});
