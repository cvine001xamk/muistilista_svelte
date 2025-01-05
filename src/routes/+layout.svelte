<script lang="ts">
	import '../app.css';
	import Navigaatio from '../components/Navigaatio.svelte';

	let { children } = $props();

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((registration) => {
				console.log('Service Worker registered:', registration);
			})
			.catch((error) => {
				console.error('Service Worker registration failed:', error);
			});
	}
</script>

<div
	class="mx-auto flex min-h-screen flex-col items-center gap-4 overflow-x-hidden bg-pink-800 text-white md:p-8"
>
	<div class="fixed top-0 z-50 w-full">
		<Navigaatio />
	</div>
	<div class="mt-16 w-full max-w-md p-4 md:max-w-2xl">
		{@render children()}
	</div>
</div>
