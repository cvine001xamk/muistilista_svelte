<script lang="ts">
	import { createDialog, melt } from '@melt-ui/svelte';
	const {
		elements: { portalled, overlay, content, title }
	} = createDialog();
</script>

<div use:melt={$portalled}>
	<div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50">
		<div
			use:melt={$content}
			class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2
                    flex-col gap-4 rounded-xl bg-white p-6 shadow-lg"
		>
			<h2 use:melt={$title}>Title</h2>
			<button
				class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100 px-4 text-zinc-600"
			>
				Sulje
			</button>
		</div>
	</div>
</div>
