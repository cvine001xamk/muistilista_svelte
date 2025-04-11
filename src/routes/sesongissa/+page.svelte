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
	// Casts the imported JSON data to the expected type structure.
	const seasonalProduceData: Record<number, SeasonalData> = seasonalDataFromJson as Record<
		number,
		SeasonalData
	>;

	// --- State for Displayed Month ---
	const today = new Date();
	const currentRealMonthIndex = today.getMonth(); // 0-11 (January is 0)
	let displayedMonthIndex = currentRealMonthIndex; // State variable for the currently viewed month index

	// --- Reactive Calculations ---
	// Calculate the displayed month number (1-12) based on the index (0-11).
	$: displayedMonthNumber = displayedMonthIndex + 1;
	// Get the raw produce data for the displayed month, defaulting to an empty object if not found.
	$: rawProduce = seasonalProduceData[displayedMonthNumber] || {};

	// --- Utility Functions ---

	/** Sorts an array of strings alphabetically according to Finnish locale rules. */
	const sortFinnishAlphabetically = (arr: string[] | undefined | null): string[] => {
		if (Array.isArray(arr)) {
			// Create a shallow copy before sorting to avoid mutating the original array
			return [...arr].sort((a, b) => a.localeCompare(b, 'fi'));
		}
		return []; // Return empty array if input is not a valid array
	};

	/** Converts a string to Title Case (first letter uppercase, rest lowercase). Handles leading hyphens. */
	const toTitleCase = (str: string | undefined | null): string => {
		if (!str) return ''; // Return empty string for null or undefined input
		const trimmedStr = str.trim();
		if (trimmedStr.length === 0) return ''; // Return empty string for empty/whitespace-only input
		// Handle specific case for leading hyphen if needed
		if (trimmedStr.startsWith('-')) {
			return '-' + trimmedStr.charAt(1).toUpperCase() + trimmedStr.slice(2).toLowerCase();
		}
		// Standard title case
		return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1).toLowerCase();
	};

	/** Checks if an array exists and has items. */
	const hasItems = (items: string[] | undefined): boolean => {
		return Array.isArray(items) && items.length > 0;
	};

	// --- Reactive Processed Data ---
	// Creates a processed object where each category's items are sorted alphabetically.
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
	// Gets the Finnish name for the currently displayed month.
	$: displayedFinnishMonthName = finnishMonthNames[displayedMonthIndex] || 'Tuntematon'; // Default fallback

	// --- Navigation Functions ---

	/** Navigates to the previous month, wrapping around from January to December. */
	function goToPreviousMonth() {
		displayedMonthIndex = (displayedMonthIndex + 12 - 1) % 12; // Modulo arithmetic for wrap-around
	}

	/** Navigates to the next month, wrapping around from December to January. */
	function goToNextMonth() {
		displayedMonthIndex = (displayedMonthIndex + 1) % 12; // Modulo arithmetic for wrap-around
	}

	// --- Styling Map ---
	// Defines display properties (title, background, colors) for each produce category.
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
	// Defines the order in which categories should be displayed.
	const categoryKeys: (keyof SeasonalData)[] = [
		'fruits_and_berries',
		'vegetables',
		'root_vegetables',
		'mushrooms',
		'wild_plants'
	];
	// Default style for unknown or fallback categories.
	const defaultStyle = {
		title: 'Tuntematon',
		bg: 'bg-gray-700/80',
		iconColor: 'text-gray-300',
		textColor: 'text-gray-50'
	};
</script>

<!-- Component Template -->
<div
	class="min-h-screen rounded-md bg-gradient-to-br from-slate-900 to-slate-700 font-sans text-slate-100"
>
	<main class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
		<!-- Header Section: Month Navigation and Title -->
		<div class="top-0 z-10 rounded-3xl bg-sky-800 py-4">
			<!-- Flex container to align buttons and title -->
			<div class="relative mx-auto flex max-w-lg items-center justify-between">
				<!-- Previous Month Button -->
				<button
					onclick={goToPreviousMonth}
					aria-label="Edellinen kuukausi"
					class="rounded-full p-2 text-slate-400 transition hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
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

				<!-- Month Title and Subtitle -->
				<div class="text-center">
					<h2
						class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl"
					>
						{displayedFinnishMonthName}
					</h2>
					<p class="mt-2 text-lg text-slate-300 md:mt-3 md:text-xl">Kauden parhaat antimet</p>
				</div>

				<!-- Next Month Button -->
				<button
					onclick={goToNextMonth}
					aria-label="Seuraava kuukausi"
					class="rounded-full p-2 text-slate-400 transition hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
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
		</div>

		<!-- Grid Layout for Produce Category Cards -->
		<div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<!-- Iterate over defined category keys to maintain order -->
			{#each categoryKeys as categoryKey}
				{@const items = currentProduce[categoryKey]}
				<!-- Only render card if the category has items for the current month -->
				{#if hasItems(items)}
					{@const style = categoryStyles[categoryKey] || defaultStyle}
					<!-- Get styles or use default -->
					<!-- Category Card -->
					<div
						class={`rounded-2xl border border-white/10 ${style.bg} p-5 shadow-xl backdrop-blur-sm`}
					>
						<!-- Card Title -->
						<h3 class={`mb-4 border-b border-white/20 pb-2 text-xl font-semibold text-white`}>
							{style.title}
						</h3>
						<!-- List of Items -->
						<ul class="space-y-1.5">
							{#each items as item}
								<li
									class={`flex items-center text-base ${style.textColor} transition hover:text-white`}
								>
									<!-- List Item Icon -->
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
									<!-- List Item Text (Title Case) -->
									<span class="break-words">{toTitleCase(item)}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Footer Section -->
		<footer class="mt-12 text-center text-sm text-slate-400">Satokausikalenteri 2025</footer>
	</main>
</div>

<style>
	/* Optional global styles for body font */
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
