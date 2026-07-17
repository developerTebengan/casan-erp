<script lang="ts">
	import { PackageOpen } from '@lucide/svelte';

	interface Props {
		title?: string;
		description?: string;
		children?: import('svelte').Snippet;
	}

	let {
		title = 'No data found',
		description = 'There are no items to display at the moment.',
		children
	}: Props = $props();
</script>

<div
	class="border-theme bg-card flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center"
>
	<div class="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
		<PackageOpen class="h-8 w-8 text-slate-400" />
	</div>
	<h3 class="text-main text-lg font-semibold">{title}</h3>
	<p class="text-muted mt-1 max-w-sm text-sm">{description}</p>
	{#if children}
		<div class="mt-4">{@render children()}</div>
	{/if}
</div>
