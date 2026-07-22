<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Button from './Button.svelte';

	interface Props {
		page: number;
		totalPages: number;
		total: number;
		onpagechange: (page: number) => void;
		class?: string;
	}

	let { page, totalPages, total, onpagechange, class: className = '' }: Props = $props();

	function getPages(): (number | string)[] {
		const pages: (number | string)[] = [];
		if (totalPages <= 5) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (page <= 3) {
				pages.push(1, 2, 3, 4, '...', totalPages);
			} else if (page >= totalPages - 2) {
				pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
			} else {
				pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
			}
		}
		return pages;
	}
</script>

{#if totalPages > 0}
	<div class="flex flex-col items-center justify-between gap-4 py-4 sm:flex-row {className}">
		<p class="text-muted text-sm">
			Showing page <span class="text-main font-medium">{page}</span> of
			<span class="text-main font-medium">{totalPages}</span>
			({total} total)
		</p>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={page <= 1}
				onclick={() => onpagechange(page - 1)}
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			{#each getPages() as p}
				{#if p === '...'}
					<span class="px-2 text-slate-400">...</span>
				{:else}
					<Button
						variant={page === p ? 'primary' : 'outline'}
						size="sm"
						onclick={() => onpagechange(Number(p))}
					>
						{p}
					</Button>
				{/if}
			{/each}
			<Button
				variant="outline"
				size="sm"
				disabled={page >= totalPages}
				onclick={() => onpagechange(page + 1)}
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}
