<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { fi } from 'date-fns/locale';
	import { formatDistanceToNow } from 'date-fns';

	export let tehtava: Tehtava;

	let edellinenSuoritus: string | null = null;
	let aikaJaljella: string | null = null;
	let remainingTime: number | null = null;
	let loading = true;

	function calculateAikaJaljella(edellinenSuoritusDate: string | null): void {
		const now = new Date();
		const referenceDate = edellinenSuoritusDate
			? new Date(edellinenSuoritusDate)
			: new Date(tehtava.created_at);

		const diffInMs = now.getTime() - referenceDate.getTime();
		const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
		const remainingDays = tehtava.suoritusvali - diffInDays;

		remainingTime = remainingDays;

		if (remainingDays > 0) {
			const futureDate = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
			aikaJaljella = `${formatDistanceToNow(futureDate, { locale: fi })}`;
		} else {
			aikaJaljella = 'Suoritusaika on umpeutunut';
		}
	}

	async function haeEdellinenSuoritus() {
		const { data: suoritusData, error: suoritusError } = await supabase
			.from('suoritukset')
			.select('suoritettu')
			.eq('tehtava_id', tehtava.id)
			.order('suoritettu', { ascending: false })
			.limit(1);

		if (suoritusError) {
			console.error('Error fetching suoritus:', suoritusError);
			return;
		}

		const rawDate = suoritusData?.[0]?.suoritettu;
		edellinenSuoritus = rawDate ? new Date(rawDate).toLocaleDateString('fi-FI') : 'Ei suorituksia';

		calculateAikaJaljella(rawDate);
		loading = false;
	}

	function getColorClass(): string {
		if (remainingTime === null) return 'bg-gray-500';

		if (remainingTime <= 2) return 'bg-red-500';
		if (remainingTime <= 3) return 'bg-yellow-600';
		if (remainingTime <= 5) return 'bg-yellow-500';
		if (remainingTime <= 14) return 'bg-green-500';
		return 'bg-green-600';
	}

	onMount(() => {
		haeEdellinenSuoritus();
	});
</script>

<div class="mb-2 w-full rounded-md {getColorClass()} p-2">
	<div class="flex flex-row justify-between">
		<p class="text-xl">{tehtava.nimi}</p>
		<p>{tehtava.kertasuoritus}</p>
	</div>
	<div class="flex flex-row justify-between">
		<p>Edellinen suoritus: {loading ? 'Ladataan...' : edellinenSuoritus}</p>
		<p>Aikaa jäljellä: {loading ? 'Ladataan...' : aikaJaljella}</p>
		<p class="badge badge-outline badge-sm rounded bg-gray-400 p-2">
			{tehtava.suoritusvali}
		</p>
	</div>
</div>
