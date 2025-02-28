<script lang="ts">
	// Define a type for seasonal produce
	type SeasonalProduce = {
		vegetables: string[];
		fruits: string[];
	};

	// Define the seasonal produce data with explicit numeric keys
	const seasonalProduce: Record<number, SeasonalProduce> = {
		1: {
			// January
			vegetables: [
				'Bataatti',
				'Inkivääri',
				'Keltasipuli',
				'Lehtikaali',
				'Maa-artisokka',
				'Mustajuuri',
				'Porkkana',
				'Punakaali',
				'Salottisipuli'
			],
			fruits: [
				'Appelsiini',
				'Feijoa',
				'Greippi',
				'Hunajapomelo',
				'Kiivi',
				'Klementiini',
				'Kookospähkinä',
				'Kumkvatti',
				'Omena',
				'Suklaa-appelsiini',
				'Sweetie',
				'Veriappelsiini',
				'Verigreippi'
			]
		},
		2: {
			// February
			vegetables: [
				'Bataatti',
				'Juuripersilja',
				'Kurkuma',
				'Mustajuuri',
				'Salaattifenkoli',
				'Valkokaali',
				'Valkosipuli'
			],
			fruits: [
				'Annoona',
				'Appelsiini',
				'Avokado',
				'Greippi',
				'Guava',
				'Hunajapomelo',
				'Kiivi',
				'Limetti',
				'Rumeliini',
				'Sharon',
				'Sweetie',
				'Veriappelsiini',
				'Verigreippi',
				'Verimandariini'
			]
		},
		3: {
			// March
			vegetables: [
				'Bataatti',
				'Latva-artisokka',
				'Maa-artisokka',
				'Maniokki',
				'Palsternakka',
				'Peruna',
				'Piparjuuri',
				'Purppurabataatti'
			],
			fruits: [
				'Ananaskirsikka',
				'Avokado',
				'Banaani',
				'Greippi',
				'Keittobanaani',
				'Kookospähkinä',
				'Limetti',
				'Mandariini',
				'Mango',
				'Papaija',
				'Passiohedelmä',
				'Puoliveriappelsiini',
				'Veriappelsiini'
			]
		},
		// Add data for all 12 months...
		12: {
			// December
			vegetables: ['Porkkana', 'Lanttu', 'Kaali'],
			fruits: ['Omena', 'Päärynä']
		}
	};

	// Get the current month (1-12)
	const currentMonth = new Date().getMonth() + 1;

	// Get the seasonal produce for the current month
	const currentProduce = seasonalProduce[currentMonth];

	// Finnish month names for display
	const monthNames = [
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
	const currentMonthName = monthNames[currentMonth - 1];
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-800 to-gray-600 text-white">
	<div class="mx-auto max-w-4xl p-6">
		<!-- Month Navigation -->
		<div class="mb-8 flex items-center justify-between">
			<h2 class="text-2xl font-bold text-white">
				{currentMonthName} - Kauden parhaat vihannekset ja hedelmät
			</h2>
		</div>

		<!-- Vegetables Card -->
		<div class="mb-8 rounded-xl bg-gradient-to-br from-green-800 to-green-700 p-6 shadow-2xl">
			<h3 class="mb-4 text-xl font-semibold text-white">Vihannekset</h3>
			<ul class="space-y-1">
				{#each currentProduce.vegetables as vegetable}
					<li class="flex items-center text-base text-gray-100">
						<span class="mr-2 text-green-400">•</span>
						{vegetable}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Fruits Card -->
		<div class="rounded-xl bg-gradient-to-br from-orange-800 to-orange-700 p-6 shadow-2xl">
			<h3 class="mb-4 text-xl font-semibold text-white">Hedelmät</h3>
			<ul class="space-y-1">
				{#each currentProduce.fruits as fruit}
					<li class="flex items-center text-base text-gray-100">
						<span class="mr-2 text-orange-400">•</span>
						{fruit}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
