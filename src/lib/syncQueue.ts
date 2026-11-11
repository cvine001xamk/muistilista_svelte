/**
 * syncQueue.ts — Offline sync queue processor with conflict detection & ID reconciliation.
 *
 * Queues mutations when offline and replays them against Supabase
 * when connectivity is restored.
 */

import { db, type SyncQueueEntry, type SyncOperation, type SyncTable } from './db';
import { supabase } from './supabase';

const MAX_ATTEMPTS = 5;

type SyncListener = () => void | Promise<void>;
const syncListeners = new Set<SyncListener>();

export function onSyncComplete(listener: SyncListener): () => void {
	syncListeners.add(listener);
	return () => syncListeners.delete(listener);
}

function notifySyncListeners() {
	for (const listener of syncListeners) {
		try {
			listener();
		} catch (err) {
			console.error('[SyncQueue] Error in sync listener:', err);
		}
	}
}

// ----------------------------------------------------------------
// Enqueue a mutation
// ----------------------------------------------------------------
export async function enqueueMutation(
	table: SyncTable,
	operation: SyncOperation,
	payload?: Record<string, unknown>,
	recordId?: number | string,
	tempId?: number | string
): Promise<void> {
	await db.syncQueue.add({
		createdAt: new Date().toISOString(),
		table,
		operation,
		payload,
		recordId,
		tempId,
		attempts: 0
	});

	// Trigger Background Sync if available
	requestBackgroundSync();
}

// ----------------------------------------------------------------
// Conflict detection: get IDs of records with pending mutations
// ----------------------------------------------------------------
export async function getPendingMutationIds(table: SyncTable): Promise<Set<number | string>> {
	const entries = await db.syncQueue.where('table').equals(table).toArray();
	const ids = new Set<number | string>();
	for (const entry of entries) {
		if (entry.recordId != null) ids.add(entry.recordId);
		if (entry.tempId != null) ids.add(entry.tempId);
	}
	return ids;
}

// ----------------------------------------------------------------
// Replay the queue — call this when going online or upon background sync
// ----------------------------------------------------------------
let isFlushing = false;

export async function flushSyncQueue(): Promise<void> {
	if (isFlushing) return;
	isFlushing = true;

	try {
		const entries = await db.syncQueue.orderBy('id').toArray();
		if (entries.length === 0) return;

		console.log(`[SyncQueue] Flushing ${entries.length} queued mutation(s)…`);

		let hasProcessedAny = false;

		for (const entry of entries) {
			const success = await replayEntry(entry);
			if (success) {
				await db.syncQueue.delete(entry.id!);
				hasProcessedAny = true;
			} else {
				// Increment attempts; if too many, abandon
				if (entry.attempts + 1 >= MAX_ATTEMPTS) {
					console.warn('[SyncQueue] Max attempts reached, discarding entry:', entry);
					await db.syncQueue.delete(entry.id!);
					hasProcessedAny = true;
				} else {
					await db.syncQueue.update(entry.id!, { attempts: entry.attempts + 1 });
				}
			}
		}

		if (hasProcessedAny) {
			notifySyncListeners();
		}
	} finally {
		isFlushing = false;
	}
}

// ----------------------------------------------------------------
// Replay a single queue entry
// ----------------------------------------------------------------
async function replayEntry(entry: SyncQueueEntry): Promise<boolean> {
	try {
		let error: unknown = null;

		if (entry.operation === 'INSERT') {
			const { data, error: insertError } = await supabase
				.from(entry.table)
				.insert(entry.payload as any)
				.select();

			error = insertError;

			// If we had a temporary local ID, reconcile it with the server ID in IndexedDB
			if (!insertError && data && data.length > 0 && entry.tempId != null) {
				const inserted = data[0];
				if (entry.table === 'tehtavat') {
					await db.tehtavat.delete(entry.tempId as number);
					await db.tehtavat.put(inserted as Tehtava);
				} else if (entry.table === 'suoritukset') {
					await db.suoritukset.delete(entry.tempId as number);
					await db.suoritukset.put(inserted as Suoritus);
				} else if (entry.table === 'ostokset') {
					await db.ostokset.delete(entry.tempId as string);
					await db.ostokset.put(inserted as Ostos);
				}
			}
		} else if (entry.operation === 'UPDATE') {
			const result = await supabase
				.from(entry.table)
				.update(entry.payload as any)
				.eq('id', entry.recordId as string);
			error = result.error;
		} else if (entry.operation === 'DELETE') {
			const result = await supabase.from(entry.table).delete().eq('id', entry.recordId as string);
			error = result.error;
		}

		if (error) {
			console.error('[SyncQueue] Replay failed for entry:', entry, error);
			return false;
		}

		return true;
	} catch (err) {
		console.error('[SyncQueue] Unexpected error replaying entry:', entry, err);
		return false;
	}
}

// ----------------------------------------------------------------
// Get the number of pending queue entries (for UI badge)
// ----------------------------------------------------------------
export async function getPendingCount(): Promise<number> {
	return db.syncQueue.count();
}

// ----------------------------------------------------------------
// Background Sync API integration
// ----------------------------------------------------------------
export function requestBackgroundSync(): void {
	if (typeof window === 'undefined') return;

	if ('serviceWorker' in navigator && 'SyncManager' in window) {
		navigator.serviceWorker.ready
			.then((registration: any) => {
				if (registration.sync) {
					return registration.sync.register('sync-mutations');
				}
			})
			.catch((err) => {
				console.warn('[SyncQueue] Background sync registration failed, falling back:', err);
			});
	}
}
