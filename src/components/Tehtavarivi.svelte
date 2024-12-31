<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { fi } from 'date-fns/locale';
	import { formatDistanceToNow } from 'date-fns';

	import { createDialog, melt } from '@melt-ui/svelte';
	const {
		elements: { trigger, portalled, overlay, content, title, description, close },
		states: { open }
	} = createDialog();

	export let tehtava: Tehtava;

	let edellinenSuoritus: string | null = null;
	let aikaJaljella: string | null = null;
	let remainingTime: number | null = null;
	let loading = true;
	let bgColor: string = 'bg-gray-500';

	$: {
		if (!loading && remainingTime !== null) {
			if (remainingTime <= 2) bgColor = 'bg-red-500';
			else if (remainingTime <= 3) bgColor = 'bg-yellow-600';
			else if (remainingTime <= 5) bgColor = 'bg-yellow-500';
			else if (remainingTime <= 14) bgColor = 'bg-green-500';
			else bgColor = 'bg-green-600';
		}
	}

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

	async function suorita(): Promise<void> {
		const { data, error } = await supabase.from('suoritukset').insert({
			tehtava_id: tehtava.id,
			suoritettu: new Date().toISOString(),
			suorittaja: 'Tuntematon',
			tehtava_nimi: tehtava.nimi
		});

		if (error) {
			console.error('Error inserting suoritus:', error);
			return;
		}

		edellinenSuoritus = new Date().toLocaleDateString('fi-FI');
		calculateAikaJaljella(edellinenSuoritus);

		if (tehtava.kertasuoritus) {
			poista();
		}
	}

	async function poista(): Promise<void> {
		const { error } = await supabase.from('tehtavat').delete().eq('id', tehtava.id);

		if (error) {
			console.error('Error deleting tehtava:', error);
			return;
		}

		open.set(false);
	}

	onMount(() => {
		haeEdellinenSuoritus();
	});
</script>

{#if loading}
	<span> Ladataan... </span>
{:else}
	<button
		use:melt={$trigger}
		class="mb-2 w-full rounded-md {bgColor} bg-opacity-85 p-2 drop-shadow-md"
	>
		<div class="flex flex-row justify-between">
			<p class="overflow-x-hidden text-base">{tehtava.nimi}</p>
			<p>{tehtava.kertasuoritus ? 'kerta' : null}</p>
		</div>
		<div class="flex flex-row justify-between">
			<div class="flex flex-col text-sm">
				<p>Edellinen suoritus: {loading ? 'Ladataan...' : edellinenSuoritus}</p>
				<p>Aikaa jäljellä: {loading ? 'Ladataan...' : aikaJaljella}</p>
			</div>
			<p class="badge badge-outline badge-sm rounded bg-gray-400 p-2">
				{tehtava.suoritusvali}
			</p>
		</div>
	</button>
{/if}

{#if $open}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
			<div
				use:melt={$content}
				class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw]
					max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white
					p-6 shadow-lg"
			>
				<h2 use:melt={$title}>{tehtava.nimi}</h2>
				<p use:melt={$description}>Juttua</p>
				<button
					on:click={suorita}
					class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100 px-4 text-zinc-600"
				>
					Suorita
				</button>
				<button
					on:click={poista}
					class="inline-flex h-8 items-center justify-center rounded-sm
				bg-zinc-100 px-4 text-zinc-600"
				>
					Poista
				</button>
				<button
					use:melt={$close}
					class="inline-flex h-8 items-center justify-center rounded-sm
				bg-zinc-100 px-4 text-zinc-600"
				>
					Sulje
				</button>
			</div>
		</div>
	</div>
{/if}
