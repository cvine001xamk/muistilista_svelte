/**
 * connectivity.svelte.ts — Svelte 5 rune-based online/offline tracker.
 *
 * Integrates window online/offline events, Service Worker Background Sync messages,
 * and pending mutation counter.
 */

import { flushSyncQueue, getPendingCount, requestBackgroundSync } from './syncQueue';

class Connectivity {
	isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
	pendingSync = $state(0);

	constructor() {
		if (typeof window === 'undefined') return;

		window.addEventListener('online', () => this.handleOnline());
		window.addEventListener('offline', () => this.handleOffline());

		// Listen for Service Worker background sync wake-up
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener('message', (event) => {
				if (event.data?.type === 'BACKGROUND_SYNC_TRIGGER') {
					console.log('[Connectivity] Received BACKGROUND_SYNC_TRIGGER from ServiceWorker');
					this.handleOnline();
				}
			});
		}

		// Seed pending count on load
		getPendingCount().then((count) => (this.pendingSync = count));
	}

	async handleOnline() {
		this.isOnline = true;
		console.log('[Connectivity] Online — flushing sync queue…');
		await flushSyncQueue();
		this.pendingSync = await getPendingCount();
	}

	private handleOffline() {
		this.isOnline = false;
		console.log('[Connectivity] Offline');
	}

	/** Call after enqueuing a new mutation to bump the counter and register background sync. */
	async refreshPendingCount() {
		this.pendingSync = await getPendingCount();
		requestBackgroundSync();
	}
}

export const connectivity = new Connectivity();
