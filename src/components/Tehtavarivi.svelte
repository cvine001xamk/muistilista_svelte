<script lang="ts">
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

	type EnrichedTehtava = Tehtava & {
		remainingTime: number;
		edellinenSuoritus: string | null;
	};

	let { tehtava }: { tehtava: EnrichedTehtava } = $props();

	let bgColor: string = $state('bg-green-600');
	let aikaJaljellaText: string = $state('');
	let edellinenSuoritusText: string = $state('');

	$effect(() => {
		if (tehtava.remainingTime <= 2) {
			bgColor = 'bg-red-500';
		} else if (tehtava.remainingTime <= 3) {
			bgColor = 'bg-yellow-600';
		} else if (tehtava.remainingTime <= 5) {
			bgColor = 'bg-yellow-500';
		} else if (tehtava.remainingTime <= 14) {
			bgColor = 'bg-green-500';
		} else {
			bgColor = 'bg-green-600';
		}

		if (tehtava.remainingTime > 0) {
			const futureDate = new Date(Date.now() + tehtava.remainingTime * 24 * 60 * 60 * 1000);
			aikaJaljellaText = formatDistanceToNow(futureDate, { locale: fi });
		} else {
			aikaJaljellaText = 'Suoritusaika on umpeutunut';
		}

		if (tehtava.edellinenSuoritus) {
			edellinenSuoritusText = new Date(tehtava.edellinenSuoritus).toLocaleDateString('fi-FI');
		} else {
			edellinenSuoritusText = 'Ei suorituksia';
		}
	});
</script>

<button
	use:melt={$trigger}
	class="mb-2 w-full rounded-md {bgColor} 'bg-green-600' bg-opacity-85 p-2 drop-shadow-md"
>
	<div class="flex flex-col">
		<div class="flex flex-row justify-between">
			<p class="overflow-x-hidden text-base">{tehtava.nimi}</p>
			{#if tehtava.kertasuoritus}
				<p><OneIcon /></p>
			{/if}
		</div>
		<div class="flex justify-start text-sm">
			Edellinen suoritus: {edellinenSuoritusText}
		</div>
		<div class="flex flex-row justify-between text-sm">
			<p>Aikaa jäljellä: {aikaJaljellaText}</p>
			<span class="me-2 rounded bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
				{tehtava.suoritusvali}
			</span>
		</div>
	</div>
</button>

<TehtavaDialog {customOpen} {tehtava} />
