import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const { data, error } = await supabase
			.from('ostokset')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching items:', error);
			return { items: [] };
		}

		return { items: (data as Ostos[]) ?? [] };
	} catch (err) {
		console.warn('Network offline or failed during SSR fetch, falling back to local store:', err);
		return { items: [] };
	}
};
