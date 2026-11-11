<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { completionsState } from '$lib/completions.svelte';
	import type { PageData } from './$types';

	import SuoritusDialog from '../../components/SuoritusDialog.svelte';
	import { writable } from 'svelte/store';

	let { data }: { data: PageData } = $props();

	// Initialize completionsState
	$effect(() => {
		completionsState.init();
	});

	let selectedTehtava = $state<string | null>(null);

	// Dialog state
	const dialogOpen = writable(false);
	let selectedSuoritus = $state<Suoritus | null>(null);

	function openEditDialog(suoritus: Suoritus) {
		selectedSuoritus = suoritus;
		dialogOpen.set(true);
	}

	// Use completionsState.suoritukset if populated, otherwise data.suoritukset from SSR
	const activeSuoritukset = $derived(
		completionsState.suoritukset.length > 0 || completionsState.initialized
			? completionsState.suoritukset
			: (data.suoritukset ?? [])
	);

	const sortedSuoritukset = $derived(
		[...activeSuoritukset].sort(
			(a, b) => new Date(b.suoritettu).getTime() - new Date(a.suoritettu).getTime()
		)
	);

	const filteredSuoritukset = $derived(
		selectedTehtava
			? sortedSuoritukset.filter((s) => s.tehtava_nimi === selectedTehtava)
			: sortedSuoritukset
	);

	function toggleFilter(tehtava: string) {
		selectedTehtava = selectedTehtava === tehtava ? null : tehtava;
	}
</script>

{#if completionsState.isLoading && activeSuoritukset.length === 0}
	<div class="p-4 text-center text-slate-400" transition:fade>Ladataan...</div>
{:else if completionsState.error && activeSuoritukset.length === 0}
	<div class="rounded-md bg-red-900/50 p-4 text-center text-red-200" transition:fade>
		<strong>Virhe:</strong>
		{completionsState.error}
	</div>
{:else if activeSuoritukset.length === 0}
	<div class="p-4 text-center text-slate-400" transition:fade>Ei suorituksia löydetty.</div>
{:else}
	<div
		class="max-w-full overflow-x-auto rounded-md bg-slate-800 p-1 shadow"
		in:fade={{ duration: 300 }}
	>
		<table class="w-full table-fixed border-collapse text-sm text-slate-200">
			<!-- thead -->
			<thead class="bg-slate-700 text-slate-100">
				<tr>
					<th class="w-[55%] min-w-[150px] px-3 py-2 text-left font-semibold">Tehtävä</th>
					<th class="w-[20%] px-3 py-2 text-left font-semibold">Suoritettu</th>
					<th class="w-[25%] px-3 py-2 text-left font-semibold">Merkinnyt</th>
				</tr>
			</thead>
			<!-- tbody -->
			<tbody>
				{#each filteredSuoritukset as suoritus (suoritus.id)}
					<tr
						class="border-b border-slate-600/50 last:border-b-0"
						in:fly={{ y: 10, duration: 200, delay: 20 }}
						out:fade={{ duration: 100 }}
					>
						<td
							class="cursor-pointer whitespace-normal break-words border-r border-slate-600/50 px-3 py-1.5 align-top transition-colors hover:bg-slate-700/40"
							onclick={() => toggleFilter(suoritus.tehtava_nimi)}
						>
							{suoritus.tehtava_nimi}
						</td>
						<td
							class="cursor-pointer border-r border-slate-600/50 px-3 py-1.5 align-top transition-colors hover:bg-slate-700/40"
							onclick={() => openEditDialog(suoritus)}
						>
							{new Date(suoritus.suoritettu).toLocaleDateString('fi-FI')}
						</td>
						<td
							class="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-1.5 align-top"
							title={suoritus.suorittaja}
						>
							{suoritus.suorittaja ?? 'Tuntematon'}
						</td>
					</tr>
				{:else}
					{#if selectedTehtava}
						<tr class="bg-slate-750">
							<td colspan="3" class="px-3 py-4 text-center text-slate-400 italic">
								Ei suorituksia valitulla suodattimella.
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<SuoritusDialog customOpen={dialogOpen} suoritus={selectedSuoritus} />

<style>
	table {
		table-layout: fixed;
		border-collapse: collapse;
	}
</style>
