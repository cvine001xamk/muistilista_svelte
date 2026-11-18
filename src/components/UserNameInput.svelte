<script lang="ts">
	import { userState } from '$lib/user.svelte';

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		// Keep first name: trim leading spaces, take first token, max 15 chars
		const firstWord = target.value.trimStart().split(' ')[0] || '';
		userState.setName(firstWord.slice(0, 15));
	}
</script>

<label
	class="group relative inline-flex max-w-[130px] cursor-text items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs text-white shadow-sm backdrop-blur-md transition-all focus-within:border-pink-300/70 focus-within:bg-white/25 focus-within:ring-2 focus-within:ring-pink-400/40 hover:bg-white/20 sm:max-w-[160px] sm:text-sm"
	title={userState.name ? `Suorittaja: ${userState.name}` : 'Aseta etunimesi suorituksia varten'}
>
	<!-- User avatar icon -->
	<svg
		class="mr-1.5 size-3.5 flex-shrink-0 text-white/70 transition-colors group-hover:text-white sm:size-4"
		viewBox="0 0 20 20"
		fill="currentColor"
		aria-hidden="true"
	>
		<path
			fill-rule="evenodd"
			d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
			clip-rule="evenodd"
		/>
	</svg>

	<!-- Auto-sizing text container with flashing cursor -->
	<div class="relative inline-flex min-w-[36px] max-w-[80px] items-center sm:max-w-[105px]">
		<!-- Hidden measuring span matching the font and size -->
		<span class="invisible select-none truncate whitespace-pre text-xs font-medium sm:text-sm">
			{userState.name || 'Nimi'}
		</span>

		<!-- Actual input -->
		<input
			type="text"
			value={userState.name}
			oninput={handleInput}
			placeholder="Nimi"
			maxlength="15"
			class="absolute inset-0 w-full bg-transparent text-xs font-medium text-white placeholder-white/40 focus:outline-none sm:text-sm"
			style="caret-color: transparent;"
			aria-label="Käyttäjän etunimi"
		/>
	</div>
</label>
