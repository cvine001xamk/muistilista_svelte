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
	class="group relative inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs sm:text-sm text-white backdrop-blur-md border border-white/20 transition-all hover:bg-white/20 focus-within:bg-white/25 focus-within:border-pink-300/70 focus-within:ring-2 focus-within:ring-pink-400/40 shadow-sm cursor-text max-w-[130px] sm:max-w-[160px]"
	title={userState.name ? `Suorittaja: ${userState.name}` : 'Aseta etunimesi suorituksia varten'}
>
	<!-- User avatar icon -->
	<svg
		class="size-3.5 sm:size-4 text-white/70 mr-1.5 flex-shrink-0 transition-colors group-hover:text-white"
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
	<div class="relative inline-flex items-center min-w-[36px] max-w-[80px] sm:max-w-[105px]">
		<!-- Hidden measuring span matching the font and size -->
		<span class="invisible whitespace-pre font-medium select-none text-xs sm:text-sm truncate">
			{userState.name || 'Nimi'}
		</span>

		<!-- Actual input -->
		<input
			type="text"
			value={userState.name}
			oninput={handleInput}
			placeholder="Nimi"
			maxlength="15"
			class="absolute inset-0 w-full bg-transparent font-medium text-white placeholder-white/40 focus:outline-none text-xs sm:text-sm"
			style="caret-color: transparent;"
			aria-label="Käyttäjän etunimi"
		/>

		<!-- Flashing cursor pointer (always visible and flashing) -->
		<span
			class="pointer-events-none inline-block w-[2px] h-3 sm:h-3.5 bg-pink-300 ml-[1px] rounded-full animate-cursor-blink flex-shrink-0"
			aria-hidden="true"
		></span>
	</div>
</label>

<style>
	@keyframes cursorBlink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}

	.animate-cursor-blink {
		animation: cursorBlink 0.85s infinite;
	}
</style>
