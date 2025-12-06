import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data, error } = await supabase
		.from('suoritukset')
		.select('*')
		.order('suoritettu', { ascending: false })
		.limit(100);

	if (error) {
		console.error('Error fetching suoritukset:', error);
		return { suoritukset: [] };
	}

	return { suoritukset: data as Suoritus[] };
};
