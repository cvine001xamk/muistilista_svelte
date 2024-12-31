<script lang="ts">
	let nimi: string = '';
	let kertasuoritus: boolean = false;
	let suoritusvali: number = 0;

	async function handleSubmit() {
		console.log('Nimi:', nimi);
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="w-60 gap-4">
	<div class="flex w-60 flex-col justify-center gap-2">
		<label for="nimi" class="text-lg">Tehtävän nimi:</label>

		<input
			id="nimi"
			bind:value={nimi}
			type="text"
			class="border-2 border-zinc-700 p-2 text-slate-900"
			placeholder="Nimi"
			required
		/>
		<span class="flex flex-row items-center gap-4">
			<label for="kertasuoritus" class="text-lg">Kertasuoritus</label>

			<input
				id="kertasuoritus"
				bind:checked={kertasuoritus}
				type="checkbox"
				class="size-5 border-2 border-zinc-700 p-2"
				required
			/>
		</span>
		<label for="suoritusvali" class="text-lg">Suoritusväli päivinä:</label>

		<input
			id="suoritusvali"
			bind:value={suoritusvali}
			type="number"
			class="border-2 border-zinc-700 p-2 text-slate-900"
			required
		/>

		<button
			type="submit"
			class="btn mt-4 w-full rounded-sm border-slate-400 bg-sky-600 p-2 text-white hover:bg-sky-400"
			>Lisää
		</button>
	</div>
</form>
