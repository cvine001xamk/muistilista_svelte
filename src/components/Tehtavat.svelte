<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';
	import DeleteIcon from '$lib/icons/DeleteIcon.svelte';
	import { laskeJaljellaOlevaAika } from '$lib';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	let { initialTehtavat }: { initialTehtavat: EnrichedTehtava[] } = $props();

	let sortedTehtavat = $state<EnrichedTehtava[]>(initialTehtavat);
	let tasksWithLessThanOneDay: number = $state(0);
	let searchTerm = $state<string>('');

	const filteredTehtavat = $derived(
		searchTerm.length > 1
			? sortedTehtavat.filter((tehtava) =>
					tehtava.nimi.toLowerCase().includes(searchTerm.toLowerCase())
				)
			: sortedTehtavat
	);

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

	function updateStateAndSort() {
		tasksWithLessThanOneDay = sortedTehtavat.filter((t) => t.remainingTime < 1).length;
		sortedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		sortedTehtavat = [...sortedTehtavat]; // Create new array to trigger reactivity
		updateBadge(tasksWithLessThanOneDay);
	}

	$effect(() => {
		// Initial badge update
		tasksWithLessThanOneDay = sortedTehtavat.filter((t) => t.remainingTime < 1).length;
		updateBadge(tasksWithLessThanOneDay);

		// Set up real-time subscriptions
		const realtimeChannel: RealtimeChannel = supabase
			.channel('tehtavat-ja-suoritukset-changes')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('New task received:', payload.new);
				const uusiTehtavaData = payload.new as Tehtava;
				const enrichedUusiTehtava: EnrichedTehtava = {
					...uusiTehtavaData,
					remainingTime: laskeJaljellaOlevaAika(uusiTehtavaData, null),
					edellinenSuoritus: null
				};
				sortedTehtavat = [...sortedTehtavat, enrichedUusiTehtava];
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
						
						// If this is a one-time task, remove it from the list
						if (tehtava.kertasuoritus) {
							console.log('Removing one-time task:', tehtava.nimi);
							sortedTehtavat = sortedTehtavat.filter((t) => t.id !== tehtava.id);
							updateStateAndSort();
						} else {
							// Otherwise, update the remaining time
							const updatedTehtavat = [...sortedTehtavat];
							updatedTehtavat[index].remainingTime = laskeJaljellaOlevaAika(tehtava, uusiSuoritus.suoritettu);
							updatedTehtavat[index].edellinenSuoritus = uusiSuoritus.suoritettu;
							sortedTehtavat = updatedTehtavat;
							updateStateAndSort();
						}
					}
				}
			)
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('Task updated:', payload.new);
				const updatedTehtavaData = payload.new as Tehtava;
				const index = sortedTehtavat.findIndex((t) => t.id === updatedTehtavaData.id);
				
				if (index !== -1) {
					const updatedTehtavat = [...sortedTehtavat];
					const existingTehtava = updatedTehtavat[index];
					updatedTehtavat[index] = {
						...updatedTehtavaData,
						remainingTime: laskeJaljellaOlevaAika(updatedTehtavaData, existingTehtava.edellinenSuoritus),
						edellinenSuoritus: existingTehtava.edellinenSuoritus
					};
					sortedTehtavat = updatedTehtavat;
					updateStateAndSort();
				}
			})
			.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('Task deleted:', payload.old);
				sortedTehtavat = sortedTehtavat.filter((t) => t.id !== payload.old.id);
				updateStateAndSort();
			})
			.subscribe();

		return () => {
			console.log('Cleaning up real-time subscription');
			supabase.removeChannel(realtimeChannel);
		};
	});
</script>

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
