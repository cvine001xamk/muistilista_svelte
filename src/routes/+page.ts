import { supabase } from '$lib/supabase';
import { laskeJaljellaOlevaAika } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data: tehtavatData, error } = await supabase.rpc('get_tehtavat_with_latest_suoritus');

	if (error) {
		console.error('Error fetching data:', error);
		return { tehtavat: [] };
	}

	if (!tehtavatData) {
		return { tehtavat: [] };
	}

	const enrichedTehtavat: EnrichedTehtava[] = tehtavatData.map((tehtava: any) => {
		const remainingTime = laskeJaljellaOlevaAika(tehtava, tehtava.edellinen_suoritus);
		return { ...tehtava, remainingTime, edellinenSuoritus: tehtava.edellinen_suoritus };
	});

	const sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);

	return { tehtavat: sortedTehtavat };
};
