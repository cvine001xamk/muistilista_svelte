<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import SquarePenIcon from '$lib/icons/SquarePenIcon.svelte';
	import { ostoslistaState } from '$lib/ostoslista.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		ostoslistaState.init();
	});

	let newItemName = $state('');
	let newItemPrice = $state<number | null>(null);
	let editingItemId = $state<string | null>(null);
	let isSubmitting = $state(false);

	const activeItems = $derived(
		ostoslistaState.items.length > 0 || ostoslistaState.initialized
			? ostoslistaState.items
			: (data.items ?? [])
	);

	const totalPrice = $derived(
		activeItems.filter((item) => !item.completed).reduce((sum, item) => sum + item.hinta, 0)
	);

	async function addItem(e: SubmitEvent) {
		e.preventDefault();
		if (newItemName.trim() && newItemPrice !== null && !isSubmitting) {
			isSubmitting = true;
			await ostoslistaState.addItem(newItemName.trim(), newItemPrice);
			newItemName = '';
			newItemPrice = null;
			isSubmitting = false;
		}
	}

	async function removeItem(id: string) {
		if (confirm('Haluatko varmasti poistaa tämän tuotteen?')) {
			await ostoslistaState.removeItem(id);
		}
	}

	async function toggleCompleted(item: Ostos) {
		await ostoslistaState.toggleCompleted(item);
	}

	async function updateItem(item: Ostos) {
		await ostoslistaState.updateItem(item);
		editingItemId = null;
	}

	function startEditing(item: Ostos) {
		editingItemId = item.id;
	}
</script>

<div class="mx-auto max-w-2xl p-4 sm:p-6">
	<header class="mb-8">
		<h1 class="text-4xl font-bold tracking-tight text-slate-800">Ostoslista</h1>
		<p class="text-slate-500">Lisää, muokkaa ja poista tuotteita listaltasi.</p>
	</header>

	{#if ostoslistaState.error}
		<div class="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
			{ostoslistaState.error}
		</div>
	{/if}

	<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
		<form onsubmit={addItem} class="flex flex-col gap-4 sm:flex-row">
			<input
				type="text"
				bind:value={newItemName}
				placeholder="Tuotteen nimi"
				class="flex-grow rounded-lg border border-gray-300 px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
				required
				disabled={isSubmitting}
			/>
			<input
				type="number"
				step="0.01"
				min="0"
				bind:value={newItemPrice}
				placeholder="Hinta (€)"
				class="w-full rounded-lg border border-gray-300 px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32"
				required
				disabled={isSubmitting}
			/>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Lisätään...' : 'Lisää'}
			</button>
		</form>
	</div>

	{#if activeItems.length === 0}
		<div class="text-center text-slate-500">
			<p>Ostoslistasi on tyhjä.</p>
			<p>Lisää ensimmäinen tuote yllä olevasta lomakkeesta.</p>
		</div>
	{:else}
		<ul class="space-y-4">
			{#each activeItems as item (item.id)}
				<li
					in:fly={{ y: 20, duration: 300 }}
					animate:flip={{ duration: 500 }}
					class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md"
				>
					<input
						type="checkbox"
						checked={item.completed}
						onchange={() => toggleCompleted(item)}
						class="size-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>

					{#if editingItemId === item.id}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								updateItem(item);
							}}
							class="flex flex-grow items-center gap-2"
						>
							<input
								type="text"
								bind:value={item.nimi}
								class="flex-grow rounded-md border border-gray-300 px-2 py-1 text-slate-800"
							/>
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={item.hinta}
								class="w-24 rounded-md border border-gray-300 px-2 py-1 text-slate-800"
							/>
							<button type="submit" class="text-green-500 hover:text-green-700">Tallenna</button>
							<button
								type="button"
								onclick={() => (editingItemId = null)}
								class="text-gray-500 hover:text-gray-700">Peruuta</button
							>
						</form>
					{:else}
						<div class="flex-grow">
							<span class:line-through={item.completed} class="text-lg text-slate-800"
								>{item.nimi}</span
							>
							<p class:line-through={item.completed} class="text-sm text-slate-500">
								{item.hinta.toFixed(2)} €
							</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => startEditing(item)}
								class="text-slate-500 hover:text-blue-600"
								aria-label="Muokkaa tuotetta"
							>
								<SquarePenIcon class="size-5" />
							</button>
							<button
								onclick={() => removeItem(item.id)}
								class="text-slate-500 hover:text-red-600"
								aria-label="Poista tuote"
							>
								<DeleteIcon class="size-5" />
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if activeItems.length > 0}
		<div class="mt-8 border-t border-gray-200 pt-6">
			<div class="flex justify-between text-xl font-bold text-slate-800">
				<span>Yhteensä (ostamatta):</span>
				<span>{totalPrice.toFixed(2)} €</span>
			</div>
		</div>
	{/if}
</div>
