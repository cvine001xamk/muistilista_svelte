<script lang="ts">
	import { haeSuoritukset } from '$lib';

	let suoritukset: Suoritus[] = [];

	$: sortedSuoritukset = [...suoritukset].sort(
		(a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()
	);

	haeSuoritukset().then((data) => {
		suoritukset = data;
	});
</script>

<table class="table-fixed border-collapse border border-gray-300 text-sm">
	<thead class="bg-gray-600">
		<tr>
			<th class="w-1/3">Tehtävä</th>
			<th>Suoritettu</th>
			<th>Merkinnyt</th>
		</tr>
	</thead>
	<tbody>
		{#each sortedSuoritukset as suoritus}
			<tr>
				<td class="border border-gray-300 px-4 py-1">
					{suoritus.tehtava_nimi}
				</td>
				<td class="border border-gray-300 px-4 py-1">
					{new Date(suoritus.suoritettu).toLocaleDateString('fi-FI')}
				</td>
				<td class="border border-gray-300 px-4 py-1">
					{suoritus.suorittaja}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
