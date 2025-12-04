// place files you want to import through the `$lib` alias in this folder.

import { supabase } from './supabase';

export async function haeTehtavat() {
	const { data, error } = await supabase.from('tehtavat').select('*');

	if (error) throw new Error('Virhe tehtävien hakemisessa.');

	return data;
}

export async function haeSuoritukset() {
	const { data, error } = await supabase
		.from('suoritukset')
		.select('*')
		.order('id', { ascending: false });

	if (error) throw new Error('Virhe suoritusten hakemisessa.');

	return data;
}

export function laskeJaljellaOlevaAika(tehtava: Tehtava, edellinenSuoritus: string | null): number {
	const now = new Date();
	const referenceDate = edellinenSuoritus ? new Date(edellinenSuoritus) : new Date(tehtava.created_at);

	const diffInMs = now.getTime() - referenceDate.getTime();
	const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

	return tehtava.suoritusvali - diffInDays;
}
