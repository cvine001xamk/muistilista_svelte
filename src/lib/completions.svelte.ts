/**
 * completions.svelte.ts — Offline-first store for task completion history.
 *
 * Backed by IndexedDB (Dexie) with optimistic updates, offline mutation queueing,
 * and Supabase synchronization.
 */

import { supabase } from '$lib/supabase';
import { db } from '$lib/db';
import { enqueueMutation, getPendingMutationIds, onSyncComplete } from '$lib/syncQueue';
import { connectivity } from '$lib/connectivity.svelte';
import { globalState } from '$lib/state.svelte';
import type { RealtimeChannel } from '@supabase/supabase-js';

class CompletionsState {
	suoritukset = $state<Suoritus[]>([]);
	initialized = $state(false);
	isLoading = $state(false);
	error = $state<string | null>(null);
	private realtimeChannel: RealtimeChannel | null = null;
	private unsubscribeSync: (() => void) | null = null;

	constructor() {
		this.unsubscribeSync = onSyncComplete(() => {
			this.fetchAndSyncFromSupabase();
		});
	}

	async init() {
		if (this.initialized) return;
		this.initialized = true;

		// 1. Load cached completions from IndexedDB immediately
		await this.loadFromIDB();

		// 2. Fetch fresh data from Supabase if online
		if (connectivity.isOnline) {
			await this.fetchAndSyncFromSupabase();
		}

		// 3. Setup real-time updates
		this.setupSubscription();
	}

	async loadFromIDB() {
		try {
			const cached = await db.suoritukset.orderBy('id').reverse().limit(100).toArray();
			if (cached.length > 0) {
				this.suoritukset = cached;
			}
		} catch (err) {
			console.error('[CompletionsState] Error loading from IDB:', err);
		}
	}

	async fetchAndSyncFromSupabase() {
		this.isLoading = true;
		try {
			const { data, error } = await supabase
				.from('suoritukset')
				.select('*')
				.order('id', { ascending: false })
				.limit(100);

			if (error) {
				console.error('[CompletionsState] Error fetching from Supabase:', error);
				return;
			}

			if (!data) return;

			const pendingIds = await getPendingMutationIds('suoritukset');

			await db.transaction('rw', db.suoritukset, async () => {
				for (const item of data) {
					if (!pendingIds.has(item.id)) {
						await db.suoritukset.put(item);
					}
				}
			});

			await this.loadFromIDB();
		} catch (err) {
			console.error('[CompletionsState] Unexpected fetch error:', err);
		} finally {
			this.isLoading = false;
		}
	}

	async updateSuoritus(suoritus: Suoritus, newDateISO: string): Promise<{ error: unknown }> {
		const updatedItem: Suoritus = {
			...suoritus,
			suoritettu: newDateISO
		};

		// 1. Optimistic update
		this.suoritukset = this.suoritukset.map((s) => (s.id === suoritus.id ? updatedItem : s));

		// 2. Persist to IDB
		await db.suoritukset.put(updatedItem);

		// Trigger task remaining time re-fetch if needed
		globalState.fetchAndSyncFromSupabase();

		if (connectivity.isOnline) {
			const { error } = await supabase
				.from('suoritukset')
				.update({ suoritettu: newDateISO })
				.eq('id', suoritus.id);

			if (error) {
				console.error('[CompletionsState] Error updating suoritus, queueing:', error);
				await enqueueMutation('suoritukset', 'UPDATE', { suoritettu: newDateISO }, suoritus.id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('suoritukset', 'UPDATE', { suoritettu: newDateISO }, suoritus.id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async deleteSuoritus(id: number): Promise<{ error: unknown }> {
		// 1. Optimistic delete
		this.suoritukset = this.suoritukset.filter((s) => s.id !== id);

		// 2. Remove from IDB
		await db.suoritukset.delete(id);

		// Refresh tasks
		globalState.fetchAndSyncFromSupabase();

		if (connectivity.isOnline) {
			const { error } = await supabase.from('suoritukset').delete().eq('id', id);

			if (error) {
				console.error('[CompletionsState] Error deleting suoritus, queueing:', error);
				await enqueueMutation('suoritukset', 'DELETE', undefined, id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('suoritukset', 'DELETE', undefined, id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	private setupSubscription() {
		this.realtimeChannel = supabase
			.channel('suoritukset-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'suoritukset'
				},
				async (payload) => {
					const pendingIds = await getPendingMutationIds('suoritukset');

					switch (payload.eventType) {
						case 'INSERT': {
							const newItem = payload.new as Suoritus;
							if (!this.suoritukset.some((s) => s.id === newItem.id)) {
								this.suoritukset = [newItem, ...this.suoritukset];
								await db.suoritukset.put(newItem);
							}
							break;
						}
						case 'UPDATE': {
							const updatedItem = payload.new as Suoritus;
							if (pendingIds.has(updatedItem.id)) return;
							this.suoritukset = this.suoritukset.map((s) =>
								s.id === updatedItem.id ? updatedItem : s
							);
							await db.suoritukset.put(updatedItem);
							break;
						}
						case 'DELETE': {
							const oldId = payload.old.id;
							if (pendingIds.has(oldId)) return;
							this.suoritukset = this.suoritukset.filter((s) => s.id !== oldId);
							await db.suoritukset.delete(oldId);
							break;
						}
					}
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error('[CompletionsState] Realtime subscription error:', err);
				}
			});
	}

	cleanup() {
		if (this.realtimeChannel) {
			supabase.removeChannel(this.realtimeChannel);
		}
		if (this.unsubscribeSync) {
			this.unsubscribeSync();
		}
	}
}

export const completionsState = new CompletionsState();

