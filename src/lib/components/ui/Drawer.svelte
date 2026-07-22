<script lang="ts">
	import { X } from '@lucide/svelte';
	import { classNames } from '$lib/utils/format';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		title?: string;
		position?: 'left' | 'right';
		children?: import('svelte').Snippet;
		onclose?: () => void;
	}

	let { open, title, position = 'left', children, onclose }: Props = $props();

	const positionClasses = {
		left: 'left-0 h-full w-72 max-w-[85vw]',
		right: 'right-0 h-full w-72 max-w-[85vw]'
	};

	const flyParams = {
		left: { x: -100, duration: 200 },
		right: { x: 100, duration: 200 }
	};

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true">
		<div
			class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
			onclick={onclose}
			transition:fade={{ duration: 150 }}
			aria-hidden="true"
		></div>
		<div
			class={classNames('bg-card absolute top-0 shadow-2xl', positionClasses[position])}
			transition:fly={flyParams[position]}
		>
			<div class="flex h-full flex-col">
				<div class="border-theme flex items-center justify-between border-b p-4">
					<h2 class="text-main text-lg font-semibold">{title ?? ''}</h2>
					<button
						type="button"
						class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
						onclick={onclose}
						aria-label="Close drawer"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
				<div class="flex-1 overflow-y-auto p-4">{@render children?.()}</div>
			</div>
		</div>
	</div>
{/if}
