<script lang="ts">
	import SearchIcon from '../lib/icons/SearchIcon.svelte';
	import PlusIcon from '../lib/icons/PlusIcon.svelte';
	import SheetIcon from '../lib/icons/SheetIcon.svelte';

	let searching: boolean = false;
	let hakusana: string = '';

	function toggleSearch() {
		// searching = !searching;
		// console.log(searching);
	}
</script>

<div class="bg-sky-400 p-2">
	<div class="flex flex-row items-center justify-evenly gap-4">
		<a href="/">
			<h1 class="text-3xl">muistilista</h1>
		</a>
		<a href="/lisaa" class="btn btn-primary" aria-label="Lisää tehtävä">
			<PlusIcon />
		</a>
		<a href="/suoritukset" class="btn btn-primary" aria-label="Suoritukset">
			<SheetIcon />
		</a>
		<button class="btn btn-primary" aria-label="Suoritukset" on:click={toggleSearch}>
			<SearchIcon />
		</button>
	</div>

	{#if searching}
		<div class="mx-auto mt-2 flex w-60 text-slate-900">
			<input type="text" class="w-full border" placeholder="Hae tehtäviä" />
		</div>
	{/if}
</div>
