/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;
import { build, files, version } from '$service-worker';

const CACHE = `muistilista-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS, '/']))
			.then(() => sw.skipWaiting())
			.catch((err) => {
				console.warn('[SW] Install precache partial warning:', err);
			})
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.map((key) => (key !== CACHE ? caches.delete(key) : undefined)))
			)
			.then(() => sw.clients.claim())
	);
});

// Background Sync API: Defer network requests until connectivity is restored
sw.addEventListener('sync', (event: any) => {
	if (event.tag === 'sync-mutations') {
		event.waitUntil(
			sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
				for (const client of clients) {
					client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
				}
			})
		);
	}
});

sw.addEventListener('fetch', (event) => {
	// ignore non-GET requests
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// 1. `build`/`files` can always be served from the cache (cache-first)
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) {
				return response;
			}
		}

		// 2. Navigation requests: serve cached app shell immediately (stale-while-revalidate),
		// eliminating cellular network delays and white screen on mobile startup.
		if (event.request.mode === 'navigate') {
			const cachedPage = (await cache.match(event.request)) || (await cache.match('/'));
			if (cachedPage) {
				// Revalidate in background without blocking render
				fetch(event.request)
					.then((res) => {
						if (res.status === 200) {
							cache.put(event.request, res.clone());
						}
					})
					.catch(() => {});
				return cachedPage;
			}
		}

		// 3. For other dynamic requests, try network first with fallback to cache
		try {
			const response = await fetch(event.request);

			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);
			if (response) {
				return response;
			}

			throw err;
		}
	}

	event.respondWith(respond());
});
