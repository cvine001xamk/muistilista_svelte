<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { fi } from 'date-fns/locale';
	import { formatDistanceToNow } from 'date-fns';
	import OneIcon from '../lib/icons/MUIOneIcon.svelte';

	import { createDialog, melt } from '@melt-ui/svelte';
	import TehtavaDialog from './TehtavaDialog.svelte';
	import { writable } from 'svelte/store';

	const customOpen = writable(false);

	const {
		elements: { trigger }
	} = createDialog({ open: customOpen });

	let { tehtava, haeJaJarjestaTehtavat }: { tehtava: Tehtava; haeJaJarjestaTehtavat: () => void } =
		$props();

	let edellinenSuoritus = $state<string | null>(null);
	let aikaJaljella = $state<string | null>(null);
	let remainingTime = $state<number | null>(null);
	let loading: boolean = $state(true);

	let bgColor: string = $state('bg-gray-500');

	$effect(() => {
		if (loading || remainingTime === null) {
			bgColor = 'bg-gray-500';
			return;
		}

		switch (true) {
			case remainingTime <= 2:
				bgColor = 'bg-red-500';
				break;
			case remainingTime <= 3:
				bgColor = 'bg-yellow-600';
				break;
			case remainingTime <= 5:
				bgColor = 'bg-yellow-500';
				break;
			case remainingTime <= 14:
				bgColor = 'bg-green-500';
				break;
			default:
				bgColor = 'bg-green-600';
		}
	});

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

	async function haeEdellinenSuoritus(): Promise<void> {
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

	$effect(() => {
		haeEdellinenSuoritus();
	});
</script>

<button
	use:melt={$trigger}
	class="mb-2 w-full rounded-md {bgColor} bg-opacity-85 p-2 drop-shadow-md"
>
	<div class="flex flex-col">
		<div class="flex flex-row justify-between">
			<p class="overflow-x-hidden text-base">{tehtava.nimi}</p>
			<p>
				{#if tehtava.kertasuoritus}
					<OneIcon />
				{/if}
			</p>
		</div>
		<div class="flex justify-start text-sm">
			Edellinen suoritus: {loading ? 'Ladataan...' : edellinenSuoritus}
		</div>
		<div class="flex flex-row justify-between text-sm">
			<p>Aikaa jäljellä: {loading ? 'Ladataan...' : aikaJaljella}</p>
			<span class="me-2 rounded bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
				{tehtava.suoritusvali}
			</span>
		</div>
	</div>
</button>

<TehtavaDialog {customOpen} {tehtava} {haeJaJarjestaTehtavat} />
