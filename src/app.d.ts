// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Tehtava {
		id: number;
		nimi: string;
		suoritusvali: number;
		kertasuoritus: boolean;
		created_at: string;
	}

	interface Suoritus {
		id: number;
		suoritettu: string;
		tehtava_id: number;
		suorittaja?: string | null;
		tehtava_nimi: string;
	}

	interface Ostos {
		id: string;
		nimi: string;
		hinta: number;
		completed: boolean;
		created_at?: string;
	}

	type EnrichedTehtava = Tehtava & {
		remainingTime: number;
		edellinenSuoritus: string | null;
	};
}

export {};
