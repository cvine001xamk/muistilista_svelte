import { supabase } from '$lib/supabase';
import { laskeJaljellaOlevaAika } from '$lib';
import type { RealtimeChannel } from '@supabase/supabase-js';

class GlobalState {
	tehtavat = $state<EnrichedTehtava[]>([]);
	tasksWithLessThanOneDay = $state(0);
	initialized = $state(false);
	private realtimeChannel: RealtimeChannel | null = null;

	constructor() {}

	async fetchTasks() {
		const { data: tehtavatData, error } = await supabase.rpc('get_tehtavat_with_latest_suoritus');

		if (error) {
			console.error('Error fetching data:', error);
		} else if (tehtavatData) {
			const enrichedTehtavat: EnrichedTehtava[] = tehtavatData.map((tehtava: any) => {
				const remainingTime = laskeJaljellaOlevaAika(tehtava, tehtava.edellinen_suoritus);
				return { ...tehtava, remainingTime, edellinenSuoritus: tehtava.edellinen_suoritus };
			});
			this.tehtavat = enrichedTehtavat;
			this.updateStateAndSort();
		}
	}

	async init() {
		if (this.initialized) return;

		await this.fetchTasks();

		this.setupSubscription();
		this.initialized = true;
	}

	private updateBadge(count: number) {
		if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
			if (count > 0) {
				navigator.setAppBadge(count).catch((err) => console.error('Failed to set app badge:', err));
			} else {
				navigator.clearAppBadge().catch((err) => console.error('Failed to clear app badge:', err));
			}
		}
	}

	private updateStateAndSort() {
		this.tasksWithLessThanOneDay = this.tehtavat.filter((t) => t.remainingTime < 1).length;
		this.tehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		this.tehtavat = [...this.tehtavat]; // Trigger reactivity
		this.updateBadge(this.tasksWithLessThanOneDay);
	}

	private setupSubscription() {
		this.realtimeChannel = supabase
			.channel('global-tehtavat-changes')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('New task received:', payload.new);
				const uusiTehtavaData = payload.new as Tehtava;
				const enrichedUusiTehtava: EnrichedTehtava = {
					...uusiTehtavaData,
					remainingTime: laskeJaljellaOlevaAika(uusiTehtavaData, null),
					edellinenSuoritus: null
				};
				this.tehtavat = [...this.tehtavat, enrichedUusiTehtava];
				this.updateStateAndSort();
			})
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'suoritukset' },
				(payload) => {
					console.log('New completion received via subscription!', payload.new);
					const uusiSuoritus = payload.new as { tehtava_id: number; suoritettu: string };
					const index = this.tehtavat.findIndex((t) => t.id === uusiSuoritus.tehtava_id);

					if (index !== -1) {
						const tehtava = this.tehtavat[index];

						// If this is a one-time task, remove it from the list
						if (tehtava.kertasuoritus) {
							console.log('Removing one-time task:', tehtava.nimi);
							this.tehtavat = this.tehtavat.filter((t) => t.id !== tehtava.id);
							this.updateStateAndSort();
						} else {
							// Otherwise, update the remaining time
							const updatedTehtavat = [...this.tehtavat];
							updatedTehtavat[index].remainingTime = laskeJaljellaOlevaAika(
								tehtava,
								uusiSuoritus.suoritettu
							);
							updatedTehtavat[index].edellinenSuoritus = uusiSuoritus.suoritettu;
							this.tehtavat = updatedTehtavat;
							this.updateStateAndSort();
						}
					}
				}
			)
			.on(
				'postgres_changes',
				{ event: 'DELETE', schema: 'public', table: 'suoritukset' },
				(payload) => {
					console.log('Suoritus deleted:', payload.old);
					this.fetchTasks();
				}
			)
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('Task updated:', payload.new);
				const updatedTehtavaData = payload.new as Tehtava;
				const index = this.tehtavat.findIndex((t) => t.id === updatedTehtavaData.id);

				if (index !== -1) {
					const updatedTehtavat = [...this.tehtavat];
					const existingTehtava = updatedTehtavat[index];
					updatedTehtavat[index] = {
						...updatedTehtavaData,
						remainingTime: laskeJaljellaOlevaAika(
							updatedTehtavaData,
							existingTehtava.edellinenSuoritus
						),
						edellinenSuoritus: existingTehtava.edellinenSuoritus
					};
					this.tehtavat = updatedTehtavat;
					this.updateStateAndSort();
				}
			})
			.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tehtavat' }, (payload) => {
				console.log('Task deleted:', payload.old);
				this.tehtavat = this.tehtavat.filter((t) => t.id !== payload.old.id);
				this.updateStateAndSort();
			})
			.subscribe();
	}

	cleanup() {
		if (this.realtimeChannel) {
			supabase.removeChannel(this.realtimeChannel);
		}
	}
}

export const globalState = new GlobalState();
