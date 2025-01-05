<script lang="ts">
	import { haeTehtavat } from '$lib';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import Tehtavarivi from './Tehtavarivi.svelte';

	let sortedTehtavat: Tehtava[] = [];
	let loading: boolean = true;

	function laskeJaljellaOlevaAika(tehtava: Tehtava, edellinenSuoritus: string | null): number {
		const now = new Date();
		const referenceDate = edellinenSuoritus
			? new Date(edellinenSuoritus)
			: new Date(tehtava.created_at);

		const diffInMs = now.getTime() - referenceDate.getTime();
		const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

		return tehtava.suoritusvali - diffInDays;
	}

	async function haeJaJarjestaTehtavat() {
		const data = await haeTehtavat();

		const enrichedTehtavat = await Promise.all(
			data.map(async (tehtava) => {
				const { data: suoritusData } = await supabase
					.from('suoritukset')
					.select('suoritettu')
					.eq('tehtava_id', tehtava.id)
					.order('suoritettu', { ascending: false })
					.limit(1);

				const edellinenSuoritus = suoritusData?.[0]?.suoritettu || null;
				const remainingTime = laskeJaljellaOlevaAika(tehtava, edellinenSuoritus);

				return {
					...tehtava,
					remainingTime
				};
			})
		);

		sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		loading = false;
	}

	const tehtavatSubscription = supabase
		.channel('schema-db-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'tehtavat' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	const suorituksetSubscription = supabase
		.channel('schema-db-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'suoritukset' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	onMount(() => {
		haeJaJarjestaTehtavat();

		return () => {
			tehtavatSubscription.unsubscribe();
			suorituksetSubscription.unsubscribe();
		};
	});
</script>

{#if loading}
	<div class="flex h-96 items-center justify-center">
		<div
			class="flex h-16 w-16 animate-spin rounded-full border-8 border-gray-300 border-t-blue-600"
		></div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center">
		{#each sortedTehtavat as tehtava}
			<Tehtavarivi {tehtava} />
		{/each}
	</div>
{/if}
