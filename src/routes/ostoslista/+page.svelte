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

	// --- Inline editing state ---
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editAmount = $state('');

	// --- Recent items (quick-add chips) ---
	const RECENT_KEY = 'ostoslista_recent_items';
	let recentItems = $state<string[]>([]);

	function loadRecentItems() {
		try {
			const raw = localStorage.getItem(RECENT_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					recentItems = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
					return;
				}
			}
			recentItems = [];
		} catch {
			recentItems = [];
		}
	}

	function recordRecentItem(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		const lower = trimmed.toLowerCase();
		const next = [trimmed, ...recentItems.filter((i) => i.toLowerCase() !== lower)].slice(0, 12);
		recentItems = next;
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(next));
		} catch {}
	}

	// --- Drag-to-reorder state ---
	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	let sortOrder = $state<string[]>([]);

	const SORT_KEY = 'ostoslista_sort_order';

	function loadSortOrder() {
		try {
			const raw = localStorage.getItem(SORT_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					sortOrder = parsed.map(String);
					return;
				}
			}
			sortOrder = [];
		} catch {
			sortOrder = [];
		}
	}

	function saveSortOrder(order: string[]) {
		try {
			localStorage.setItem(SORT_KEY, JSON.stringify(order));
		} catch {}
	}

	$effect(() => {
		loadSortOrder();
		loadRecentItems();
	});

	const allItems = $derived(
		ostoslistaState.items.length > 0 || ostoslistaState.initialized
			? ostoslistaState.items
			: (data.items ?? [])
	);

	const uncompletedItems = $derived(allItems.filter((item) => !item.completed));
	const completedItems = $derived(allItems.filter((item) => item.completed));

	const suggestedItems = $derived(
		recentItems
			.filter(
				(name) =>
					!uncompletedItems.some((item) => item.nimi.trim().toLowerCase() === name.toLowerCase())
			)
			.slice(0, 8)
	);

	// Auto-reset filter when completed items are cleared
	$effect(() => {
		if (filter === 'completed' && completedItems.length === 0) {
			filter = 'all';
		}
	});

	/**
	 * Uncompleted items sorted by the user's custom drag order.
	 * PURE DERIVATION: Never mutates state. Guarantees every uncompleted item is included.
	 */
	const sortedUncompleted = $derived.by(() => {
		if (sortOrder.length === 0) return uncompletedItems;

		const orderMap = new Map<string, number>();
		sortOrder.forEach((id, index) => {
			orderMap.set(String(id), index);
		});

		return [...uncompletedItems].sort((a, b) => {
			const idA = String(a.id);
			const idB = String(b.id);
			const indexA = orderMap.has(idA) ? orderMap.get(idA)! : -1;
			const indexB = orderMap.has(idB) ? orderMap.get(idB)! : -1;

			if (indexA !== -1 && indexB !== -1) {
				return indexA - indexB;
			}
			if (indexA === -1 && indexB !== -1) return -1;
			if (indexA !== -1 && indexB === -1) return 1;
			return 0;
		});
	});

	const displayedItems = $derived.by(() => {
		if (filter === 'active') return sortedUncompleted;
		if (filter === 'completed') return completedItems;
		return [...sortedUncompleted, ...completedItems];
	});

	function handleReorder(fromId: string | number, toId: string | number) {
		const sFrom = String(fromId);
		const sTo = String(toId);
		if (sFrom === sTo) return;

		const current = [...sortedUncompleted];
		const fromIndex = current.findIndex((i) => String(i.id) === sFrom);
		const toIndex = current.findIndex((i) => String(i.id) === sTo);
		if (fromIndex === -1 || toIndex === -1) return;

		const [moved] = current.splice(fromIndex, 1);
		current.splice(toIndex, 0, moved);

		const newOrder = current.map((i) => String(i.id));
		sortOrder = newOrder;
		saveSortOrder(newOrder);
	}

	// --- Desktop Drag handlers ---
	function onDragStart(e: DragEvent, id: string | number) {
		draggedId = String(id);
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(id));
		}
	}

	function onDragOver(e: DragEvent, id: string | number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const sId = String(id);
		if (sId !== draggedId) {
			dragOverId = sId;
		}
	}

	function onDrop(e: DragEvent, targetId: string | number) {
		e.preventDefault();
		if (draggedId) {
			handleReorder(draggedId, targetId);
		}
		draggedId = null;
		dragOverId = null;
	}

	function onDragEnd() {
		draggedId = null;
		dragOverId = null;
	}

	// --- Touch drag state ---
	let touchDragId = $state<string | null>(null);
	let touchOverId = $state<string | null>(null);
	let touchGhost = $state<{ x: number; y: number; label: string } | null>(null);

	function onTouchStart(e: TouchEvent, id: string | number, label: string) {
		touchDragId = String(id);
		const t = e.touches[0];
		touchGhost = { x: t.clientX, y: t.clientY, label };
	}

	function onTouchMove(e: TouchEvent) {
		if (!touchDragId) return;
		e.preventDefault();
		const t = e.touches[0];
		if (touchGhost) {
			touchGhost = { ...touchGhost, x: t.clientX, y: t.clientY };
		}
		const el = document.elementFromPoint(t.clientX, t.clientY);
		const li = el?.closest('[data-item-id]');
		const overId = li?.getAttribute('data-item-id') ?? null;
		touchOverId = overId && overId !== touchDragId ? overId : null;
	}

	function onTouchEnd() {
		if (touchDragId && touchOverId) {
			handleReorder(touchDragId, touchOverId);
		}
		touchDragId = null;
		touchOverId = null;
		touchGhost = null;
	}

	async function addItem(e: SubmitEvent) {
		e.preventDefault();
		const trimmedName = newItemName.trim();
		const trimmedAmount = newItemAmount.trim();
		if (!trimmedName || isSubmitting) return;

		const normalized = trimmedName.toLowerCase();
		const existing = allItems.find((item) => item.nimi.trim().toLowerCase() === normalized);
		if (existing) {
			isSubmitting = true;
			if (existing.completed) {
				await ostoslistaState.toggleCompleted(existing);
				toastState.show(`"${existing.nimi}" palautettu ostoslistalle`);
			} else {
				toastState.show(`"${existing.nimi}" on jo ostoslistalla`);
			}
			newItemName = '';
			newItemAmount = '';
			isSubmitting = false;
			nameInputRef?.focus();
			return;
		}

		isSubmitting = true;
		await ostoslistaState.addItem(trimmedName, trimmedAmount || undefined);
		recordRecentItem(trimmedName);
		newItemName = '';
		newItemAmount = '';
		isSubmitting = false;

		// Retain focus in the name input field for fast multi-item entry
		nameInputRef?.focus();
	}

	async function addQuickItem(name: string) {
		if (isSubmitting) return;
		const normalized = name.trim().toLowerCase();
		const existing = allItems.find((item) => item.nimi.trim().toLowerCase() === normalized);
		if (existing) {
			if (existing.completed) {
				await ostoslistaState.toggleCompleted(existing);
				toastState.show(`"${existing.nimi}" palautettu ostoslistalle`);
			}
			return;
		}
		await ostoslistaState.addItem(name);
		recordRecentItem(name);
	}

	function startEditing(item: Ostos) {
		if (item.completed) return;
		editingId = String(item.id);
		editName = item.nimi;
		editAmount = item.maara ?? '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editAmount = '';
	}

	async function saveEdit(item: Ostos) {
		const trimmedName = editName.trim();
		if (!trimmedName) {
			cancelEdit();
			return;
		}
		const trimmedAmount = editAmount.trim() || null;
		if (trimmedName !== item.nimi || trimmedAmount !== (item.maara ?? null)) {
			await ostoslistaState.updateItem({
				...item,
				nimi: trimmedName,
				maara: trimmedAmount
			});
			recordRecentItem(trimmedName);
		}
		cancelEdit();
	}

	async function removeItem(item: Ostos) {
		recordRecentItem(item.nimi);
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
		if (!item.completed) {
			recordRecentItem(item.nimi);
		}
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

<div class="mx-auto flex w-full max-w-md flex-col gap-5 md:max-w-xl">
	<!-- Header -->
	<header class="flex flex-col gap-1">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">Ostoslista</h1>
			{#if allItems.length > 0}
				<span
					class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md"
				>
					{uncompletedItems.length} ostettavaa
				</span>
			{/if}
		</div>
		<p class="text-sm text-white/70">Yhteinen ostoslista reaaliaikaisella synkronoinnilla.</p>
	</header>

	{#if ostoslistaState.error}
		<div
			class="rounded-xl border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-200 backdrop-blur-md"
		>
			{ostoslistaState.error}
		</div>
	{/if}

	<!-- Add Item Form -->
	<form
		onsubmit={addItem}
		class="relative flex items-center rounded-2xl border border-white/20 bg-white/15 p-1.5 shadow-lg backdrop-blur-md transition-all focus-within:border-white/40 focus-within:ring-2 focus-within:ring-pink-500/40"
	>
		<input
			bind:this={nameInputRef}
			type="text"
			bind:value={newItemName}
			placeholder="Lisää tuote..."
			class="min-w-0 flex-grow bg-transparent px-3 py-2.5 text-base text-white placeholder-white/50 focus:outline-none sm:px-4"
			disabled={isSubmitting}
			required
		/>

		<div class="mx-1 h-6 w-px flex-shrink-0 bg-white/20"></div>

		<input
			type="text"
			bind:value={newItemAmount}
			placeholder="Määrä"
			class="w-24 flex-shrink-0 bg-transparent px-2 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none sm:w-36 sm:px-3 sm:text-base"
			disabled={isSubmitting}
		/>

		<button
			type="submit"
			disabled={!newItemName.trim() || isSubmitting}
			class="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
			aria-label="Lisää tuote"
		>
			<PlusIcon class="size-5" />
			<span class="hidden sm:inline">Lisää</span>
		</button>
	</form>

	<!-- Quick-add chips for recent items -->
	{#if suggestedItems.length > 0}
		<div class="flex flex-wrap items-center gap-1.5" transition:fade={{ duration: 150 }}>
			<span class="mr-0.5 text-xs text-white/50">Viimeisimmät:</span>
			{#each suggestedItems as name (name)}
				<button
					type="button"
					onclick={() => addQuickItem(name)}
					class="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85 transition-all hover:border-white/30 hover:bg-white/20 active:scale-95"
				>
					+ {name}
				</button>
			{/each}
		</div>
	{/if}

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
					class="font-medium text-white/70 transition-colors hover:text-rose-300"
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
			class="my-4 flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-10 text-center backdrop-blur-md"
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
			class="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md"
		>
			<p class="text-sm text-white/70">Ei tuotteita valitulla suodatuksella.</p>
		</div>
	{:else}
		<!-- Touch ghost element -->
		{#if touchGhost}
			<div
				class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/40 bg-white/30 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-md"
				style="left:{touchGhost.x}px;top:{touchGhost.y}px"
			>
				{touchGhost.label}
			</div>
		{/if}

		<ul class="flex flex-col gap-2" ontouchmove={onTouchMove} ontouchend={onTouchEnd}>
			{#each displayedItems as item (item.id)}
				{@const strId = String(item.id)}
				{@const isDragging = draggedId === strId || touchDragId === strId}
				{@const isOver = dragOverId === strId || touchOverId === strId}
				{@const isDraggable = !item.completed}
				<li
					in:fly={{ y: 15, duration: 250 }}
					out:slide={{ duration: 200 }}
					animate:flip={{ duration: 250 }}
					data-item-id={strId}
					draggable={isDraggable}
					ondragstart={isDraggable ? (e) => onDragStart(e, strId) : undefined}
					ondragover={isDraggable ? (e) => onDragOver(e, strId) : undefined}
					ondrop={isDraggable ? (e) => onDrop(e, strId) : undefined}
					ondragend={onDragEnd}
					class="group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-md backdrop-blur-md transition-all
					{item.completed
						? 'border-white/5 bg-white/5 opacity-60'
						: 'border-white/15 bg-white/15 hover:border-white/25 hover:bg-white/20'}
					{isDragging ? 'scale-95 opacity-40' : ''}
					{isOver && !item.completed ? 'border-pink-400/60 bg-pink-500/15 shadow-pink-500/20' : ''}"
				>
					<!-- Drag handle (uncompleted items only) -->
					{#if !item.completed}
						<button
							type="button"
							class="-ml-1 flex-shrink-0 cursor-grab touch-none p-0.5 text-white/30 transition-colors hover:text-white/70 active:cursor-grabbing"
							aria-label="Järjestä vetämällä"
							ontouchstart={(e) => onTouchStart(e, strId, item.nimi)}
						>
							<svg class="size-5" viewBox="0 0 20 20" fill="currentColor">
								<circle cx="7" cy="5" r="1.5" />
								<circle cx="13" cy="5" r="1.5" />
								<circle cx="7" cy="10" r="1.5" />
								<circle cx="13" cy="10" r="1.5" />
								<circle cx="7" cy="15" r="1.5" />
								<circle cx="13" cy="15" r="1.5" />
							</svg>
						</button>
					{:else}
						<div class="-ml-1 w-5 flex-shrink-0"></div>
					{/if}

					<!-- Custom Checkbox -->
					<label class="flex cursor-pointer select-none items-center">
						<input
							type="checkbox"
							checked={item.completed}
							onchange={() => toggleCompleted(item)}
							class="sr-only"
						/>
						<div
							class="flex size-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all
							{item.completed
								? 'border-emerald-400 bg-emerald-500 text-white shadow-sm'
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
					</label>

					<!-- Item Label or Inline Editor -->
					{#if editingId === strId}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								saveEdit(item);
							}}
							class="flex min-w-0 flex-grow items-center gap-1.5"
						>
							<input
								type="text"
								bind:value={editName}
								onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
								class="min-w-0 flex-grow rounded-lg border border-white/30 bg-white/15 px-2.5 py-1 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
								placeholder="Tuote"
								required
							/>
							<input
								type="text"
								bind:value={editAmount}
								onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
								class="w-20 flex-shrink-0 rounded-lg border border-white/30 bg-white/15 px-2 py-1 text-xs text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
								placeholder="Määrä"
							/>
							<button
								type="submit"
								class="rounded-lg bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
							>
								OK
							</button>
							<button
								type="button"
								onclick={cancelEdit}
								class="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20"
							>
								✕
							</button>
						</form>
					{:else}
						<button
							type="button"
							onclick={() => startEditing(item)}
							class="flex min-w-0 flex-grow flex-wrap items-center gap-2 text-left {item.completed
								? 'cursor-default'
								: 'cursor-text'}"
						>
							<span
								class="text-base font-medium text-white transition-all
								{item.completed ? 'text-white/50 line-through' : 'text-white'}"
							>
								{item.nimi}
							</span>
							{#if item.maara}
								<span
									class="rounded-lg border border-white/10 bg-white/15 px-2 py-0.5 text-xs font-semibold text-white/90 backdrop-blur-sm
									{item.completed ? 'line-through opacity-50' : ''}"
								>
									{item.maara}
								</span>
							{/if}
						</button>
					{/if}

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => removeItem(item)}
						class="flex size-8 flex-shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-rose-500/20 hover:text-rose-300 active:scale-95"
						aria-label="Poista {item.nimi}"
					>
						<DeleteIcon class="size-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
