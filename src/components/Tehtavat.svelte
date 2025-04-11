<script lang="ts">
	import { haeTehtavat } from '$lib';
	import { supabase } from '$lib/supabase';
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';

	let sortedTehtavat = $state<Tehtava[]>([]);
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

	async function haeJaJarjestaTehtavat() {
		loading = true;
		const tehtavatData = await haeTehtavat();

		if (!tehtavatData || tehtavatData.length === 0) {
			sortedTehtavat = [];
			loading = false;
			updateBadge(0);
			return;
		}

		const taskIds = tehtavatData.map((t) => t.id);

		const { data: latestSuorituksetData, error: suoritusError } = await supabase
			.from('suoritukset')
			.select('tehtava_id, suoritettu')
			.in('tehtava_id', taskIds)
			.order('suoritettu', { ascending: false });

		if (suoritusError) {
			console.error('Error fetching suoritukset:', suoritusError);
		}

		// Process in JS to find the latest for each task_id
		const latestSuoritusMap = new Map<string, string>();
		if (latestSuorituksetData) {
			latestSuorituksetData.sort(
				(a, b) => new Date(b.suoritettu).getTime() - new Date(a.suoritettu).getTime()
			);
			latestSuorituksetData.forEach((s) => {
				if (!latestSuoritusMap.has(s.tehtava_id)) {
					latestSuoritusMap.set(s.tehtava_id, s.suoritettu);
				}
			});
		}

		tasksWithLessThanOneDay = 0; // Reset counter

		const enrichedTehtavat = tehtavatData.map((tehtava) => {
			const edellinenSuoritus = latestSuoritusMap.get(tehtava.id) || null;
			const remainingTime = laskeJaljellaOlevaAika(tehtava, edellinenSuoritus);

			if (remainingTime < 1) {
				tasksWithLessThanOneDay++;
			}

			return {
				...tehtava,
				remainingTime
			};
		});

		sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);

		loading = false;

		updateBadge(tasksWithLessThanOneDay);
	}

	const tehtavatSubscription = supabase
		.channel('tehtavat-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'tehtavat' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	const suorituksetSubscription = supabase
		.channel('suoritukset-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'suoritukset' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	$effect(() => {
		haeJaJarjestaTehtavat();

		return () => {
			tehtavatSubscription.unsubscribe();
			suorituksetSubscription.unsubscribe();
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
			<Tehtavarivi {tehtava} {haeJaJarjestaTehtavat} />
		{/each}
	</div>
{/if}
