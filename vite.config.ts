import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			injectRegister: null,
			manifest: false,
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				navigateFallback: '/index.html',
				navigateFallbackDenylist: [/^\/api\//]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version)
	},
	server: {
		port: 5000,
		allowedHosts: true,
		headers: {
			'Cache-Control': 'no-store, no-cache, must-revalidate',
			'Pragma': 'no-cache'
		}
	}
});
