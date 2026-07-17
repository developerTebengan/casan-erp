<script lang="ts">
	import { classNames } from '$lib/utils/format';

	interface Props {
		class?: string;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		children?: import('svelte').Snippet;
	}

	let { class: className = '', padding = 'md', children }: Props = $props();

	const paddings = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};
</script>

<div
	class={classNames(
		'border-theme bg-card text-main rounded-xl border shadow-sm transition-shadow duration-200 hover:shadow-md',
		paddings[padding],
		className
	)}
>
	{@render children?.()}
</div>
