<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import SquarePenIcon from '$lib/icons/SquarePenIcon.svelte';

	type ShoppingItem = {
		id: string;
		nimi: string;
		hinta: number;
		completed: boolean;
	};

	let items = $state<ShoppingItem[]>([]);
	let newItemName = $state('');
	let newItemPrice = $state<number | null>(null);
	let editingItemId = $state<string | null>(null);

	const totalPrice = $derived(
		items.filter((item) => !item.completed).reduce((sum, item) => sum + item.hinta, 0)
	);

	async function fetchItems() {
		const { data, error } = await supabase
			.from('ostokset')
			.select('*')
			.order('created_at', { ascending: false });
		if (error) console.error('Error fetching items:', error);
		else items = data;
	}

	async function addItem() {
		if (newItemName && newItemPrice !== null) {
			const { data, error } = await supabase
				.from('ostokset')
				.insert([{ nimi: newItemName, hinta: newItemPrice, completed: false }])
				.select();
			if (error) console.error('Error adding item:', error);
			else {
				items = [data[0], ...items];
				newItemName = '';
				newItemPrice = null;
			}
		}
	}

	async function removeItem(id: string) {
		if (confirm('Haluatko varmasti poistaa tämän tuotteen?')) {
			const { error } = await supabase.from('ostokset').delete().eq('id', id);
			if (error) console.error('Error removing item:', error);
			else items = items.filter((item) => item.id !== id);
		}
	}

	async function toggleCompleted(item: ShoppingItem) {
		const { data, error } = await supabase
			.from('ostokset')
			.update({ completed: !item.completed })
			.eq('id', item.id)
			.select();
		if (error) console.error('Error updating item:', error);
		else {
			items = items.map((i) => (i.id === item.id ? data[0] : i));
		}
	}

	async function updateItem(item: ShoppingItem) {
		const { data, error } = await supabase
			.from('ostokset')
			.update({ nimi: item.nimi, hinta: item.hinta })
			.eq('id', item.id)
			.select();
		if (error) console.error('Error updating item:', error);
		else {
			items = items.map((i) => (i.id === item.id ? data[0] : i));
			editingItemId = null;
		}
	}

	function startEditing(item: ShoppingItem) {
		editingItemId = item.id;
	}

	$effect(() => {
		fetchItems();
	});
</script>

<div class="mx-auto max-w-2xl p-4 sm:p-6">
	<header class="mb-8">
		<h1 class="text-4xl font-bold tracking-tight text-slate-800">Ostoslista</h1>
		<p class="text-slate-500">Lisää, muokkaa ja poista tuotteita listaltasi.</p>
	</header>

	<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
		<form on:submit|preventDefault={addItem} class="flex flex-col gap-4 sm:flex-row">
			<input
				type="text"
				bind:value={newItemName}
				placeholder="Tuotteen nimi"
				class="flex-grow rounded-lg border border-gray-300 px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
				required
			/>
			<input
				type="number"
				step="0.01"
				bind:value={newItemPrice}
				placeholder="Hinta (€)"
				class="w-full rounded-lg border border-gray-300 px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32"
				required
			/>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Lisää
			</button>
		</form>
	</div>

	{#if items.length === 0}
		<div class="text-center text-slate-500">
			<p>Ostoslistasi on tyhjä.</p>
			<p>Lisää ensimmäinen tuote yllä olevasta lomakkeesta.</p>
		</div>
	{:else}
		<ul class="space-y-4">
			{#each items as item (item.id)}
				<li
					in:fly={{ y: 20, duration: 300 }}
					animate:flip={{ duration: 500 }}
					class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md"
				>
					<input
						type="checkbox"
						checked={item.completed}
						on:change={() => toggleCompleted(item)}
						class="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>

					{#if editingItemId === item.id}
						<form on:submit|preventDefault={() => updateItem(item)} class="flex flex-grow items-center gap-2">
							<input
								type="text"
								bind:value={item.nimi}
								class="flex-grow rounded-md border-gray-300 px-2 py-1 text-slate-800"
							/>
							<input
								type="number"
								step="0.01"
								bind:value={item.hinta}
								class="w-24 rounded-md border-gray-300 px-2 py-1 text-slate-800"
							/>
							<button type="submit" class="text-green-500 hover:text-green-700">Tallenna</button>
							<button type="button" on:click={() => (editingItemId = null)} class="text-gray-500 hover:text-gray-700">Peruuta</button>
						</form>
					{:else}
						<div class="flex-grow">
							<span class:line-through={item.completed} class="text-lg text-slate-800">{item.nimi}</span>
							<p class:line-through={item.completed} class="text-sm text-slate-500">{item.hinta.toFixed(2)} €</p>
						</div>
						<div class="flex items-center gap-2">
							<button on:click={() => startEditing(item)} class="text-slate-500 hover:text-blue-600">
								<SquarePenIcon class="h-5 w-5" />
							</button>
							<button on:click={() => removeItem(item.id)} class="text-slate-500 hover:text-red-600">
								<DeleteIcon class="h-5 w-5" />
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if items.length > 0}
		<div class="mt-8 border-t border-gray-200 pt-6">
			<div class="flex justify-between text-xl font-bold text-slate-800">
				<span>Yhteensä (ostamatta):</span>
				<span>{totalPrice.toFixed(2)} €</span>
			</div>
		</div>
	{/if}
</div>