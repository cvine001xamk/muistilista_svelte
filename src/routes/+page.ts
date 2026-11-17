import type { PageLoad } from './$types';

// Tasks are loaded instantly from IndexedDB via GlobalState,
// eliminating duplicate blocking network round-trips on initial page render.
export const load: PageLoad = async () => {
	return { tehtavat: [] };
};
