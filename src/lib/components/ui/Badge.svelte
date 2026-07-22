<script lang="ts">
	import { classNames } from '$lib/utils/format';

	interface Props {
		variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
		size?: 'sm' | 'md';
		children?: import('svelte').Snippet;
	}

	let { variant = 'secondary', size = 'sm', children }: Props = $props();

	const variants = {
		primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-600',
		success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600',
		warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600',
		danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600',
		secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
	};

	const sizes = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-sm'
	};
</script>

<span
	class={classNames(
		'inline-flex items-center rounded-full font-medium',
		variants[variant],
		sizes[size]
	)}
>
	{@render children?.()}
</span>
