import { supabase } from '$lib/supabase';
import { laskeJaljellaOlevaAika } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const { data: tehtavatData, error } = await supabase.rpc('get_tehtavat_with_latest_suoritus');

		if (error || !tehtavatData) {
			return { tehtavat: [] };
		}

		const enrichedTehtavat: EnrichedTehtava[] = tehtavatData.map((tehtava: any) => {
			const remainingTime = laskeJaljellaOlevaAika(tehtava, tehtava.edellinen_suoritus);
			return { ...tehtava, remainingTime, edellinenSuoritus: tehtava.edellinen_suoritus };
		});

		const sortedTehtavat = enrichedTehtavat.sort((a, b) => a.remainingTime - b.remainingTime);

		return { tehtavat: sortedTehtavat };
	} catch (err) {
		console.warn('Network offline or failed during SSR fetch, falling back to local store:', err);
		return { tehtavat: [] };
	}
};
