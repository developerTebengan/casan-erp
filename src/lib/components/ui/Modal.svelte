<script lang="ts">
	import { X } from '@lucide/svelte';
	import { classNames } from '$lib/utils/format';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		onclose?: () => void;
	}

	let { open, title, size = 'md', children, footer, onclose }: Props = $props();

	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
			onclick={onclose}
			transition:fade={{ duration: 150 }}
			aria-hidden="true"
		></div>
		<div
			class={classNames('bg-card relative w-full rounded-2xl p-6 shadow-xl', sizes[size])}
			transition:fly={{ y: 16, duration: 200 }}
		>
			{#if title}
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-main text-xl font-semibold">{title}</h2>
					<button
						type="button"
						class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
						onclick={onclose}
						aria-label="Close modal"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			{/if}
			<div class="text-main">{@render children?.()}</div>
			{#if footer}
				<div class="border-theme mt-6 flex justify-end gap-3 border-t pt-4">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
