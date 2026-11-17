import type { PageLoad } from './$types';

// Shopping items are loaded instantly from IndexedDB via ostoslistaState,
// eliminating blocking network fetches during route navigation.
export const load: PageLoad = async () => {
	return { items: [] };
};
