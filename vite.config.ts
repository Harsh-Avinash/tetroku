import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'docs',
        emptyOutDir: true
    },
    base: './' // ensures relative paths for assets so it works in subfolder
});
