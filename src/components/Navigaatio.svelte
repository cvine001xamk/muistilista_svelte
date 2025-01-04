<script>
	import SearchIcon from '../lib/icons/SearchIcon.svelte';
	import PlusIcon from '../lib/icons/PlusIcon.svelte';
	import SheetIcon from '../lib/icons/SheetIcon.svelte';
</script>

<div class="flex flex-row items-center justify-evenly gap-4 bg-sky-400 p-2">
	<a href="/">
		<h1 class="text-3xl">muistilista</h1>
	</a>
	<a href="/lisaa" class="btn btn-primary" aria-label="Lisää tehtävä">
		<PlusIcon />
	</a>
	<a href="/suoritukset" class="btn btn-primary" aria-label="Suoritukset">
		<SheetIcon />
	</a>
	<button class="btn btn-primary" aria-label="Suoritukset">
		<SearchIcon />
	</button>
</div>
