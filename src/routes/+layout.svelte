<script lang="ts">
	import '../app.css';
	import Navigaatio from '../components/Navigaatio.svelte';
	import ConnectivityBanner from '../components/ConnectivityBanner.svelte';
	import ToastContainer from '../components/ToastContainer.svelte';
	import { globalState } from '$lib/state.svelte';
	import { authState } from '$lib/auth.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	// Import connectivity singleton so it registers online/offline listeners
	import '$lib/connectivity.svelte';

	let { children } = $props();

	$effect(() => {
		globalState.init();
		authState.init();
	});

	// Client-side auth guard: redirect to /kirjaudu if not signed in
	$effect(() => {
		if (!authState.isLoading && !authState.session && $page.url.pathname !== '/kirjaudu') {
			goto('/kirjaudu');
		}
	});
</script>

<div
	class="gradient-bg mx-auto flex min-h-screen flex-col items-center gap-4 overflow-x-hidden text-white md:p-8"
>
	{#if authState.isLoading}
		<!-- Splash while session is being resolved -->
		<div class="flex min-h-screen flex-col items-center justify-center gap-4">
			<h1 class="neon text-4xl">muistilista</h1>
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
		</div>
	{:else}
		{#if $page.url.pathname !== '/kirjaudu'}
			<div class="fixed top-0 z-50 w-full">
				<Navigaatio />
			</div>
		{/if}
		<!-- Desktop: top padding for fixed nav, Mobile: top padding + bottom padding for bottom nav -->
		<div
			class="{$page.url.pathname !== '/kirjaudu'
				? 'mb-20 mt-16 md:mb-0'
				: ''} w-full max-w-md p-4 md:max-w-3xl"
		>
			{#key $page.url.pathname}
				<div in:fade={{ duration: 200 }}>
					{@render children()}
				</div>
			{/key}
		</div>
		<ConnectivityBanner />
		<ToastContainer />
	{/if}
</div>

<style>
	.gradient-bg {
		background: linear-gradient(135deg, #8f057c, #590261);
	}
</style>
