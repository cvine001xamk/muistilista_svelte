/**
 * state.svelte.ts — GlobalState singleton with offline-first IndexedDB backing
 * and conflict-safe Last-Write-Wins synchronization.
 *
 * Data flow:
 *  1. On init, load tasks from IndexedDB instantly (zero-latency offline view).
 *  2. Fetch fresh data from Supabase RPC if online; merge into IndexedDB + UI without
 *     overwriting pending local offline mutations (conflict resolution).
 *  3. Subscribe to Supabase Realtime for live updates (online only).
 *  4. All mutations go to IndexedDB immediately (optimistic), then to Supabase.
 *     If offline, the mutation is queued and replayed when connectivity returns.
 */

import { supabase } from '$lib/supabase';
import { laskeJaljellaOlevaAika } from '$lib';
import { db } from '$lib/db';
import { enqueueMutation, getPendingMutationIds, onSyncComplete } from '$lib/syncQueue';
import { connectivity } from '$lib/connectivity.svelte';
import type { RealtimeChannel } from '@supabase/supabase-js';

class GlobalState {
	tehtavat = $state<EnrichedTehtava[]>([]);
	tasksWithLessThanOneDay = $state(0);
	initialized = $state(false);
	/** True while the network fetch is in-flight */
	syncing = $state(false);
	notificationPermission = $state<NotificationPermission>('default');
	private realtimeChannel: RealtimeChannel | null = null;
	private unsubscribeSync: (() => void) | null = null;

	constructor() {
		if (typeof window !== 'undefined' && 'Notification' in window) {
			this.notificationPermission = Notification.permission;
		}

		// Re-fetch and sync whenever the sync queue flushes successfully
		this.unsubscribeSync = onSyncComplete(() => {
			this.fetchAndSyncFromSupabase();
		});
	}

	// ------------------------------------------------------------------
	// Init: load from IDB first, then sync from Supabase
	// ------------------------------------------------------------------
	async init() {
		if (this.initialized) return;
		this.initialized = true;

		// 1. Load cached tasks from IndexedDB immediately
		await this.loadFromIDB();

		// 2. Fetch fresh data from Supabase if online
		if (connectivity.isOnline) {
			await this.fetchAndSyncFromSupabase();
		}

		// 3. Set up Realtime subscription
		this.setupSubscription();
	}

	// ------------------------------------------------------------------
	// Load tasks from IndexedDB
	// ------------------------------------------------------------------
	async loadFromIDB() {
		try {
			const cached = await db.tehtavat.toArray();
			if (cached.length > 0) {
				const enriched = this.enrichTehtavat(cached);
				this.tehtavat = enriched;
				this.updateStateAndSort();
			}
		} catch (err) {
			console.error('[GlobalState] Failed to load from IndexedDB:', err);
		}
	}

	// ------------------------------------------------------------------
	// Fetch fresh data from Supabase and merge safely (Conflict Resolution)
	// ------------------------------------------------------------------
	async fetchAndSyncFromSupabase() {
		this.syncing = true;
		try {
			const { data: serverTasks, error } = await supabase.rpc('get_tehtavat_with_latest_suoritus');

			if (error) {
				console.error('[GlobalState] Error fetching from Supabase:', error);
				return;
			}

			if (!serverTasks) return;

			// Get set of IDs that have pending offline mutations
			const pendingIds = await getPendingMutationIds('tehtavat');

			// Merge strategy:
			// 1. Do NOT touch records with pending mutations (local changes have precedence)
			// 2. Insert or update server tasks that have no pending local edits
			// 3. Remove local tasks that are missing on the server unless they are pending creation
			const serverIds = new Set<number>();

			await db.transaction('rw', db.tehtavat, async () => {
				for (const serverTask of serverTasks) {
					serverIds.add(serverTask.id);

					// If user edited this task offline and it hasn't synced yet, preserve local version
					if (pendingIds.has(serverTask.id)) {
						continue;
					}

					const record: Tehtava = {
						id: serverTask.id,
						nimi: serverTask.nimi,
						suoritusvali: serverTask.suoritusvali,
						kertasuoritus: serverTask.kertasuoritus,
						created_at: serverTask.created_at,
						edellinen_suoritus: serverTask.edellinen_suoritus ?? null
					};

					await db.tehtavat.put(record);
				}

				// Check existing local records
				const currentLocal = await db.tehtavat.toArray();
				for (const localTask of currentLocal) {
					// If missing on server, only delete if not pending local creation or pending update
					if (!serverIds.has(localTask.id) && !pendingIds.has(localTask.id)) {
						await db.tehtavat.delete(localTask.id);
					}
				}
			});

			// Reload fresh merged state from IndexedDB
			await this.loadFromIDB();
		} catch (err) {
			console.error('[GlobalState] Unexpected error during sync:', err);
		} finally {
			this.syncing = false;
		}
	}

	// ------------------------------------------------------------------
	// Notifications
	// ------------------------------------------------------------------
	async requestNotificationPermission() {
		if (!('Notification' in window)) return;
		const permission = await Notification.requestPermission();
		this.notificationPermission = permission;
		if (permission === 'granted') {
			this.updateBadge(this.tasksWithLessThanOneDay);
		}
	}

	// ------------------------------------------------------------------
	// MUTATIONS — Optimistic UI + IndexedDB + Supabase (or queue)
	// ------------------------------------------------------------------

	/** Add a new task */
	async addTehtava(data: { nimi: string; suoritusvali: number; kertasuoritus: boolean }) {
		const tempId = Date.now(); // Temporary local ID
		const newTehtava: Tehtava = {
			id: tempId,
			created_at: new Date().toISOString(),
			...data
		};
		const enriched: EnrichedTehtava = {
			...newTehtava,
			remainingTime: laskeJaljellaOlevaAika(newTehtava, null),
			edellinenSuoritus: null
		};

		// 1. Optimistic: update UI immediately
		this.tehtavat = [...this.tehtavat, enriched];
		this.updateStateAndSort();

		// 2. Persist to IDB
		await db.tehtavat.put(newTehtava);

		if (connectivity.isOnline) {
			// 3a. Online: write to Supabase
			const { data: inserted, error } = await supabase
				.from('tehtavat')
				.insert(data)
				.select()
				.single();

			if (error) {
				console.error('[GlobalState] Error inserting tehtava, queueing:', error);
				// Queue mutation with tempId for later reconciliation
				await enqueueMutation('tehtavat', 'INSERT', data as any, undefined, tempId);
				await connectivity.refreshPendingCount();
				return { error: null }; // handled optimistically
			}

			// Replace temp entry with real server entry
			if (inserted) {
				await db.tehtavat.delete(tempId);
				await db.tehtavat.put(inserted as Tehtava);
				this.tehtavat = this.tehtavat.map((t) =>
					t.id === tempId
						? {
								...inserted,
								remainingTime: laskeJaljellaOlevaAika(inserted, null),
								edellinenSuoritus: null
							}
						: t
				);
				this.updateStateAndSort();
			}
			return { error: null };
		} else {
			// 3b. Offline: queue for later sync
			await enqueueMutation('tehtavat', 'INSERT', data as any, undefined, tempId);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	/** Mark a task as completed (suorita) */
	async suoritaTehtava(
		tehtava: Tehtava
	): Promise<{ error: unknown; suoritusId?: number; previousEdellinenSuoritus?: string | null }> {
		const now = new Date().toISOString();
		const currentEnriched = this.tehtavat.find((t) => t.id === tehtava.id);
		const previousEdellinenSuoritus = currentEnriched?.edellinenSuoritus ?? null;

		const suoritusData = {
			tehtava_id: tehtava.id,
			suoritettu: now,
			suorittaja: 'Tuntematon',
			tehtava_nimi: tehtava.nimi
		};

		// 1. Optimistic: update or remove task from UI
		if (tehtava.kertasuoritus) {
			this.tehtavat = this.tehtavat.filter((t) => t.id !== tehtava.id);
		} else {
			this.tehtavat = this.tehtavat.map((t) =>
				t.id === tehtava.id
					? {
							...t,
							remainingTime: laskeJaljellaOlevaAika(t, now),
							edellinenSuoritus: now
						}
					: t
			);
		}
		this.updateStateAndSort();

		// 2. Persist suoritus to IDB (temp local ID)
		const tempSuoritusId = Date.now();
		await db.suoritukset.put({ id: tempSuoritusId, ...suoritusData } as Suoritus);

		if (tehtava.kertasuoritus) {
			await db.tehtavat.delete(tehtava.id);
		} else {
			await db.tehtavat.update(tehtava.id, { edellinen_suoritus: now });
		}

		if (connectivity.isOnline) {
			// 3a. Online: write suoritus to Supabase
			const { data: insertedSuoritus, error } = await supabase
				.from('suoritukset')
				.insert(suoritusData)
				.select()
				.single();

			if (error) {
				console.error('[GlobalState] Error inserting suoritus, queueing:', error);
				await enqueueMutation('suoritukset', 'INSERT', suoritusData as any, undefined, tempSuoritusId);
				if (tehtava.kertasuoritus) {
					await enqueueMutation('tehtavat', 'DELETE', undefined, tehtava.id);
				}
				await connectivity.refreshPendingCount();
				return { error: null, suoritusId: tempSuoritusId, previousEdellinenSuoritus };
			}

			if (insertedSuoritus) {
				await db.suoritukset.delete(tempSuoritusId);
				await db.suoritukset.put(insertedSuoritus as Suoritus);
			}

			if (tehtava.kertasuoritus) {
				await supabase.from('tehtavat').delete().eq('id', tehtava.id);
			}

			return {
				error: null,
				suoritusId: insertedSuoritus?.id ?? tempSuoritusId,
				previousEdellinenSuoritus
			};
		} else {
			// 3b. Offline: queue
			await enqueueMutation('suoritukset', 'INSERT', suoritusData as any, undefined, tempSuoritusId);
			if (tehtava.kertasuoritus) {
				await enqueueMutation('tehtavat', 'DELETE', undefined, tehtava.id);
			}
			await connectivity.refreshPendingCount();
			return { error: null, suoritusId: tempSuoritusId, previousEdellinenSuoritus };
		}
	}

	/** Undo a task completion */
	async undoSuorita(
		tehtava: Tehtava,
		suoritusId: number,
		previousEdellinenSuoritus: string | null
	): Promise<void> {
		if (tehtava.kertasuoritus) {
			const enriched: EnrichedTehtava = {
				...tehtava,
				remainingTime: laskeJaljellaOlevaAika(tehtava, previousEdellinenSuoritus),
				edellinenSuoritus: previousEdellinenSuoritus
			};
			this.tehtavat = [...this.tehtavat, enriched];
			await db.tehtavat.put(tehtava);

			const insertData = {
				id: tehtava.id,
				nimi: tehtava.nimi,
				suoritusvali: tehtava.suoritusvali,
				kertasuoritus: tehtava.kertasuoritus
			};

			if (connectivity.isOnline) {
				await supabase.from('tehtavat').insert(insertData);
			} else {
				await enqueueMutation('tehtavat', 'INSERT', insertData);
			}
		} else {
			this.tehtavat = this.tehtavat.map((t) =>
				t.id === tehtava.id
					? {
							...t,
							remainingTime: laskeJaljellaOlevaAika(t, previousEdellinenSuoritus),
							edellinenSuoritus: previousEdellinenSuoritus
						}
					: t
			);
			await db.tehtavat.update(tehtava.id, { edellinen_suoritus: previousEdellinenSuoritus });
		}
		this.updateStateAndSort();

		await db.suoritukset.delete(suoritusId);
		if (connectivity.isOnline) {
			await supabase.from('suoritukset').delete().eq('id', suoritusId);
		} else {
			await enqueueMutation('suoritukset', 'DELETE', undefined, suoritusId);
		}
		await connectivity.refreshPendingCount();
	}

	/** Update a task's fields */
	async updateTehtava(
		id: number,
		updates: Partial<{ nimi: string; suoritusvali: number; kertasuoritus: boolean }>
	): Promise<{ error: unknown }> {
		// 1. Optimistic: update UI
		this.tehtavat = this.tehtavat.map((t) =>
			t.id === id
				? {
						...t,
						...updates,
						remainingTime: laskeJaljellaOlevaAika({ ...t, ...updates }, t.edellinenSuoritus)
					}
				: t
		);
		this.updateStateAndSort();

		// 2. Persist to IDB
		await db.tehtavat.update(id, updates);

		if (connectivity.isOnline) {
			const { error } = await supabase.from('tehtavat').update(updates).eq('id', id);
			if (error) {
				console.error('[GlobalState] Error updating tehtava, queueing:', error);
				await enqueueMutation('tehtavat', 'UPDATE', updates as any, id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('tehtavat', 'UPDATE', updates as any, id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	/** Delete a task */
	async deleteTehtava(id: number): Promise<{ error: unknown; deletedTask?: EnrichedTehtava }> {
		// 1. Optimistic: remove from UI
		const backup = this.tehtavat.find((t) => t.id === id);
		this.tehtavat = this.tehtavat.filter((t) => t.id !== id);
		this.updateStateAndSort();

		// 2. Remove from IDB
		await db.tehtavat.delete(id);

		if (connectivity.isOnline) {
			const { error } = await supabase.from('tehtavat').delete().eq('id', id);
			if (error) {
				console.error('[GlobalState] Error deleting tehtava, queueing:', error);
				await enqueueMutation('tehtavat', 'DELETE', undefined, id);
				await connectivity.refreshPendingCount();
				return { error: null, deletedTask: backup };
			}
			return { error: null, deletedTask: backup };
		} else {
			await enqueueMutation('tehtavat', 'DELETE', undefined, id);
			await connectivity.refreshPendingCount();
			return { error: null, deletedTask: backup };
		}
	}

	/** Undo a task deletion */
	async undoDelete(tehtava: EnrichedTehtava): Promise<void> {
		this.tehtavat = [...this.tehtavat, tehtava];
		this.updateStateAndSort();
		await db.tehtavat.put(tehtava);

		const insertData = {
			id: tehtava.id,
			nimi: tehtava.nimi,
			suoritusvali: tehtava.suoritusvali,
			kertasuoritus: tehtava.kertasuoritus
		};

		if (connectivity.isOnline) {
			await supabase.from('tehtavat').insert(insertData);
		} else {
			await enqueueMutation('tehtavat', 'INSERT', insertData);
		}
		await connectivity.refreshPendingCount();
	}

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------
	private enrichTehtavat(rawTehtavat: Tehtava[]): EnrichedTehtava[] {
		return rawTehtavat.map((t) => ({
			...t,
			remainingTime: laskeJaljellaOlevaAika(t, t.edellinen_suoritus ?? null),
			edellinenSuoritus: t.edellinen_suoritus ?? null
		}));
	}

	private updateBadge(count: number) {
		if (typeof navigator !== 'undefined') {
			if ('setAppBadge' in navigator) {
				if (count > 0) {
					navigator.setAppBadge(count).catch((err) => console.error('Failed to set app badge:', err));
				} else {
					navigator.clearAppBadge().catch((err) => console.error('Failed to clear app badge:', err));
				}
			}
		}
	}

	private updateStateAndSort() {
		this.tasksWithLessThanOneDay = this.tehtavat.filter((t) => t.remainingTime < 1).length;
		this.tehtavat.sort((a, b) => a.remainingTime - b.remainingTime);
		this.tehtavat = [...this.tehtavat]; // Trigger reactivity
		this.updateBadge(this.tasksWithLessThanOneDay);
	}

	// ------------------------------------------------------------------
	// Realtime subscription
	// ------------------------------------------------------------------
	private setupSubscription() {
		this.realtimeChannel = supabase
			.channel('global-tehtavat-changes')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tehtavat' }, async (payload) => {
				const uusiTehtavaData = payload.new as Tehtava;
				if (this.tehtavat.some((t) => t.id === uusiTehtavaData.id)) return;

				const enriched: EnrichedTehtava = {
					...uusiTehtavaData,
					remainingTime: laskeJaljellaOlevaAika(uusiTehtavaData, null),
					edellinenSuoritus: null
				};
				this.tehtavat = [...this.tehtavat, enriched];
				this.updateStateAndSort();
				await db.tehtavat.put(uusiTehtavaData);
			})
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suoritukset' }, async (payload) => {
				const uusiSuoritus = payload.new as { tehtava_id: number; suoritettu: string };
				const index = this.tehtavat.findIndex((t) => t.id === uusiSuoritus.tehtava_id);

				if (index !== -1) {
					const tehtava = this.tehtavat[index];
					if (tehtava.kertasuoritus) {
						this.tehtavat = this.tehtavat.filter((t) => t.id !== tehtava.id);
						await db.tehtavat.delete(tehtava.id);
					} else {
						const updatedTehtavat = [...this.tehtavat];
						updatedTehtavat[index] = {
							...updatedTehtavat[index],
							remainingTime: laskeJaljellaOlevaAika(tehtava, uusiSuoritus.suoritettu),
							edellinenSuoritus: uusiSuoritus.suoritettu
						};
						this.tehtavat = updatedTehtavat;
						await db.tehtavat.update(tehtava.id, { edellinen_suoritus: uusiSuoritus.suoritettu });
					}
					this.updateStateAndSort();
				}
			})
			.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'suoritukset' }, async () => {
				await this.fetchAndSyncFromSupabase();
			})
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tehtavat' }, async (payload) => {
				const updatedData = payload.new as Tehtava;

				// Check if this task has a pending local edit (conflict resolution)
				const pendingIds = await getPendingMutationIds('tehtavat');
				if (pendingIds.has(updatedData.id)) {
					return; // Keep local changes until flushed
				}

				const index = this.tehtavat.findIndex((t) => t.id === updatedData.id);
				if (index !== -1) {
					const updatedTehtavat = [...this.tehtavat];
					const existing = updatedTehtavat[index];
					updatedTehtavat[index] = {
						...updatedData,
						remainingTime: laskeJaljellaOlevaAika(updatedData, existing.edellinenSuoritus),
						edellinenSuoritus: existing.edellinenSuoritus
					};
					this.tehtavat = updatedTehtavat;
					this.updateStateAndSort();
					await db.tehtavat.update(updatedData.id, updatedData);
				}
			})
			.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tehtavat' }, async (payload) => {
				const pendingIds = await getPendingMutationIds('tehtavat');
				if (pendingIds.has(payload.old.id)) {
					return;
				}
				this.tehtavat = this.tehtavat.filter((t) => t.id !== payload.old.id);
				this.updateStateAndSort();
				await db.tehtavat.delete(payload.old.id);
			})
			.subscribe();
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

export const globalState = new GlobalState();
