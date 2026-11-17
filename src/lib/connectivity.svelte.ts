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
	private flushTimeout: ReturnType<typeof setTimeout> | null = null;

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

		// Seed pending count on load, and auto-flush if already online
		getPendingCount().then(async (count) => {
			this.pendingSync = count;
			if (count > 0 && this.isOnline) {
				await this.flushQueue();
			}
		});

		// Periodic background safety retry if mutations remain pending while online
		setInterval(() => {
			if (this.isOnline && this.pendingSync > 0) {
				this.flushQueue();
			}
		}, 10000);
	}

	async handleOnline() {
		this.isOnline = true;
		console.log('[Connectivity] Online — flushing sync queue…');
		await this.flushQueue();
	}

	async flushQueue() {
		try {
			await flushSyncQueue();
		} catch (err) {
			console.error('[Connectivity] Error during flushQueue:', err);
		} finally {
			this.pendingSync = await getPendingCount();
		}
	}

	private handleOffline() {
		this.isOnline = false;
		console.log('[Connectivity] Offline');
	}

	/** Call after enqueuing a new mutation to bump the counter, register background sync, and auto-retry if online. */
	async refreshPendingCount() {
		this.pendingSync = await getPendingCount();
		requestBackgroundSync();

		// If online, trigger flushQueue shortly so mutations don't linger in the queue
		if (this.isOnline && this.pendingSync > 0) {
			if (this.flushTimeout) clearTimeout(this.flushTimeout);
			this.flushTimeout = setTimeout(() => {
				this.flushQueue();
			}, 500);
		}
	}

	/** Force retry flushing pending mutations */
	async retrySync() {
		if (this.isOnline) {
			await this.flushQueue();
		}
	}
}

export const connectivity = new Connectivity();
