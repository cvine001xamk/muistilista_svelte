<script lang="ts">
	import seasonalDataFromJson from '$lib/data/seasonalProduceData.json';

	// --- Type Definition (English Keys) ---
	type SeasonalData = {
		fruits_and_berries?: string[];
		vegetables?: string[];
		root_vegetables?: string[];
		mushrooms?: string[];
		wild_plants?: string[];
	};

	// --- Data Loading and Casting ---
	const seasonalProduceData: Record<number, SeasonalData> = seasonalDataFromJson as Record<
		number,
		SeasonalData
	>;

	// --- State for Displayed Month ---
	const today = new Date();
	const currentRealMonthIndex = today.getMonth(); // 0-11
	let displayedMonthIndex = currentRealMonthIndex; // 0-11

	// --- Reactive Calculations ---
	$: displayedMonthNumber = displayedMonthIndex + 1;
	$: rawProduce = seasonalProduceData[displayedMonthNumber] || {};

	// --- Utility Functions ---
	const sortFinnishAlphabetically = (arr: string[] | undefined | null): string[] => {
		if (Array.isArray(arr)) {
			return [...arr].sort((a, b) => a.localeCompare(b, 'fi'));
		}
		return [];
	};

	const toTitleCase = (str: string | undefined | null): string => {
		if (!str) return '';
		const trimmedStr = str.trim();
		if (trimmedStr.length === 0) return '';
		if (trimmedStr.startsWith('-')) {
			return '-' + trimmedStr.charAt(1).toUpperCase() + trimmedStr.slice(2).toLowerCase();
		}
		return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1).toLowerCase();
	};

	const hasItems = (items: string[] | undefined): boolean => {
		return Array.isArray(items) && items.length > 0;
	};

	// --- Reactive Processed Data ---
	$: currentProduce = {
		fruits_and_berries: sortFinnishAlphabetically(rawProduce.fruits_and_berries),
		vegetables: sortFinnishAlphabetically(rawProduce.vegetables),
		root_vegetables: sortFinnishAlphabetically(rawProduce.root_vegetables),
		mushrooms: sortFinnishAlphabetically(rawProduce.mushrooms),
		wild_plants: sortFinnishAlphabetically(rawProduce.wild_plants)
	};

	// --- Month Names (Finnish) ---
	const finnishMonthNames = [
		'Tammikuu',
		'Helmikuu',
		'Maaliskuu',
		'Huhtikuu',
		'Toukokuu',
		'Kesäkuu',
		'Heinäkuu',
		'Elokuu',
		'Syyskuu',
		'Lokakuu',
		'Marraskuu',
		'Joulukuu'
	];
	$: displayedFinnishMonthName = finnishMonthNames[displayedMonthIndex] || 'Tuntematon';

	// --- Navigation Functions ---
	function goToPreviousMonth() {
		displayedMonthIndex = (displayedMonthIndex + 12 - 1) % 12;
	}

	function goToNextMonth() {
		displayedMonthIndex = (displayedMonthIndex + 1) % 12;
	}

	// --- Styling Map ---
	const categoryStyles: Record<
		keyof SeasonalData,
		{ title: string; bg: string; iconColor: string; textColor: string; border?: string }
	> = {
		fruits_and_berries: {
			title: 'Hedelmät ja Marjat',
			bg: 'bg-gradient-to-br from-orange-700/80 to-amber-600/80',
			iconColor: 'text-amber-300',
			textColor: 'text-amber-50'
		},
		vegetables: {
			title: 'Vihannekset',
			bg: 'bg-gradient-to-br from-emerald-700/80 to-green-600/80',
			iconColor: 'text-green-300',
			textColor: 'text-green-50'
		},
		root_vegetables: {
			title: 'Juurekset',
			bg: 'bg-gradient-to-br from-yellow-700/80 to-orange-600/80',
			iconColor: 'text-yellow-300',
			textColor: 'text-yellow-50'
		},
		mushrooms: {
			title: 'Sienet',
			bg: 'bg-gradient-to-br from-purple-700/80 to-indigo-600/80',
			iconColor: 'text-purple-300',
			textColor: 'text-purple-50'
		},
		wild_plants: {
			title: 'Luonnonkasvit',
			bg: 'bg-gradient-to-br from-teal-700/80 to-cyan-600/80',
			iconColor: 'text-cyan-300',
			textColor: 'text-cyan-50'
		}
	};
	const categoryKeys: (keyof SeasonalData)[] = [
		'fruits_and_berries',
		'vegetables',
		'root_vegetables',
		'mushrooms',
		'wild_plants'
	];
	const defaultStyle = {
		title: 'Tuntematon',
		bg: 'bg-gray-700/80',
		iconColor: 'text-gray-300',
		textColor: 'text-gray-50'
	};
</script>

<!-- Template with 95% width container and Sticky Header -->
<div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 font-sans text-slate-100">
	<!-- Main Content Area - 95% Width -->
	<main class="mx-auto w-[95%] px-4 py-10 sm:px-6 lg:px-8">
		<!-- Header with Navigation Buttons -->
		<div class="top-0 z-10 bg-slate-900 py-4 text-center">
			<button
				on:click={goToPreviousMonth}
				aria-label="Edellinen kuukausi"
				class="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-10 w-10 sm:h-12 sm:w-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg
				>
			</button>
			<h2
				class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
			>
				{displayedFinnishMonthName}
			</h2>
			<p class="mt-2 text-lg text-slate-300 sm:mt-3 sm:text-xl">Kauden parhaat antimet</p>
			<button
				on:click={goToNextMonth}
				aria-label="Seuraava kuukausi"
				class="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-10 w-10 sm:h-12 sm:w-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg
				>
			</button>
		</div>

		<!-- Grid for Cards - Added margin-top for spacing below sticky header -->
		<div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each categoryKeys as categoryKey}
				{@const items = currentProduce[categoryKey]}
				{#if hasItems(items)}
					{@const style = categoryStyles[categoryKey] || defaultStyle}
					<div
						class={`rounded-2xl border border-white/10 ${style.bg} p-5 shadow-xl backdrop-blur-sm`}
					>
						<h3 class={`mb-4 border-b border-white/20 pb-2 text-xl font-semibold text-white`}>
							{style.title}
						</h3>
						<ul class="space-y-1.5">
							{#each items as item}
								<li
									class={`flex items-center text-base ${style.textColor} transition hover:text-white`}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class={`mr-2 h-5 w-5 flex-shrink-0 ${style.iconColor}`}
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="break-words">{toTitleCase(item)}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		</div>

		<footer class="mt-12 text-center text-sm text-slate-400">Satokausikalenteri 2025</footer>
	</main>
</div>

<style>
	/* Optional global styles */
	:global(body) {
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			'Open Sans',
			'Helvetica Neue',
			sans-serif;
	}
</style>
