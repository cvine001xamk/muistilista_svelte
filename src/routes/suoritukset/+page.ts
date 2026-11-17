import type { PageLoad } from './$types';

// Completions are loaded instantly from IndexedDB via completionsState,
// eliminating blocking network fetches during route navigation.
export const load: PageLoad = async () => {
	return { suoritukset: [] };
};
