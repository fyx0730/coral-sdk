import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@stoprocent/noble': path.resolve(rootDir, 'src/noble-browser-stub.js')
        }
    },
    build: {

        lib: {
            entry: 'src/main.js',
            name: 'CoralSDK',
            fileName: () => 'coral.js',
            formats: ['iife']
        },

        rollupOptions: {

            output: {
                inlineDynamicImports: true
            }
        }
    }
});
