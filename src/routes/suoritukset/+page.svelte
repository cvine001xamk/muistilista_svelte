<script lang="ts">
	import { haeSuoritukset } from '$lib';
	import { fade, fly } from 'svelte/transition';

	let suoritukset = $state<Suoritus[]>([]);
	let ladattu: boolean = $state(false);
	let isLoading = $state(true);
	let selectedTehtava = $state<string | null>(null);

	const sortedSuoritukset = $derived(
		[...suoritukset].sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())
	);

	const filteredSuoritukset = $derived(
		selectedTehtava
			? sortedSuoritukset.filter((s) => s.tehtava_nimi === selectedTehtava)
			: sortedSuoritukset
	);

	$effect(() => {
		isLoading = true;
		haeSuoritukset()
			.then((data) => {
				suoritukset = data;
				ladattu = true;
				isLoading = false;
			})
			.catch((error) => {
				console.error('Failed to fetch data:', error);
				isLoading = false;
			});
	});

	function toggleFilter(tehtava: string) {
		selectedTehtava = selectedTehtava === tehtava ? null : tehtava;
	}
</script>

{#if isLoading}
	<div class="p-4 text-center text-slate-400" transition:fade>Ladataan...</div>
{:else if ladattu}
	<div
		class="max-w-full overflow-x-auto rounded-md bg-slate-800 p-1 shadow"
		in:fade={{ duration: 300 }}
	>
		<table class="w-full table-fixed border-collapse text-sm text-slate-200">
			<thead class="bg-slate-700 text-slate-100">
				<tr>
					<th class="w-[55%] min-w-[150px] px-3 py-2 text-left font-semibold">Tehtävä</th>
					<th class="w-[20%] px-3 py-2 text-left font-semibold">Suoritettu</th>
					<th class="w-[25%] px-3 py-2 text-left font-semibold">Merkinnyt</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredSuoritukset as suoritus (suoritus.id)}
					<!-- Key needed for animations -->
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
						<td class="border-r border-slate-600/50 px-3 py-1.5 align-top">
							{new Date(suoritus.suoritettu).toLocaleDateString('fi-FI')}
						</td>
						<td
							class="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-1.5 align-top"
							title={suoritus.suorittaja}
						>
							{suoritus.suorittaja}
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
{:else if suoritukset.length === 0}
	<div class="p-4 text-center text-slate-400" transition:fade>Ei suorituksia löydetty.</div>
{/if}

<style>
	table {
		table-layout: fixed;
		border-collapse: collapse;
	}
</style>
