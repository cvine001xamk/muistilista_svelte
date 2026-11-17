<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import PlusIcon from '$lib/icons/PlusIcon.svelte';
	import ShoppingIcon from '$lib/icons/ShoppingIcon.svelte';
	import { ostoslistaState } from '$lib/ostoslista.svelte';
	import { toastState } from '$lib/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		ostoslistaState.init();
	});

	let newItemName = $state('');
	let newItemAmount = $state('');
	let isSubmitting = $state(false);
	let filter = $state<'all' | 'active' | 'completed'>('all');
	let nameInputRef = $state<HTMLInputElement | null>(null);

	const allItems = $derived(
		ostoslistaState.items.length > 0 || ostoslistaState.initialized
			? ostoslistaState.items
			: (data.items ?? [])
	);

	const uncompletedItems = $derived(allItems.filter((item) => !item.completed));
	const completedItems = $derived(allItems.filter((item) => item.completed));

	const displayedItems = $derived.by(() => {
		if (filter === 'active') return uncompletedItems;
		if (filter === 'completed') return completedItems;
		// In 'all' view, show uncompleted items first, completed items at the end
		return [...uncompletedItems, ...completedItems];
	});

	async function addItem(e: SubmitEvent) {
		e.preventDefault();
		const trimmedName = newItemName.trim();
		const trimmedAmount = newItemAmount.trim();
		if (!trimmedName || isSubmitting) return;

		isSubmitting = true;
		await ostoslistaState.addItem(trimmedName, trimmedAmount || undefined);
		newItemName = '';
		newItemAmount = '';
		isSubmitting = false;

		// Retain focus in the name input field for fast multi-item entry
		nameInputRef?.focus();
	}

	async function removeItem(item: Ostos) {
		await ostoslistaState.removeItem(item.id);

		// Non-blocking Undo notification
		toastState.show(`"${item.nimi}" poistettu listalta`, {
			actionLabel: 'Kumoa',
			onAction: async () => {
				await ostoslistaState.addItem(item.nimi, item.maara || undefined);
				nameInputRef?.focus();
			}
		});
	}

	async function toggleCompleted(item: Ostos) {
		await ostoslistaState.toggleCompleted(item);
	}

	async function handleClearCompleted() {
		const count = completedItems.length;
		if (count === 0) return;

		const backup = [...completedItems];
		await ostoslistaState.clearCompleted();

		toastState.show(`${count} ostettua tuotetta poistettu`, {
			actionLabel: 'Kumoa',
			onAction: async () => {
				for (const item of backup) {
					await ostoslistaState.addItem(item.nimi, item.maara || undefined);
				}
				nameInputRef?.focus();
			}
		});
	}
</script>

<div class="mx-auto flex w-full max-w-md flex-col gap-5 md:max-w-xl" in:fade>
	<!-- Header -->
	<header class="flex flex-col gap-1">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">Ostoslista</h1>
			{#if allItems.length > 0}
				<span class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
					{uncompletedItems.length} ostettavaa
				</span>
			{/if}
		</div>
		<p class="text-sm text-white/70">Yhteinen ostoslista reaaliaikaisella synkronoinnilla.</p>
	</header>

	{#if ostoslistaState.error}
		<div class="rounded-xl bg-red-500/20 p-3 text-sm text-red-200 backdrop-blur-md border border-red-500/30">
			{ostoslistaState.error}
		</div>
	{/if}

	<!-- Add Item Form -->
	<form
		onsubmit={addItem}
		class="relative flex items-center rounded-2xl bg-white/15 p-1.5 shadow-lg backdrop-blur-md border border-white/20 transition-all focus-within:border-white/40 focus-within:ring-2 focus-within:ring-pink-500/40"
	>
		<input
			bind:this={nameInputRef}
			type="text"
			bind:value={newItemName}
			placeholder="Lisää tuote... (esim. Maito)"
			class="min-w-0 flex-grow bg-transparent px-3 sm:px-4 py-2.5 text-base text-white placeholder-white/50 focus:outline-none"
			disabled={isSubmitting}
			required
		/>

		<div class="h-6 w-px bg-white/20 flex-shrink-0 mx-1"></div>

		<input
			type="text"
			bind:value={newItemAmount}
			placeholder="Määrä (esim. 2 kpl)"
			class="w-24 sm:w-36 bg-transparent px-2 sm:px-3 py-2.5 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none flex-shrink-0"
			disabled={isSubmitting}
		/>

		<button
			type="submit"
			disabled={!newItemName.trim() || isSubmitting}
			class="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-3.5 sm:px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
			aria-label="Lisää tuote"
		>
			<PlusIcon class="size-5" />
			<span class="hidden sm:inline">Lisää</span>
		</button>
	</form>

	<!-- Filter pills & Clear completed -->
	{#if allItems.length > 0}
		<div class="flex items-center justify-between gap-2 text-xs">
			<div class="flex items-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-md">
				<button
					type="button"
					onclick={() => (filter = 'all')}
					class="rounded-lg px-2.5 py-1 font-medium transition-all {filter === 'all'
						? 'bg-white/25 text-white shadow-sm'
						: 'text-white/60 hover:text-white'}"
				>
					Kaikki ({allItems.length})
				</button>
				<button
					type="button"
					onclick={() => (filter = 'active')}
					class="rounded-lg px-2.5 py-1 font-medium transition-all {filter === 'active'
						? 'bg-white/25 text-white shadow-sm'
						: 'text-white/60 hover:text-white'}"
				>
					Ostamatta ({uncompletedItems.length})
				</button>
				{#if completedItems.length > 0}
					<button
						type="button"
						onclick={() => (filter = 'completed')}
						class="rounded-lg px-2.5 py-1 font-medium transition-all {filter === 'completed'
							? 'bg-white/25 text-white shadow-sm'
							: 'text-white/60 hover:text-white'}"
					>
						Ostetut ({completedItems.length})
					</button>
				{/if}
			</div>

			{#if completedItems.length > 0}
				<button
					type="button"
					onclick={handleClearCompleted}
					class="text-white/70 hover:text-rose-300 font-medium transition-colors"
				>
					Poista ostetut
				</button>
			{/if}
		</div>
	{/if}

	<!-- Items List -->
	{#if allItems.length === 0}
		<!-- Empty State -->
		<div
			in:fade
			class="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-10 text-center backdrop-blur-md border border-white/15 my-4"
		>
			<div class="mb-3 rounded-full bg-white/15 p-4 text-white">
				<ShoppingIcon class="size-8" />
			</div>
			<h3 class="text-xl font-bold text-white">Ostoslista on tyhjä</h3>
			<p class="mt-1 max-w-xs text-sm text-white/70">
				Kirjoita tuotteen nimi yllä olevaan kenttään lisätäksesi sen yhteiselle listalle.
			</p>
		</div>
	{:else if displayedItems.length === 0}
		<div
			in:fade
			class="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-8 text-center backdrop-blur-md border border-white/15"
		>
			<p class="text-sm text-white/70">Ei tuotteita valitulla suodatuksella.</p>
		</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each displayedItems as item (item.id)}
				<li
					in:fly={{ y: 15, duration: 250 }}
					out:slide={{ duration: 200 }}
					animate:flip={{ duration: 250 }}
					class="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-md backdrop-blur-md transition-all border
					{item.completed
						? 'bg-white/5 border-white/5 opacity-60'
						: 'bg-white/15 border-white/15 hover:bg-white/20 hover:border-white/25'}"
				>
					<!-- Custom Checkbox & Label -->
					<label class="flex flex-grow items-center gap-3.5 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={item.completed}
							onchange={() => toggleCompleted(item)}
							class="sr-only"
						/>
						<div
							class="flex size-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all
							{item.completed
								? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
								: 'border-white/40 bg-white/10 group-hover:border-white/60'}"
						>
							{#if item.completed}
								<svg class="size-4" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>

						<div class="flex flex-wrap items-center gap-2">
							<span
								class="text-base font-medium transition-all text-white
								{item.completed ? 'line-through text-white/50' : 'text-white'}"
							>
								{item.nimi}
							</span>
							{#if item.maara}
								<span
									class="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-semibold text-white/90 backdrop-blur-sm border border-white/10
									{item.completed ? 'opacity-50 line-through' : ''}"
								>
									{item.maara}
								</span>
							{/if}
						</div>
					</label>

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => removeItem(item)}
						class="flex size-8 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 flex-shrink-0"
						aria-label="Poista {item.nimi}"
					>
						<DeleteIcon class="size-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
