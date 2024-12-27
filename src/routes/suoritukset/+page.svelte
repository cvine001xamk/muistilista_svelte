<script lang="ts">
	import { haeSuoritukset } from '$lib';

	let suoritukset: Suoritus[] = [];

	haeSuoritukset().then((data) => {
		suoritukset = data;
	});
</script>

<table class="w-96 table-auto border-collapse border border-gray-300 text-sm">
	<thead class="bg-gray-600">
		<tr>
			<th>Tehtävä</th>
			<th>Suoritettu</th>
			<th>Merkinnyt</th>
		</tr>
	</thead>
	<tbody>
		{#each suoritukset as suoritus}
			<tr>
				<td class="border border-gray-300 px-4 py-1">
					{suoritus.tehtava_nimi}
				</td>
				<td class="border border-gray-300 px-4 py-1">
					{suoritus.suoritettu}
				</td>
				<td class="border border-gray-300 px-4 py-1">
					{suoritus.suorittaja}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
