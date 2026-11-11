<script lang="ts">
	let { class: className = 'size-6', ...restProps } = $props<{ class?: string; [key: string]: any }>();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	{...restProps}
>
	<path d="M5 12h14" />
	<path d="M12 5v14" />
</svg>
