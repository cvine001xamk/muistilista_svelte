<script lang="ts">
	import PlusIcon from '../lib/icons/PlusIcon.svelte';
	import SheetIcon from '../lib/icons/SheetIcon.svelte';
	import ShoppingIcon from '$lib/icons/ShoppingIcon.svelte';
	import FruitIcon from '$lib/icons/FruitIcon.svelte';
	import { page } from '$app/stores';

	import { globalState } from '$lib/state.svelte';

	// Get current route for active state
	$: currentPath = $page.url.pathname;
</script>

<!-- Desktop Navigation (Top) -->
<div class="hidden bg-gradient-to-r from-purple-600 to-pink-600 p-3 shadow-lg md:block">
	<div class="flex flex-row items-center justify-evenly gap-4">
		<a href="/">
			<h1 class="neon text-3xl">muistilista</h1>
		</a>
		<a
			href="/lisaa"
			class="btn btn-primary flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/30"
			aria-label="Lisää tehtävä"
		>
			<PlusIcon />
			<span class="hidden lg:inline">Lisää</span>
		</a>
		<a
			href="/suoritukset"
			class="btn btn-primary flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/30"
			aria-label="Suoritukset"
		>
			<SheetIcon />
			<span class="hidden lg:inline">Suoritukset</span>
		</a>
		<a
			href="/ostoslista"
			class="btn btn-primary flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/30"
			aria-label="Ostoslista"
		>
			<ShoppingIcon />
			<span class="hidden lg:inline">Ostoslista</span>
		</a>
		<a
			href="/sesongissa"
			class="btn btn-primary flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/30"
			aria-label="Sesonkikalenteri"
		>
			<FruitIcon />
			<span class="hidden lg:inline">Sesongissa</span>
		</a>
	</div>
</div>

<!-- Mobile Top Bar (Logo) -->
<div class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 p-3 shadow-lg md:hidden">
	<div class="flex flex-row items-center justify-center">
		<a href="/">
			<h1 class="neon text-2xl">muistilista</h1>
		</a>
	</div>
</div>

<!-- Mobile Navigation (Bottom) -->
<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-gradient-to-r from-purple-600 to-pink-600 pb-safe backdrop-blur-lg md:hidden"
>
	<div class="flex items-center justify-around px-2 py-2">
		<a
			href="/"
			class="nav-item {currentPath === '/' ? 'active' : ''}"
			aria-label="Tehtävät"
		>
			<div class="nav-icon relative">
				<SheetIcon />
				{#if globalState.tasksWithLessThanOneDay > 0}
					<span
						class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm"
					>
						{globalState.tasksWithLessThanOneDay}
					</span>
				{/if}
			</div>
			<span class="nav-label">Tehtävät</span>
		</a>

		<a
			href="/suoritukset"
			class="nav-item {currentPath === '/suoritukset' ? 'active' : ''}"
			aria-label="Suoritukset"
		>
			<div class="nav-icon">
				<SheetIcon />
			</div>
			<span class="nav-label">Suoritukset</span>
		</a>
		
		<a
		href="/lisaa"
		class="fab-button"
		aria-label="Lisää tehtävä"
		>
		<PlusIcon />
	</a>
	<a
		href="/ostoslista"
		class="nav-item {currentPath === '/ostoslista' ? 'active' : ''}"
		aria-label="Ostoslista"
	>
		<div class="nav-icon">
			<ShoppingIcon />
		</div>
		<span class="nav-label">Ostokset</span>
	</a>


		<a
			href="/sesongissa"
			class="nav-item {currentPath === '/sesongissa' ? 'active' : ''}"
			aria-label="Sesongissa"
		>
			<div class="nav-icon">
				<FruitIcon />
			</div>
			<span class="nav-label">Sesongissa</span>
		</a>
	</div>
</nav>

<style>
	@keyframes flicker {
		0% {
			opacity: 1;
			filter: drop-shadow(0 0 8px #fbbf24);
		}
		50% {
			opacity: 0.85;
			filter: drop-shadow(0 0 14px #fbbf24);
		}
		100% {
			opacity: 1;
			filter: drop-shadow(0 0 8px #fbbf24);
		}
	}

	@keyframes glow {
		0% {
			filter: drop-shadow(0 0 10px #fbbf24);
		}
		50% {
			filter: drop-shadow(0 0 22px #fbbf24);
		}
		100% {
			filter: drop-shadow(0 0 10px #fbbf24);
		}
	}

	.neon {
		animation:
			flicker 1.5s infinite alternate,
			glow 2s infinite ease-in-out;
	}

	/* Mobile Navigation Styles */
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		min-width: 60px;
		min-height: 48px;
		color: rgba(255, 255, 255, 0.7);
		transition: all 0.2s ease;
		border-radius: 0.75rem;
	}

	.nav-item:active {
		transform: scale(0.95);
	}

	.nav-item.active {
		color: white;
		background: rgba(255, 255, 255, 0.15);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
	}

	.nav-label {
		font-size: 0.65rem;
		font-weight: 500;
		text-align: center;
		line-height: 1;
	}

	.fab-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		margin: -1.5rem 0;
		background: linear-gradient(135deg, #ec4899, #f43f5e);
		border-radius: 50%;
		box-shadow:
			0 4px 12px rgba(236, 72, 153, 0.4),
			0 0 0 4px rgba(255, 255, 255, 0.1);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		color: white;
	}

	.fab-button:active {
		transform: scale(0.9);
	}

	.fab-button:hover {
		box-shadow:
			0 6px 20px rgba(236, 72, 153, 0.5),
			0 0 0 4px rgba(255, 255, 255, 0.15);
		transform: scale(1.05);
	}

	/* Safe area support for iOS */
	@supports (padding-bottom: env(safe-area-inset-bottom)) {
		.pb-safe {
			padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
		}
	}
</style>
