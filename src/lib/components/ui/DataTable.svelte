<script lang="ts" generics="T">
	import { classNames } from '$lib/utils/format';

	interface Column<TData> {
		key: string;
		header: string;
		class?: string;
		cell?: (row: TData) => string;
	}

	interface Props<TData> {
		columns: Column<TData>[];
		rows: TData[];
		loading?: boolean;
		class?: string;
		onrowclick?: (row: TData, event: MouseEvent) => void;
	}

	let { columns, rows, loading = false, class: className = '', onrowclick }: Props<T> = $props();
</script>

<div
	class={classNames('border-theme bg-card overflow-hidden rounded-xl border shadow-sm', className)}
>
	<div class="overflow-x-auto">
		<table class="w-full min-w-[640px]">
			<thead class="bg-slate-50 dark:bg-slate-800/50">
				<tr>
					{#each columns as column}
						<th
							class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
						>
							{column.header}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-theme divide-y">
				{#if loading}
					<tr>
						<td colspan={columns.length} class="text-muted px-6 py-12 text-center text-sm">
							<div class="flex justify-center">
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
								></div>
							</div>
						</td>
					</tr>
				{:else}
					{#each rows as row}
						<tr
							class={classNames(
								'transition-colors',
								onrowclick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
							)}
							onclick={(e) => onrowclick?.(row, e)}
						>
							{#each columns as column}
								<td class="text-main px-6 py-4 text-sm {column.class ?? ''}">
									{#if column.cell}
										{@html column.cell(row)}
									{:else}
										{String((row as Record<string, unknown>)[column.key] ?? '-')}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
