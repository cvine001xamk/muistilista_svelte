<script lang="ts">
	import { haeTehtavat } from '$lib';
	import Tehtavarivi from './Tehtavarivi.svelte';

	let tehtavat: Tehtava[] = [];

	haeTehtavat().then((data) => {
		tehtavat = data;
	});
</script>

<div class="flex flex-col items-center justify-center">
	{#each tehtavat as tehtava}
		<Tehtavarivi {tehtava} />
	{/each}
</div>
