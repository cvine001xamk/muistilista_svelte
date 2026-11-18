/**
 * ostoslista.svelte.ts — Offline-first store for shared shopping list items.
 *
 * Backed by IndexedDB (Dexie) with optimistic updates, offline mutation queueing,
 * and Supabase synchronization.
 */

import { supabase } from '$lib/supabase';
import { db } from '$lib/db';
import { enqueueMutation, getPendingMutationIds, onSyncComplete } from '$lib/syncQueue';
import { connectivity } from '$lib/connectivity.svelte';
import type { RealtimeChannel } from '@supabase/supabase-js';

class OstoslistaState {
	items = $state<Ostos[]>([]);
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

		// 1. Load cached items from IndexedDB immediately (instant, <5ms)
		await this.loadFromIDB();

		// 2. Setup real-time updates
		this.setupSubscription();

		// 3. Fetch fresh items from Supabase in background without blocking
		if (connectivity.isOnline) {
			this.fetchAndSyncFromSupabase();
		}
	}

	async loadFromIDB() {
		try {
			const cached = await db.ostokset.toArray();
			if (cached.length > 0) {
				const normalized: Ostos[] = cached.map((item) => ({
					...item,
					id: String(item.id),
					completed: Boolean(item.completed)
				}));
				this.items = normalized.sort((a, b) => {
					const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
					const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
					if (dateA !== dateB) return dateB - dateA;
					const idA = parseInt(String(a.id).replace('temp_', ''), 10) || 0;
					const idB = parseInt(String(b.id).replace('temp_', ''), 10) || 0;
					return idB - idA;
				});
			} else {
				this.items = [];
			}
		} catch (err) {
			console.error('[OstoslistaState] Error loading from IDB:', err);
		}
	}

	async fetchAndSyncFromSupabase() {
		this.isLoading = true;
		try {
			// Supabase ostokset schema: id (int), nimi (text), completed (boolean), created_at (timestamptz)
			const { data, error } = await supabase
				.from('ostokset')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) {
				console.error('[OstoslistaState] Error fetching from Supabase:', error);
				return;
			}

			if (!data) return;

			const pendingIds = await getPendingMutationIds('ostokset');
			const serverIds = new Set<string>();

			await db.transaction('rw', db.ostokset, async () => {
				for (const serverItem of data) {
					const strId = String(serverItem.id);
					serverIds.add(strId);
					if (pendingIds.has(strId) || pendingIds.has(serverItem.id)) {
						continue; // Preserve local uncommitted edits
					}
					const ostosItem: Ostos = {
						id: strId,
						nimi: serverItem.nimi,
						maara: serverItem.maara ?? null,
						completed: serverItem.completed ?? false,
						created_at: serverItem.created_at
					};
					await db.ostokset.put(ostosItem);
				}

				// Clean up deleted items from local store (ignore pending temp items)
				const currentLocal = await db.ostokset.toArray();
				for (const localItem of currentLocal) {
					const localStrId = String(localItem.id);
					if (localStrId.startsWith('temp_')) continue;
					if (!serverIds.has(localStrId) && !pendingIds.has(localItem.id) && !pendingIds.has(localStrId)) {
						await db.ostokset.delete(localItem.id);
					}
				}
			});

			await this.loadFromIDB();
		} catch (err) {
			console.error('[OstoslistaState] Unexpected fetch error:', err);
		} finally {
			this.isLoading = false;
		}
	}

	async addItem(nimi: string, maara?: string): Promise<{ error: unknown }> {
		const tempId = `temp_${Date.now()}`;
		const now = new Date().toISOString();
		const trimmedMaara = maara?.trim() || null;
		const newItem: Ostos = {
			id: tempId,
			nimi,
			maara: trimmedMaara,
			completed: false,
			created_at: now
		};

		// 1. Optimistic update
		this.items = [newItem, ...this.items];

		// 2. Persist to IDB
		await db.ostokset.put(newItem);

		const payload = { nimi, maara: trimmedMaara, completed: false };

		if (connectivity.isOnline) {
			const { data, error } = await supabase
				.from('ostokset')
				.insert([payload])
				.select();

			if (error) {
				console.error('[OstoslistaState] Error adding item, queueing:', error);
				await enqueueMutation('ostokset', 'INSERT', payload, undefined, tempId);
				await connectivity.refreshPendingCount();
				return { error: null };
			}

			if (data && data.length > 0) {
				const inserted = data[0];
				const syncedItem: Ostos = {
					id: String(inserted.id),
					nimi: inserted.nimi,
					maara: inserted.maara ?? null,
					completed: inserted.completed ?? false,
					created_at: inserted.created_at
				};
				await db.ostokset.delete(tempId);
				await db.ostokset.put(syncedItem);
				this.items = this.items.map((i) => (i.id === tempId ? syncedItem : i));
			}

			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'INSERT', payload, undefined, tempId);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async clearCompleted(): Promise<void> {
		const completedItems = this.items.filter((i) => i.completed);
		if (completedItems.length === 0) return;

		// 1. Optimistic remove
		this.items = this.items.filter((i) => !i.completed);

		// 2. Persist to IDB and Supabase/queue
		for (const item of completedItems) {
			await db.ostokset.delete(item.id);
			if (String(item.id).startsWith('temp_')) {
				continue;
			}
			if (connectivity.isOnline) {
				const { error } = await supabase.from('ostokset').delete().eq('id', item.id);
				if (error) {
					console.error('[OstoslistaState] Error removing completed item, queueing:', error);
					await enqueueMutation('ostokset', 'DELETE', undefined, item.id);
				}
			} else {
				await enqueueMutation('ostokset', 'DELETE', undefined, item.id);
			}
		}
		await connectivity.refreshPendingCount();
	}

	async toggleCompleted(item: Ostos): Promise<{ error: unknown }> {
		const newCompleted = !item.completed;
		const updatedItem: Ostos = {
			...item,
			completed: newCompleted
		};

		// 1. Optimistic update
		this.items = this.items.map((i) => (i.id === item.id ? updatedItem : i));

		// 2. Persist to IDB
		await db.ostokset.put(updatedItem);

		// If this is still a temporary local item, avoid querying server with temp ID
		if (String(item.id).startsWith('temp_')) {
			return { error: null };
		}

		const payload = { completed: newCompleted };

		if (connectivity.isOnline) {
			const { error } = await supabase
				.from('ostokset')
				.update(payload)
				.eq('id', item.id);

			if (error) {
				console.error('[OstoslistaState] Error toggling item, queueing:', error);
				await enqueueMutation('ostokset', 'UPDATE', payload, item.id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'UPDATE', payload, item.id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async updateItem(item: Ostos): Promise<{ error: unknown }> {
		// 1. Optimistic update
		this.items = this.items.map((i) => (i.id === item.id ? item : i));

		// 2. Persist to IDB
		await db.ostokset.put(item);

		if (String(item.id).startsWith('temp_')) {
			return { error: null };
		}

		const payload = { nimi: item.nimi, maara: item.maara ?? null, completed: item.completed };

		if (connectivity.isOnline) {
			const { error } = await supabase.from('ostokset').update(payload).eq('id', item.id);

			if (error) {
				console.error('[OstoslistaState] Error updating item, queueing:', error);
				await enqueueMutation('ostokset', 'UPDATE', payload, item.id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'UPDATE', payload, item.id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async removeItem(id: string): Promise<{ error: unknown }> {
		// 1. Optimistic remove
		this.items = this.items.filter((i) => i.id !== id);

		// 2. Remove from IDB
		await db.ostokset.delete(id);

		if (String(id).startsWith('temp_')) {
			return { error: null };
		}

		if (connectivity.isOnline) {
			const { error } = await supabase.from('ostokset').delete().eq('id', id);

			if (error) {
				console.error('[OstoslistaState] Error removing item, queueing:', error);
				await enqueueMutation('ostokset', 'DELETE', undefined, id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'DELETE', undefined, id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	private setupSubscription() {
		this.realtimeChannel = supabase
			.channel('ostokset-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'ostokset'
				},
				async (payload) => {
					const pendingIds = await getPendingMutationIds('ostokset');

					switch (payload.eventType) {
						case 'INSERT': {
							const newItem = payload.new as any;
							const strId = String(newItem.id);
							if (!this.items.some((i) => i.id === strId)) {
								const ostos: Ostos = {
									id: strId,
									nimi: newItem.nimi,
									maara: newItem.maara ?? null,
									completed: newItem.completed ?? (newItem.hinta === 1),
									created_at: newItem.created_at
								};
								this.items = [ostos, ...this.items];
								await db.ostokset.put(ostos);
							}
							break;
						}
						case 'UPDATE': {
							const updatedItem = payload.new as any;
							const strId = String(updatedItem.id);
							if (pendingIds.has(strId) || pendingIds.has(updatedItem.id)) return;
							const ostos: Ostos = {
								id: strId,
								nimi: updatedItem.nimi,
								maara: updatedItem.maara ?? null,
								completed: updatedItem.completed ?? (updatedItem.hinta === 1),
								created_at: updatedItem.created_at
							};
							this.items = this.items.map((i) => (i.id === strId ? ostos : i));
							await db.ostokset.put(ostos);
							break;
						}
						case 'DELETE': {
							const oldId = String(payload.old?.id);
							if (pendingIds.has(oldId) || pendingIds.has(payload.old?.id)) return;
							this.items = this.items.filter((i) => i.id !== oldId);
							await db.ostokset.delete(oldId);
							break;
						}
					}
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error('[OstoslistaState] Realtime subscription error:', err);
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

export const ostoslistaState = new OstoslistaState();

