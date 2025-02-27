<script lang="ts">
	import { haeSuoritukset } from '$lib';
	import { fade } from 'svelte/transition';

	let suoritukset = $state<Suoritus[]>([]);
	let ladattu: boolean = $state(false);
	let selectedTehtava = $state<string | null>(null);

	const sortedSuoritukset = $derived(
		[...suoritukset].sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())
	);

	const filteredSuoritukset = $derived(
		selectedTehtava
			? sortedSuoritukset.filter((s) => s.tehtava_nimi === selectedTehtava)
			: sortedSuoritukset
	);

	haeSuoritukset().then((data) => {
		suoritukset = data;
		ladattu = true;
	});

	function toggleFilter(tehtava: string) {
		selectedTehtava = selectedTehtava === tehtava ? null : tehtava;
	}
</script>

{#if ladattu}
	<div class="max-w-full overflow-x-auto" in:fade>
		<table class="w-full table-fixed border-collapse border border-gray-300 text-sm">
			<thead class="bg-gray-600">
				<tr>
					<th class="w-[55%] min-w-[150px]">Tehtävä</th>
					<th class="w-[20%]">Suoritettu</th>
					<th class="w-[25%]">Merkinnyt</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredSuoritukset as suoritus}
					<tr>
						<td
							class="whitespace-normal break-words border border-gray-300 px-2 py-1"
							onclick={() => toggleFilter(suoritus.tehtava_nimi)}
						>
							{suoritus.tehtava_nimi}
						</td>
						<td class="border border-gray-300 px-2 py-1">
							{new Date(suoritus.suoritettu).toLocaleDateString('fi-FI')}
						</td>
						<td
							class="overflow-hidden text-ellipsis whitespace-nowrap border border-gray-300 px-2 py-1"
						>
							{suoritus.suorittaja}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
