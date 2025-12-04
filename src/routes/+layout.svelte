<script lang="ts">
	import '../app.css';
	import Navigaatio from '../components/Navigaatio.svelte';

	let { children } = $props();
</script>

<div
	class="gradient-bg mx-auto flex min-h-screen flex-col items-center gap-4 overflow-x-hidden text-white md:p-8"
>
	<div class="fixed top-0 z-50 w-full">
		<Navigaatio />
	</div>
	<!-- Desktop: top padding for fixed nav, Mobile: top padding + bottom padding for bottom nav -->
	<div class="mb-20 mt-16 w-full max-w-md p-4 md:mb-0 md:max-w-3xl">
		{@render children()}
	</div>
</div>

<style>
	.gradient-bg {
		background: linear-gradient(135deg, #8f057c, #590261);
	}
</style>
