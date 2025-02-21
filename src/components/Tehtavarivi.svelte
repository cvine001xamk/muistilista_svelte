<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { fi } from 'date-fns/locale';
	import { formatDistanceToNow } from 'date-fns';
	import OneIcon from '../lib/icons/MUIOneIcon.svelte';
	import PenIcon from '../lib/icons/SquarePenIcon.svelte';

	import { createDialog, melt } from '@melt-ui/svelte';
	import { fade } from 'svelte/transition';
	const {
		elements: { trigger, portalled, overlay, content, title, description, close },
		states: { open }
	} = createDialog();

	let { tehtava, haeJaJarjestaTehtavat }: { tehtava: Tehtava; haeJaJarjestaTehtavat: () => void } =
		$props();

	let updatedValues = $state({
		nimi: tehtava.nimi,
		suoritusvali: tehtava.suoritusvali,
		kertasuoritus: tehtava.kertasuoritus
	});

	let edellinenSuoritus = $state<string | null>(null);
	let aikaJaljella = $state<string | null>(null);
	let remainingTime = $state<number | null>(null);
	let loading = $state(true);
	let editing = $state(false);
	let suoritaClickCount: number = $state(0);
	let poistaClickCount: number = $state(0);

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

	async function suorita(): Promise<void> {
		const { error } = await supabase.from('suoritukset').insert({
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

		open.set(false);

		haeJaJarjestaTehtavat();
	}

	function handleSuoritaClick() {
		if (suoritaClickCount === 0) {
			suoritaClickCount++;
		} else {
			suorita();
		}
	}

	function handlePoistaClick() {
		if (poistaClickCount === 0) {
			poistaClickCount++;
		} else {
			poista();
		}
	}

	async function handleSubmit(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		const { error } = await supabase.from('tehtavat').update(updatedValues).eq('id', tehtava.id);

		if (error) {
			console.error('Error updating tehtava:', error);
			return;
		}

		open.set(false);
	}

	async function poista(): Promise<void> {
		const { error } = await supabase.from('tehtavat').delete().eq('id', tehtava.id);

		if (error) {
			console.error('Error deleting tehtava:', error);
			return;
		}

		open.set(false);
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

{#if $open}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
			<div
				use:melt={$content}
				transition:fade
				class="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2
					flex-col gap-4 rounded-xl bg-white
					p-6 shadow-lg"
			>
				<button
					aria-label="Muokkaa tehtävää"
					onclick={() => (editing = !editing)}
					class="flex justify-end {editing && 'text-sky-600'}"
				>
					<PenIcon />
				</button>
				{#if editing}
					<p class="text-base text-gray-700">Muokkaa tehtävää:</p>
					<div use:melt={$description}>
						<form onsubmit={handleSubmit} class="w-full gap-4">
							<label for="nimi" class="mb-2 block text-sm font-medium text-gray-700">Nimi:</label>
							<input
								id="nimi"
								type="text"
								class="w-full rounded-md border p-2"
								bind:value={updatedValues.nimi}
							/>
							<label for="suoritusvali" class="mb-2 block text-sm font-medium text-gray-700"
								>Suoritusväli:</label
							>
							<input
								id="suoritusvali"
								type="number"
								class="w-full rounded-md border p-2"
								bind:value={updatedValues.suoritusvali}
							/>
							<span class="flex flex-row items-center">
								<label for="kertasuoritus" class="mb-2 block text-sm font-medium text-gray-700"
									>Kertasuoritus:</label
								>
								<input
									id="kertasuoritus"
									type="checkbox"
									class="w-full rounded-md border p-2"
									bind:checked={updatedValues.kertasuoritus}
								/>
							</span>
							<button
								type="submit"
								class="btn mt-4 w-full rounded-sm border-slate-400 bg-sky-600 p-2 text-white hover:bg-sky-400"
							>
								Tallenna
							</button>
						</form>
					</div>
				{:else}
					<h2 use:melt={$title}>{tehtava.nimi}</h2>
					<button
						onclick={handleSuoritaClick}
						class="inline-flex h-8 items-center justify-center rounded-sm text-zinc-800
                    	{suoritaClickCount === 0 ? 'bg-lime-400' : 'bg-lime-600 text-zinc-50'} px-4"
					>
						{suoritaClickCount === 0 ? 'Suorita' : 'Vahvista suoritus?'}
					</button>
					<button
						onclick={handlePoistaClick}
						class="inline-flex h-8 items-center justify-center rounded-sm text-zinc-800
						{poistaClickCount === 0 ? 'bg-red-400' : 'bg-red-600 text-zinc-50'} px-4"
					>
						{poistaClickCount === 0 ? 'Poista' : 'Vahvista poisto?'}
					</button>
					<button
						use:melt={$close}
						class="inline-flex h-8 items-center justify-center rounded-sm
				bg-zinc-300 px-4 text-zinc-800"
					>
						Sulje
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
