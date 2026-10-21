import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    logLevel: 'warning',
    build: {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: { manualChunks: { phaser: ['phaser'] } }
        }
    },
    server: { port: 8080 }
});
