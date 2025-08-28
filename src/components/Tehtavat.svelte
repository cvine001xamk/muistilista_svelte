<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';

	type EnrichedTehtava = Tehtava & {
		remainingTime: number;
		edellinenSuoritus: string | null;
	};

	let sortedTehtavat = $state<EnrichedTehtava[]>([]);
	let loading: boolean = $state(true);
	let tasksWithLessThanOneDay: number = $state(0);
	let searchTerm = $state<string>('');

	const filteredTehtavat = $derived(
		searchTerm.length > 1
			? sortedTehtavat.filter((tehtava) =>
					tehtava.nimi.toLowerCase().includes(searchTerm.toLowerCase())
				)
			: sortedTehtavat
	);

	function laskeJaljellaOlevaAika(tehtava: Tehtava, edellinenSuoritus: string | null): number {
		const now = new Date();
		const referenceDate = edellinenSuoritus
			? new Date(edellinenSuoritus)
			: new Date(tehtava.created_at);

		const diffInMs = now.getTime() - referenceDate.getTime();
		const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

		return tehtava.suoritusvali - diffInDays;
	}

	function updateBadge(count: number) {
		if ('setAppBadge' in navigator) {
			if (count > 0) {
				navigator.setAppBadge(count).catch((err) => console.error('Failed to set app badge:', err));
			} else {
				navigator.clearAppBadge().catch((err) => console.error('Failed to clear app badge:', err));
			}
		} else {
			console.warn('Badging API not supported in this browser.');
		}
	}

	async function initialLoad() {
		loading = true;
		const { data: tehtavatData, error } = await supabase.rpc('get_tehtavat_with_latest_suoritus');

		if (error || !tehtavatData || tehtavatData.length === 0) {
			if (error) console.error('Error fetching data:', error);
			sortedTehtavat = [];
			loading = false;
			updateBadge(0);
			return;
		}

		tasksWithLessThanOneDay = 0; // Reset counter for initial load
		const enrichedTehtavat: EnrichedTehtava[] = tehtavatData.map((tehtava) => {
			const remainingTime = laskeJaljellaOlevaAika(tehtava, tehtava.edellinen_suoritus);
			if (remainingTime < 1) {
				tasksWithLessThanOneDay++;
			}
			return { ...tehtava, remainingTime, edellinenSuoritus: tehtava.edellinen_suoritus };
		});

		sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		loading = false;
		updateBadge(tasksWithLessThanOneDay);
	}

	function updateStateAndSort() {
		tasksWithLessThanOneDay = sortedTehtavat.filter((t) => t.remainingTime < 1).length;
		sortedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		sortedTehtavat = sortedTehtavat; // Trigger Svelte reactivity
		updateBadge(tasksWithLessThanOneDay);
	}

	const realtimeChannel = supabase
		.channel('tehtavat-ja-suoritukset-changes')
		.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tehtavat' }, (payload) => {
			const uusiTehtavaData = payload.new as Tehtava;
			const enrichedUusiTehtava: EnrichedTehtava = {
				...uusiTehtavaData,
				remainingTime: laskeJaljellaOlevaAika(uusiTehtavaData, null),
				edellinenSuoritus: null
			};
			sortedTehtavat.push(enrichedUusiTehtava);
			updateStateAndSort();
		})
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'suoritukset' },
			(payload) => {
				console.log('New completion received via subscription!', payload.new);
				const uusiSuoritus = payload.new as { tehtava_id: number; suoritettu: string };
				const index = sortedTehtavat.findIndex((t) => t.id === uusiSuoritus.tehtava_id);

				if (index !== -1) {
					const tehtava = sortedTehtavat[index];
					tehtava.remainingTime = laskeJaljellaOlevaAika(tehtava, uusiSuoritus.suoritettu);
					tehtava.edellinenSuoritus = uusiSuoritus.suoritettu;
					updateStateAndSort();
				}
			}
		)
		.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tehtavat' }, (payload) => {
			sortedTehtavat = sortedTehtavat.filter((t) => t.id !== payload.old.id);
			updateStateAndSort();
		})
		.subscribe();

	$effect(() => {
		initialLoad();
		return () => {
			realtimeChannel.unsubscribe();
		};
	});
</script>

{#if loading}
	<div class="w-full space-y-3 md:max-w-3xl">
		<div
			class="mx-auto flex h-8 w-8 animate-spin rounded-full border-8 border-gray-300 border-t-blue-600"
		></div>
		{#each { length: 10 } as _}
			<div class="h-20 w-full animate-pulse rounded-lg bg-gray-700/50"></div>
		{/each}
	</div>
{:else}
	<div class="flex flex-col items-center justify-center md:max-w-3xl" in:fade>
		<div class="relative mb-4 w-full max-w-md">
			<input
				type="text"
				bind:value={searchTerm}
				placeholder="Etsi tehtävää..."
				class="w-full rounded-lg border border-gray-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			{#if searchTerm}
				<button
					onclick={() => (searchTerm = '')}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-700 hover:text-gray-700"
				>
					<DeleteIcon />
				</button>
			{/if}
		</div>

		{#each filteredTehtavat as tehtava (tehtava.id)}
			<Tehtavarivi {tehtava} />
		{/each}
	</div>
{/if}
