<script lang="ts">
	import { haeTehtavat } from '$lib';
	import { supabase } from '$lib/supabase';
	import { fade } from 'svelte/transition';
	import Tehtavarivi from './Tehtavarivi.svelte';

	let sortedTehtavat = $state<Tehtava[]>([]);
	let loading: boolean = $state(true);
	let tasksWithLessThanOneDay: number = $state(0);

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
		const data = await haeTehtavat();

		tasksWithLessThanOneDay = 0;

		const enrichedTehtavat = await Promise.all(
			data.map(async (tehtava) => {
				const { data: suoritusData } = await supabase
					.from('suoritukset')
					.select('suoritettu')
					.eq('tehtava_id', tehtava.id)
					.order('suoritettu', { ascending: false })
					.limit(1);

				const edellinenSuoritus = suoritusData?.[0]?.suoritettu || null;
				const remainingTime = laskeJaljellaOlevaAika(tehtava, edellinenSuoritus);

				if (remainingTime < 1) {
					tasksWithLessThanOneDay++;
				}

				return {
					...tehtava,
					remainingTime
				};
			})
		);

		sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);

		setTimeout(() => {
			loading = false;
		}, 100);

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
	<div class="flex h-96 items-center justify-center">
		<div
			class="flex h-16 w-16 animate-spin rounded-full border-8 border-gray-300 border-t-blue-600"
		></div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center" in:fade>
		{#each sortedTehtavat as tehtava}
			<Tehtavarivi {tehtava} {haeJaJarjestaTehtavat} />
		{/each}
	</div>
{/if}
