<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { createDialog, melt } from '@melt-ui/svelte';
	import { fade } from 'svelte/transition';
	import PenIcon from '../lib/icons/SquarePenIcon.svelte';
	import type { Writable } from 'svelte/store';

	let { tehtava, customOpen }: { tehtava: Tehtava; customOpen: Writable<boolean> } = $props();

	let updatedValues = $state({
		nimi: tehtava.nimi,
		suoritusvali: tehtava.suoritusvali,
		kertasuoritus: tehtava.kertasuoritus
	});

	let editing: boolean = $state(false);
	let confirmSuorita: boolean = $state(false);
	let confirmPoista: boolean = $state(false);
	let resetSuoritaTimeout: any;
	let resetPoistaTimeout: any;

	const {
		elements: { portalled, overlay, content, title, description, close },
		states: { open }
	} = createDialog({
		open: customOpen
	});

	async function handleSubmit(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		const { error } = await supabase.from('tehtavat').update(updatedValues).eq('id', tehtava.id);

		if (error) {
			console.error('Error updating tehtava:', error);
			return;
		}

		open.set(false);
	}

	async function suorita(): Promise<void> {
		if (!confirmSuorita) {
			confirmSuorita = true;
			resetSuoritaTimeout = setTimeout(() => (confirmSuorita = false), 3000);
			return;
		}

		clearTimeout(resetSuoritaTimeout);

		const { error } = await supabase.from('suoritukset').insert({
			tehtava_id: tehtava.id,
			suoritettu: new Date().toISOString(),
			suorittaja: 'Tuntematon',
			tehtava_nimi: tehtava.nimi
		});

		if (error) {
			return;
		}

		if (tehtava.kertasuoritus) {
			poista(tehtava.id, true);
		}

		open.set(false);
	}

	async function poista(id: number, bypassCofirm: boolean = false): Promise<void> {
		if (!confirmPoista && !bypassCofirm) {
			confirmPoista = true;
			resetPoistaTimeout = setTimeout(() => (confirmPoista = false), 3000);
			return;
		}
		clearTimeout(resetPoistaTimeout);

		const { error } = await supabase.from('tehtavat').delete().eq('id', id);

		if (error) {
			console.error('Error deleting tehtava:', error);
			return;
		}

		open.set(false);
	}
</script>

{#if $open}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
			<div
				use:melt={$content}
				in:fade
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
							<label for="suoritusvali" class="mb-2 mt-4 block text-sm font-medium text-gray-700"
								>Suoritusväli:</label
							>
							<input
								id="suoritusvali"
								type="number"
								class="w-full rounded-md border p-2"
								bind:value={updatedValues.suoritusvali}
							/>
							<span class="mt-4 flex flex-row gap-2">
								<label for="kertasuoritus" class="mb-2 block text-sm font-medium text-gray-700"
									>Kertasuoritus:</label
								>
								<input
									id="kertasuoritus"
									type="checkbox"
									class="size-5 rounded-md border p-2"
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
					<h2 use:melt={$title} class="mb-2 text-2xl font-bold text-gray-800">{tehtava.nimi}</h2>
					<div class="flex flex-col gap-3">
						<button
							onclick={suorita}
							class="flex min-h-[52px] items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-md transition-all active:scale-[0.98]
							{confirmSuorita ? 'bg-gradient-to-r from-lime-500 to-lime-600 text-white' : 'bg-gradient-to-r from-lime-400 to-lime-500 text-gray-800'}"
						>
							{!confirmSuorita ? 'Suorita' : 'Vahvista suoritus?'}
						</button>
						<button
							onclick={() => poista(tehtava.id)}
							class="flex min-h-[52px] items-center justify-center rounded-xl px-6 py-3 text-base font-semibold shadow-md transition-all active:scale-[0.98]
							{!confirmPoista ? 'bg-gradient-to-r from-red-400 to-red-500 text-gray-800' : 'bg-gradient-to-r from-red-600 to-red-700 text-white'}"
						>
							{!confirmPoista ? 'Poista' : 'Vahvista poisto?'}
						</button>
						<button
							use:melt={$close}
							class="flex min-h-[52px] items-center justify-center rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-800 shadow-md transition-all hover:bg-gray-300 active:scale-[0.98]"
						>
							Sulje
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
