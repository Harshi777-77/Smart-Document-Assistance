import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // allows network access if needed
        port: 5173,
        open: true,
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
