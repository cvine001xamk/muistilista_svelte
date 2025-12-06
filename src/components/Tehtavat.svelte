<script lang="ts">
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import { globalState } from '$lib/state.svelte';

	let { initialTehtavat }: { initialTehtavat: EnrichedTehtava[] } = $props();

	// We use globalState.tehtavat if it's populated (after init), otherwise fallback to initialTehtavat (SSR data)
	// However, since we init in layout, globalState should take over quickly.
	// To avoid hydration mismatch, we can start with initialTehtavat and then sync with globalState.
	// But simpler is to just rely on globalState derived.

	let searchTerm = $state<string>('');

	const filteredTehtavat = $derived.by(() => {
		const source = globalState.initialized ? globalState.tehtavat : initialTehtavat;
		if (searchTerm.length > 1) {
			return source.filter((tehtava) =>
				tehtava.nimi.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		return source;
	});
</script>

<div class="flex flex-col items-center justify-center md:max-w-3xl" in:fade>
	<div class="relative mb-4 w-full max-w-md">
		<input
			type="text"
			bind:value={searchTerm}
			placeholder="Etsi tehtävää..."
			class="w-full rounded-lg border border-gray-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
		{#if searchTerm}
			<button
				onclick={() => (searchTerm = '')}
				class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700 hover:text-gray-700"
			>
				<DeleteIcon />
			</button>
		{/if}
	</div>

	{#each filteredTehtavat as tehtava (tehtava.id)}
		<Tehtavarivi {tehtava} />
	{/each}
</div>
