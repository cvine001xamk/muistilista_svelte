<script lang="ts">
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';
	import TaskSkeleton from './TaskSkeleton.svelte';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import PlusIcon from '$lib/icons/PlusIcon.svelte';
	import { globalState } from '$lib/state.svelte';

	let { initialTehtavat }: { initialTehtavat: EnrichedTehtava[] } = $props();

	let searchTerm = $state<string>('');

	const source = $derived(
		globalState.initialized ? globalState.tehtavat : (initialTehtavat ?? [])
	);

	const isLoading = $derived(!globalState.initialized && source.length === 0);

	const filteredTehtavat = $derived.by(() => {
		if (searchTerm.trim().length > 1) {
			return source.filter((tehtava) =>
				tehtava.nimi.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		return source;
	});
</script>

<div class="flex flex-col items-center justify-center w-full md:max-w-3xl" in:fade>
	<!-- Search bar -->
	<div class="relative mb-4 w-full max-w-md">
		<input
			type="text"
			bind:value={searchTerm}
			placeholder="Etsi tehtävää..."
			class="w-full rounded-lg border border-gray-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
		/>
		{#if searchTerm}
			<button
				onclick={() => (searchTerm = '')}
				class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700 hover:text-gray-700"
				aria-label="Tyhjennä haku"
			>
				<DeleteIcon class="size-5" />
			</button>
		{/if}
	</div>

	<!-- Loading Skeleton state -->
	{#if isLoading}
		<div class="w-full max-w-md">
			<TaskSkeleton />
			<TaskSkeleton />
			<TaskSkeleton />
			<TaskSkeleton />
		</div>
	<!-- Empty state -->
	{:else if filteredTehtavat.length === 0}
		<div
			in:fade
			class="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-8 text-center backdrop-blur-md border border-white/15 my-6 max-w-md w-full"
		>
			{#if searchTerm}
				<p class="text-lg font-semibold text-white">Ei tehtäviä haulla</p>
				<p class="mt-1 text-sm text-white/70">"{searchTerm}"</p>
				<button
					onclick={() => (searchTerm = '')}
					class="mt-4 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/30 active:scale-95"
				>
					Tyhjennä haku
				</button>
			{:else}
				<div class="mb-3 rounded-full bg-white/20 p-3">
					<PlusIcon class="size-8 text-white" />
				</div>
				<h3 class="text-xl font-bold text-white">Ei tehtäviä vielä</h3>
				<p class="mt-1 text-sm text-white/80 max-w-xs">
					Lisää kotitaloutesi toistuvat askareet ja muistilista pitää huolen niiden määräajoista.
				</p>
				<a
					href="/lisaa"
					class="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95"
				>
					<PlusIcon class="size-5" />
					<span>Lisää ensimmäinen tehtävä</span>
				</a>
			{/if}
		</div>
	<!-- Task list -->
	{:else}
		<div class="w-full max-w-md">
			{#each filteredTehtavat as tehtava (tehtava.id)}
				<Tehtavarivi {tehtava} />
			{/each}
		</div>
	{/if}
</div>
