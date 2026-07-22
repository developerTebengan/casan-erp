<script lang="ts">
	import { ChevronRight, Home } from '@lucide/svelte';
	import { classNames } from '$lib/utils/format';

	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		items: Crumb[];
		class?: string;
	}

	let { items, class: className = '' }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class={classNames('mb-4', className)}>
	<ol class="flex flex-wrap items-center gap-2 text-sm">
		<li>
			<a
				href="/dashboard"
				class="flex items-center text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
			>
				<Home class="h-4 w-4" />
			</a>
		</li>
		{#each items as item, index}
			<li class="flex items-center gap-2">
				<ChevronRight class="h-4 w-4 text-slate-400" />
				{#if item.href && index < items.length - 1}
					<a
						href={item.href}
						class="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
					>
						{item.label}
					</a>
				{:else}
					<span class="text-main font-medium">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
