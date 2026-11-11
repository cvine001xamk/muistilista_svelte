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

		// 1. Load cached items from IndexedDB immediately
		await this.loadFromIDB();

		// 2. Fetch fresh items from Supabase if online
		if (connectivity.isOnline) {
			await this.fetchAndSyncFromSupabase();
		}

		// 3. Setup real-time updates
		this.setupSubscription();
	}

	async loadFromIDB() {
		try {
			const cached = await db.ostokset.toArray();
			if (cached.length > 0) {
				this.items = cached.sort((a, b) => {
					const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
					const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
					return dateB - dateA;
				});
			}
		} catch (err) {
			console.error('[OstoslistaState] Error loading from IDB:', err);
		}
	}

	async fetchAndSyncFromSupabase() {
		this.isLoading = true;
		try {
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
					serverIds.add(serverItem.id);
					if (pendingIds.has(serverItem.id)) {
						continue; // Preserve local uncommitted edits
					}
					await db.ostokset.put(serverItem);
				}

				// Clean up deleted items from local store
				const currentLocal = await db.ostokset.toArray();
				for (const localItem of currentLocal) {
					if (!serverIds.has(localItem.id) && !pendingIds.has(localItem.id)) {
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

	async addItem(nimi: string, hinta: number): Promise<{ error: unknown }> {
		const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp_${Date.now()}`;
		const now = new Date().toISOString();
		const newItem: Ostos = {
			id: tempId,
			nimi,
			hinta,
			completed: false,
			created_at: now
		};

		// 1. Optimistic update
		this.items = [newItem, ...this.items];

		// 2. Persist to IDB
		await db.ostokset.put(newItem);

		if (connectivity.isOnline) {
			const { data, error } = await supabase
				.from('ostokset')
				.insert([{ nimi, hinta, completed: false }])
				.select();

			if (error) {
				console.error('[OstoslistaState] Error adding item, queueing:', error);
				await enqueueMutation('ostokset', 'INSERT', { nimi, hinta, completed: false }, undefined, tempId);
				await connectivity.refreshPendingCount();
				return { error: null };
			}

			if (data && data.length > 0) {
				const inserted = data[0] as Ostos;
				await db.ostokset.delete(tempId);
				await db.ostokset.put(inserted);
				this.items = this.items.map((i) => (i.id === tempId ? inserted : i));
			}

			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'INSERT', { nimi, hinta, completed: false }, undefined, tempId);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async toggleCompleted(item: Ostos): Promise<{ error: unknown }> {
		const updatedItem: Ostos = {
			...item,
			completed: !item.completed
		};

		// 1. Optimistic update
		this.items = this.items.map((i) => (i.id === item.id ? updatedItem : i));

		// 2. Persist to IDB
		await db.ostokset.put(updatedItem);

		if (connectivity.isOnline) {
			const { error } = await supabase
				.from('ostokset')
				.update({ completed: updatedItem.completed })
				.eq('id', item.id);

			if (error) {
				console.error('[OstoslistaState] Error toggling item, queueing:', error);
				await enqueueMutation('ostokset', 'UPDATE', { completed: updatedItem.completed }, item.id);
				await connectivity.refreshPendingCount();
				return { error: null };
			}
			return { error: null };
		} else {
			await enqueueMutation('ostokset', 'UPDATE', { completed: updatedItem.completed }, item.id);
			await connectivity.refreshPendingCount();
			return { error: null };
		}
	}

	async updateItem(item: Ostos): Promise<{ error: unknown }> {
		// 1. Optimistic update
		this.items = this.items.map((i) => (i.id === item.id ? item : i));

		// 2. Persist to IDB
		await db.ostokset.put(item);

		const payload = { nimi: item.nimi, hinta: item.hinta };

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
							const newItem = payload.new as Ostos;
							if (!this.items.some((i) => i.id === newItem.id)) {
								this.items = [newItem, ...this.items];
								await db.ostokset.put(newItem);
							}
							break;
						}
						case 'UPDATE': {
							const updatedItem = payload.new as Ostos;
							if (pendingIds.has(updatedItem.id)) return;
							this.items = this.items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
							await db.ostokset.put(updatedItem);
							break;
						}
						case 'DELETE': {
							const oldId = payload.old.id;
							if (pendingIds.has(oldId)) return;
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

