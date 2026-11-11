<script lang="ts">
	import { toastState, type ToastItem } from '$lib/toast.svelte';
	import { fly } from 'svelte/transition';

	async function handleAction(toast: ToastItem) {
		if (toast.onAction) {
			await toast.onAction();
		}
		toastState.dismiss(toast.id);
	}
</script>

{#if toastState.toasts.length > 0}
	<div
		class="fixed bottom-20 left-1/2 z-50 flex w-[90vw] max-w-md -translate-x-1/2 flex-col gap-2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0"
		aria-live="polite"
	>
		{#each toastState.toasts as toast (toast.id)}
			<div
				transition:fly={{ y: 20, duration: 250 }}
				class="flex items-center justify-between gap-3 rounded-xl bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md border border-white/10"
			>
				<p class="text-sm font-medium leading-snug">{toast.message}</p>

				<div class="flex items-center gap-2 flex-shrink-0">
					{#if toast.actionLabel}
						<button
							onclick={() => handleAction(toast)}
							class="rounded-lg bg-pink-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-pink-500 active:scale-95"
						>
							{toast.actionLabel}
						</button>
					{/if}

					<button
						onclick={() => toastState.dismiss(toast.id)}
						class="text-white/60 hover:text-white text-base leading-none p-1"
						aria-label="Sulje ilmoitus"
					>
						✕
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

