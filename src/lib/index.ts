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
