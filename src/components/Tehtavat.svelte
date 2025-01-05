<script lang="ts">
	import { haeTehtavat } from '$lib';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import Tehtavarivi from './Tehtavarivi.svelte';

	let sortedTehtavat: Tehtava[] = [];
	let loading: boolean = true;
	let tasksWithLessThanOneDay: number = 0;

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

		loading = false;

		updateBadge(tasksWithLessThanOneDay);

		if ('serviceWorker' in navigator && Notification.permission === 'granted') {
			navigator.serviceWorker.ready.then((registration) => {
				const notificationOptions = {
					body: `You have ${tasksWithLessThanOneDay} tasks pending!`,
					badge: '/path-to-badge-icon.png',
					icon: '/path-to-icon.png',
					tag: 'task-update',
					silent: true
				};

				registration.showNotification('Task Reminder', notificationOptions);
			});
		}
	}

	const tehtavatSubscription = supabase
		.channel('schema-db-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'tehtavat' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	const suorituksetSubscription = supabase
		.channel('schema-db-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'suoritukset' }, () => {
			haeJaJarjestaTehtavat();
		})
		.subscribe();

	onMount(() => {
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
	<div class="flex flex-col items-center justify-center">
		{#each sortedTehtavat as tehtava}
			<Tehtavarivi {tehtava} />
		{/each}
	</div>
{/if}
