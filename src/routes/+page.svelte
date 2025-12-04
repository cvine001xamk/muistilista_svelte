<script lang="ts">
	import Tehtavat from '../components/Tehtavat.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Tehtavat initialTehtavat={data.tehtavat} />
