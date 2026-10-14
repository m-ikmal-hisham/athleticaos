import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var gitSha = 'unknown';
try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
}
catch (e) {
    console.warn('Could not get git sha', e);
}
// Staging builds (VITE_ENV=staging) tell search engines not to list the site, so only the live
// platform appears in results. Production keeps index.html's own "index, follow". This works on any
// CloudFront plan, unlike a response-header policy; staging-api sends the same as an nginx header.
function stagingNoindex() {
    var isStaging = false;
    return {
        name: 'athleticaos-staging-noindex',
        configResolved: function (config) {
            isStaging = config.env.VITE_ENV === 'staging';
        },
        transformIndexHtml: function (html) {
            if (!isStaging)
                return html;
            var tag = '<meta name="robots" content="noindex, nofollow" />';
            var robots = /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i;
            return robots.test(html) ? html.replace(robots, tag) : html.replace('</head>', "  ".concat(tag, "\n</head>"));
        },
    };
}
// https://vitejs.dev/config/
export default defineConfig({
    define: {
        'import.meta.env.VITE_GIT_SHA': JSON.stringify(gitSha),
    },
    plugins: [react(), stagingNoindex()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'es2015',
        chunkSizeWarningLimit: 9000,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-charts': ['recharts'],
                    'vendor-icons': ['@phosphor-icons/react'],
                    'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
                }
            }
        }
    },
});
