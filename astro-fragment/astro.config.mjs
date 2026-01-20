// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

import analogjsangular from '@analogjs/astro-angular';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  build: {
    assetsPrefix: 'http://localhost:8081/'
  },
  integrations: [analogjsangular(
      {
        vite: {
          transformFilter: (_code, id) => {
            // Nur Angular Runtime-Dateien transformieren – Tests sollen Vitest direkt ausführen.
            if (!id.includes('src/components/angular-components')) return false;
            if (id.endsWith('.spec.ts') || id.endsWith('.test.ts')) return false;
            return true;
          },
        },
      }
  )],
  vite: {
    ssr: {
      // transform these packages during SSR. Globs supported
      noExternal: ['@rx-angular/**'],
    },
  }
});