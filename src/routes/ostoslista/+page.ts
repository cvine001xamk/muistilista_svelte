import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data, error } = await supabase
		.from('ostokset')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching items:', error);
		return { items: [] };
	}

	return { items: data as Ostos[] };
};
