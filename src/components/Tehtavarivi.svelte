<script lang="ts">
	import { fi } from 'date-fns/locale';
	import { formatDistanceToNow } from 'date-fns';
	import OneIcon from '../lib/icons/MUIOneIcon.svelte';
	import TehtavaDialog from './TehtavaDialog.svelte';
	import { globalState } from '$lib/state.svelte';
	import { toastState } from '$lib/toast.svelte';
	import { writable } from 'svelte/store';

	const customOpen = writable(false);

	type EnrichedTehtava = Tehtava & {
		remainingTime: number;
		edellinenSuoritus: string | null;
	};

	let { tehtava }: { tehtava: EnrichedTehtava } = $props();

	let bgColor: string = $derived.by(() => {
		if (tehtava.remainingTime <= 2) {
			return 'bg-gradient-to-br from-red-500 to-red-600';
		} else if (tehtava.remainingTime <= 3) {
			return 'bg-gradient-to-br from-orange-500 to-orange-600';
		} else if (tehtava.remainingTime <= 5) {
			return 'bg-gradient-to-br from-yellow-500 to-yellow-600';
		} else if (tehtava.remainingTime <= 14) {
			return 'bg-gradient-to-br from-green-500 to-green-600';
		} else {
			return 'bg-gradient-to-br from-emerald-500 to-emerald-600';
		}
	});

	let aikaJaljellaText: string = $derived.by(() => {
		if (tehtava.remainingTime > 0) {
			const futureDate = new Date(Date.now() + tehtava.remainingTime * 24 * 60 * 60 * 1000);
			return formatDistanceToNow(futureDate, { locale: fi });
		} else {
			return 'Suoritusaika on umpeutunut';
		}
	});

	let edellinenSuoritusText: string = $derived.by(() => {
		if (tehtava.edellinenSuoritus) {
			return new Date(tehtava.edellinenSuoritus).toLocaleDateString('fi-FI');
		} else {
			return 'Ei suorituksia';
		}
	});

	// --- Swipe-to-complete logic ---
	let offsetX = $state(0);
	let isDragging = $state(false);
	let isCompleting = $state(false);

	let startX = 0;
	let startY = 0;
	let gestureLocked: 'horizontal' | 'vertical' | null = null;
	let hasMoved = false;

	const SWIPE_THRESHOLD = 90;

	function handleTouchStart(e: TouchEvent) {
		if (isCompleting) return;
		const touch = e.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		gestureLocked = null;
		hasMoved = false;
		isDragging = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || isCompleting) return;
		const touch = e.touches[0];
		const dx = touch.clientX - startX;
		const dy = touch.clientY - startY;

		// Lock gesture direction early
		if (!gestureLocked) {
			if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
				gestureLocked = 'vertical';
				isDragging = false;
				offsetX = 0;
				return;
			} else if (dx > 6) {
				gestureLocked = 'horizontal';
			}
		}

		if (gestureLocked === 'horizontal') {
			hasMoved = true;
			// Only allow dragging to the right (positive dx) with resistance after threshold
			if (dx > 0) {
				offsetX = dx > SWIPE_THRESHOLD ? SWIPE_THRESHOLD + (dx - SWIPE_THRESHOLD) * 0.4 : dx;
			} else {
				offsetX = 0;
			}
		}
	}

	async function handleTouchEnd() {
		if (!isDragging && !hasMoved) return;
		isDragging = false;

		if (offsetX >= SWIPE_THRESHOLD && !isCompleting) {
			// Trigger complete
			isCompleting = true;
			offsetX = 400; // Slide off to right

			if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
				try {
					navigator.vibrate(30);
				} catch {}
			}

			// Complete task
			const result = await globalState.suoritaTehtava(tehtava);

			// Show Undo Toast
			toastState.show(`"${tehtava.nimi}" merkitty suoritetuksi`, {
				actionLabel: 'Kumoa',
				onAction: async () => {
					if (result.suoritusId != null) {
						await globalState.undoSuorita(
							tehtava,
							result.suoritusId,
							result.previousEdellinenSuoritus ?? null
						);
					}
				}
			});

			setTimeout(() => {
				offsetX = 0;
				isCompleting = false;
			}, 300);
		} else {
			// Snap back
			offsetX = 0;
		}
	}

	function handleClick(e: MouseEvent) {
		// Only open dialog if user tapped without swiping
		if (hasMoved || offsetX > 5) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		customOpen.set(true);
	}
</script>

<div class="swipe-container relative mb-2 w-full overflow-hidden rounded-2xl select-none">
	<!-- Green background revealed on swipe right -->
	<div
		class="absolute inset-0 flex items-center justify-start rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 text-white transition-opacity duration-150"
		style="opacity: {Math.min(1, offsetX / (SWIPE_THRESHOLD * 0.75))};"
	>
		<div class="flex items-center gap-2 font-bold text-base tracking-wide">
			<svg
				class="size-6 transition-transform duration-150"
				style="transform: scale({offsetX >= SWIPE_THRESHOLD ? 1.25 : 1});"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
			</svg>
			<span>{offsetX >= SWIPE_THRESHOLD ? 'Vapauta suorittaaksesi!' : 'Suorita'}</span>
		</div>
	</div>

	<!-- Main front task card -->
	<button
		type="button"
		onclick={handleClick}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		ontouchcancel={handleTouchEnd}
		class="task-card w-full rounded-2xl {bgColor} p-3 shadow-lg active:scale-[0.99] text-left"
		style="transform: translateX({offsetX}px); transition: {isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'};"
	>
		<div class="flex flex-col gap-1">
			<div class="flex flex-row items-start justify-between">
				<p class="overflow-x-hidden text-left text-lg font-semibold text-white">
					{tehtava.nimi}
				</p>
				{#if tehtava.kertasuoritus}
					<div class="flex-shrink-0 rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
						<OneIcon />
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-1 text-sm text-white/90">
				<div class="flex items-center justify-start gap-2">
					<span class="opacity-80">Edellinen:</span>
					<span class="font-medium">{edellinenSuoritusText}</span>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="opacity-80">Aikaa jäljellä:</span>
						<span class="font-medium">{aikaJaljellaText}</span>
					</div>
					<span
						class="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-800 shadow-sm"
					>
						{tehtava.suoritusvali}pv
					</span>
				</div>
			</div>
		</div>
	</button>
</div>

<TehtavaDialog {customOpen} {tehtava} />

<style>
	.swipe-container {
		touch-action: pan-y;
	}

	.task-card {
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		min-height: 60px;
		position: relative;
		overflow: hidden;
		touch-action: pan-y;
	}

	.task-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
		pointer-events: none;
	}

	.task-card:active {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	@media (hover: hover) {
		.task-card:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
		}
	}
</style>
