import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			manifest: {
				name: 'Muistilista',
				short_name: 'Muistilista',
				description: 'Muistilista as Progressive Web App!',
				theme_color: '#ffffff',
				icons: [
					{
						src: '/logo512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/logo1024.png',
						sizes: '1024x1024',
						type: 'image/png'
					}
				]
			}
		})
	]
});
