<script lang="ts">
	import '../app.css';
	import Navigaatio from '../components/Navigaatio.svelte';
	import Otsikko from '../components/Otsikko.svelte';

	let { children } = $props();
</script>

<div class="mx-auto flex min-h-screen flex-col items-center gap-4 bg-pink-800 p-8 text-white">
	<Otsikko />

	{@render children()}

	<Navigaatio />
</div>
