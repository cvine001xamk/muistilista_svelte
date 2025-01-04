<script lang="ts">
	import { createDialog, melt } from '@melt-ui/svelte';

	export let tehtava: Tehtava;
	export let suorita: () => void;
	export let poista: () => void;
	export let clickCount: number;

	const {
		elements: { trigger, portalled, overlay, content, title, description, close },
		states: { open }
	} = createDialog();
</script>

{#if $open}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
			<div
				use:melt={$content}
				class="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2
					flex-col gap-4 rounded-xl bg-white
					p-6 shadow-lg"
			>
				<h2 use:melt={$title}>{tehtava.nimi}</h2>
				<p use:melt={$description}>Juttua</p>
				<button
					on:click={suorita}
					class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100 px-4 text-zinc-600"
				>
					Suorita
				</button>
				<button
					on:click={poista}
					class="inline-flex h-8 items-center justify-center rounded-sm
						{clickCount === 0 ? 'bg-red-300' : 'bg-red-600'} px-4 text-zinc-600"
				>
					{clickCount === 0 ? 'Poista' : 'Vahvista poisto?'}
				</button>
				<button
					use:melt={$close}
					class="inline-flex h-8 items-center justify-center rounded-sm
				bg-zinc-100 px-4 text-zinc-600"
				>
					Sulje
				</button>
			</div>
		</div>
	</div>
{/if}
