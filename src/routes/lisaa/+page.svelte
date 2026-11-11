<script lang="ts">
	import { goto } from '$app/navigation';
	import { globalState } from '$lib/state.svelte';
	import { fade } from 'svelte/transition';

	let nimi = $state('');
	let kertasuoritus = $state(false);
	let suoritusvali = $state(1);
	let error = $state<string | null>(null);
	let isBusy = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isBusy) return;
		error = null;

		if (!nimi.trim()) {
			error = 'Tehtävän nimi on pakollinen.';
			return;
		}

		if (suoritusvali < 1) {
			error = 'Suoritusvälin on oltava vähintään 1 päivä.';
			return;
		}

		isBusy = true;

		const { error: err } = await globalState.addTehtava({ nimi, kertasuoritus, suoritusvali });

		isBusy = false;
		if (err) {
			error = 'Virhe tehtävän lisäämisessä. Yritä uudelleen.';
		} else {
			nimi = '';
			kertasuoritus = false;
			suoritusvali = 1;
			goto('/');
		}
	}
</script>

<div class="flex justify-center" in:fade>
	<form onsubmit={handleSubmit} class="w-full gap-4">
		{#if error}
			<div class="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
				{error}
			</div>
		{/if}

		<div class="flex flex-col justify-center gap-4 rounded-lg bg-slate-200 p-4">
			<label for="nimi" class="text-lg text-slate-900">Tehtävän nimi:</label>

			<input
				id="nimi"
				bind:value={nimi}
				type="text"
				class="border-2 border-zinc-700 p-2 text-slate-900"
				placeholder="Nimi"
				required
			/>
			<span class="flex flex-row items-center gap-4">
				<label for="kertasuoritus" class="text-lg text-slate-900">Kertasuoritus:</label>

				<input
					id="kertasuoritus"
					bind:checked={kertasuoritus}
					type="checkbox"
					class="size-5 border-2 border-zinc-700 p-2"
				/>
			</span>
			<label for="suoritusvali" class="text-lg text-slate-900">Suoritusväli päivinä:</label>

			<input
				id="suoritusvali"
				bind:value={suoritusvali}
				type="number"
				min="1"
				class="border-2 border-zinc-700 p-2 text-slate-900"
				required
			/>

			<button
				type="submit"
				disabled={isBusy}
				class="btn mt-4 w-full rounded-sm border-slate-400 bg-sky-600 p-2 text-white hover:bg-sky-400 disabled:opacity-60"
				>{isBusy ? 'Lisätään…' : 'Lisää'}</button
			>
		</div>
	</form>
</div>
