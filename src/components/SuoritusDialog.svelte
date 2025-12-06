<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { createDialog, melt } from '@melt-ui/svelte';
	import { fade } from 'svelte/transition';
	import type { Writable } from 'svelte/store';

	let {
		suoritus,
		customOpen
	}: { suoritus: Suoritus | null; customOpen: Writable<boolean> } = $props();

	let updatedDate = $state('');
	let confirmPoista = $state(false);
	let resetPoistaTimeout: any;

	// Initialize date when dialog opens or suoritus changes
	$effect(() => {
		if (suoritus) {
			// Format date for datetime-local input (YYYY-MM-DDTHH:mm)
			const date = new Date(suoritus.suoritettu);
			// Adjust to local ISO string for input
			const offset = date.getTimezoneOffset() * 60000;
			updatedDate = new Date(date.getTime() - offset).toISOString().slice(0, 10);
		}
	});

	const {
		elements: { portalled, overlay, content, title, description, close },
		states: { open }
	} = createDialog({
		open: customOpen
	});

	async function handleSave() {
		if (!suoritus || !updatedDate) return;

		const { error } = await supabase
			.from('suoritukset')
			.update({ suoritettu: new Date(updatedDate).toISOString() })
			.eq('id', suoritus.id);

		if (error) {
			console.error('Error updating suoritus:', error);
			return;
		}

		open.set(false);
	}

	async function handlePoista() {
		if (!suoritus) return;

		if (!confirmPoista) {
			confirmPoista = true;
			resetPoistaTimeout = setTimeout(() => (confirmPoista = false), 3000);
			return;
		}
		clearTimeout(resetPoistaTimeout);

		const { error } = await supabase.from('suoritukset').delete().eq('id', suoritus.id);

		if (error) {
			console.error('Error deleting suoritus:', error);
			return;
		}

		open.set(false);
		confirmPoista = false;
	}
</script>

{#if $open && suoritus}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
			<div
				use:melt={$content}
				in:fade
				class="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2
					flex-col gap-4 rounded-xl bg-white
					p-6 shadow-lg"
			>
				<h2 use:melt={$title} class="mb-2 text-xl font-bold text-gray-800">
					Muokkaa suoritusta
				</h2>
				<p class="text-sm text-gray-600">Tehtävä: {suoritus.tehtava_nimi}</p>

				<div use:melt={$description} class="flex flex-col gap-4">
					<label class="flex flex-col gap-1">
						<span class="text-sm font-medium text-gray-700">Suorituspäivä:</span>
						<input
							type="date"
							bind:value={updatedDate}
							class="rounded-md border p-2 text-gray-800"
						/>
					</label>

					<div class="mt-4 flex flex-col gap-3">
						<button
							onclick={handleSave}
							class="flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-6 py-2 text-base font-semibold text-white shadow-md transition-all hover:bg-sky-500 active:scale-[0.98]"
						>
							Tallenna
						</button>

						<button
							onclick={handlePoista}
							class="flex min-h-[44px] items-center justify-center rounded-xl px-6 py-2 text-base font-semibold shadow-md transition-all active:scale-[0.98]
							{!confirmPoista
								? 'bg-red-100 text-red-700 hover:bg-red-200'
								: 'bg-red-600 text-white hover:bg-red-700'}"
						>
							{!confirmPoista ? 'Poista suoritus' : 'Vahvista poisto?'}
						</button>

						<button
							use:melt={$close}
							class="flex min-h-[44px] items-center justify-center rounded-xl bg-gray-100 px-6 py-2 text-base font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-200 active:scale-[0.98]"
						>
							Peruuta
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
