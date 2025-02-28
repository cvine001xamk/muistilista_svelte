<script lang="ts">
	import PlusIcon from '../lib/icons/PlusIcon.svelte';
	import SheetIcon from '../lib/icons/SheetIcon.svelte';
	import ShoppingIcon from '$lib/icons/ShoppingIcon.svelte';
	import FruitIcon from '$lib/icons/FruitIcon.svelte';
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
		<a href="/ostoslista" class="btn btn-primary" aria-label="Ostoslista">
			<ShoppingIcon />
		</a>
		<a href="/sesongissa" class="btn btn-primary" aria-label="Sesonkikalenteri">
			<FruitIcon />
		</a>
	</div>
</div>
