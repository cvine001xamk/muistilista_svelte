<script lang="ts">
	import { supabase } from '$lib/supabase';

	type ShoppingItem = {
		id?: string;
		nimi: string;
		hinta: number;
	};

	// State for the list of items
	let items = $state<ShoppingItem[]>([]);

	// State for the new item input
	let newItemName = $state('');
	let newItemPrice = $state<number | null>(null);

	// Derived state for the total price
	const totalPrice = $derived(items.reduce((sum, item) => sum + item.hinta, 0));

	async function fetchItems() {
		const { data, error } = await supabase
			.from('ostokset')
			.select('*')
			.order('nimi', { ascending: true });

		if (error) {
			console.error('Error fetching items:', error);
		} else {
			items = data;
		}
	}

	async function addItem() {
		if (newItemName && newItemPrice !== null) {
			// Insert into Supabase
			const { data, error } = await supabase
				.from('ostokset')
				.insert([{ nimi: newItemName, hinta: newItemPrice }])
				.select();

			if (error) {
				console.error('Error adding item:', error);
			} else {
				// Add the new item to the local state
				items = [data[0], ...items];
				newItemName = ''; // Clear input
				newItemPrice = null; // Clear input
			}
		}
	}

	// Function to remove an item
	async function removeItem(id: string) {
		// Delete from Supabase
		const { error } = await supabase.from('ostokset').delete().eq('id', id);

		if (error) {
			console.error('Error removing item:', error);
		} else {
			// Remove the item from the local state
			items = items.filter((item) => item.id !== id);
		}
	}

	// Fetch items when the component mounts
	$effect(() => {
		fetchItems();
	});
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-4 shadow-lg">
	<h2 class="mb-4 text-2xl font-bold text-slate-500">Ostoslista</h2>

	<div class="mb-4">
		<input
			type="text"
			bind:value={newItemName}
			placeholder="Tuotteen nimi"
			class="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
		<input
			type="number"
			bind:value={newItemPrice}
			placeholder="Hinta (€)"
			class="w-full rounded-lg border border-gray-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
	</div>

	<button
		onclick={addItem}
		class="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
	>
		Lisää tuote
	</button>

	<div class="mt-6 overflow-x-auto">
		<table class="w-full">
			<thead>
				<tr class="border-b border-gray-200">
					<th class="px-2 py-2 text-left">Tuote</th>
					<th class="px-2 py-2 text-right">Hinta</th>
					<th class="px-2 py-2 text-right">Toiminnot</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item}
					<tr class="border-b border-gray-200">
						<td class="px-2 py-2 text-left text-slate-800">{item.nimi}</td>
						<td class="px-2 py-2 text-right text-slate-800">{item.hinta.toFixed(2)} €</td>
						<td class="px-2 py-2 text-right">
							<button onclick={() => removeItem(item.id!)} class="text-red-500 hover:text-red-700">
								Poista
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-4 border-t border-gray-200 pt-4">
		<div class="flex justify-between font-bold text-slate-800">
			<span>Yhteensä:</span>
			<span>{totalPrice.toFixed(2)} €</span>
		</div>
	</div>
</div>
