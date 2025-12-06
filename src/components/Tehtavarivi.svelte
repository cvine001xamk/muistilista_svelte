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
			bgColor = 'bg-gradient-to-br from-red-500 to-red-600';
		} else if (tehtava.remainingTime <= 3) {
			bgColor = 'bg-gradient-to-br from-orange-500 to-orange-600';
		} else if (tehtava.remainingTime <= 5) {
			bgColor = 'bg-gradient-to-br from-yellow-500 to-yellow-600';
		} else if (tehtava.remainingTime <= 14) {
			bgColor = 'bg-gradient-to-br from-green-500 to-green-600';
		} else {
			bgColor = 'bg-gradient-to-br from-emerald-500 to-emerald-600';
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
	class="task-card mb-2 w-full rounded-2xl {bgColor} p-3 shadow-lg transition-all active:scale-[0.98]"
>
	<div class="flex flex-col gap-1">
		<div class="flex flex-row items-start justify-between">
			<p class="overflow-x-hidden text-left text-lg font-semibold text-white">
				{tehtava.nimi}
			</p>
			{#if tehtava.kertasuoritus}
				<div class="flex-shrink-0 rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
					<OneIcon />
				</div>
			{/if}
		</div>

		<div class="flex flex-col gap-1 text-sm text-white/90">
			<div class="flex items-center justify-start gap-2">
				<span class="opacity-80">Edellinen:</span>
				<span class="font-medium">{edellinenSuoritusText}</span>
			</div>

			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="opacity-80">Aikaa jäljellä:</span>
					<span class="font-medium">{aikaJaljellaText}</span>
				</div>
				<span
					class="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-800 shadow-sm"
				>
					{tehtava.suoritusvali}pv
				</span>
			</div>
		</div>
	</div>
</button>

<TehtavaDialog {customOpen} {tehtava} />

<style>
	.task-card {
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		min-height: 60px;
		position: relative;
		overflow: hidden;
	}

	.task-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
		pointer-events: none;
	}

	.task-card:active {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	@media (hover: hover) {
		.task-card:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
		}
	}
</style>
