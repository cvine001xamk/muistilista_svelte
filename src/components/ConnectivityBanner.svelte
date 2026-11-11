<script lang="ts">
	import { connectivity } from '$lib/connectivity.svelte';
	import { fade } from 'svelte/transition';
</script>

{#if !connectivity.isOnline || connectivity.pendingSync > 0}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-4"
	>
		<div
			class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg
			{!connectivity.isOnline
				? 'bg-red-600 text-white'
				: 'bg-amber-500 text-white'}"
		>
			{#if !connectivity.isOnline}
				<span class="relative flex size-2">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
					></span>
					<span class="relative inline-flex size-2 rounded-full bg-white"></span>
				</span>
				Offline — muutokset tallennetaan paikallisesti
			{:else if connectivity.pendingSync > 0}
				<svg
					class="size-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				Synkronoidaan {connectivity.pendingSync} muutosta…
			{/if}
		</div>
	</div>
{/if}

