<script lang="ts">
	import { classNames } from '$lib/utils/format';

	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		href?: string;
		class?: string;
		children?: import('svelte').Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		href,
		class: className = '',
		children,
		onclick
	}: Props = $props();

	const baseStyles =
		'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variants = {
		primary:
			'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm dark:bg-primary-600 dark:hover:bg-primary-500',
		secondary:
			'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
		outline:
			'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
		danger:
			'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500 dark:bg-danger-600 dark:hover:bg-danger-500',
		ghost:
			'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2.5 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const classes = $derived(classNames(baseStyles, variants[variant], sizes[size], className));
</script>

{#if href}
	<a {href} class={classes} aria-disabled={disabled || loading}>
		{#if loading}
			<svg
				class="h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		{/if}
		{@render children?.()}
	</a>
{:else}
	<button {type} class={classes} disabled={disabled || loading} {onclick}>
		{#if loading}
			<svg
				class="h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		{/if}
		{@render children?.()}
	</button>
{/if}
