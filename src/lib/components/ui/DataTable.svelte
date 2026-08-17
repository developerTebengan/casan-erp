<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { classNames } from '$lib/utils/format';
	import { t } from '$lib/i18n';
	import { localeStore } from '$lib/stores/locale.svelte';
	import EmptyState from './EmptyState.svelte';

	interface Column<TData> {
		key: string;
		header: string;
		class?: string;
		cell?: (row: TData) => string;
		render?: Snippet<[TData]>;
		sortKey?: string;
	}

	interface Props<TData> {
		columns: Column<TData>[];
		rows: TData[];
		loading?: boolean;
		class?: string;
		onrowclick?: (row: TData, event: MouseEvent) => void;
		empty?: Snippet;
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		onsort?: (key: string, nextDir: 'asc' | 'desc') => void;
	}

	let {
		columns,
		rows,
		loading = false,
		class: className = '',
		onrowclick,
		empty,
		sortKey,
		sortDir = 'asc',
		onsort
	}: Props<T> = $props();

	function toggleSort(key: string) {
		const nextDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
		onsort?.(key, nextDir);
	}
</script>

{#if !loading && rows.length === 0}
	<EmptyState
		title={t('table.empty', localeStore.value)}
		description={t('table.emptyHint', localeStore.value)}
	>
		{#if empty}
			{@render empty()}
		{/if}
	</EmptyState>
{:else}
	<div
		class={classNames(
			'border-theme bg-card overflow-hidden rounded-xl border shadow-sm',
			className
		)}
	>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-slate-50 dark:bg-slate-400/50">
					<tr>
						{#each columns as column}
							<th
								class="text-muted px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
								aria-sort={column.sortKey && sortKey === column.sortKey
									? sortDir === 'asc'
										? 'ascending'
										: 'descending'
									: undefined}
							>
								{#if column.sortKey && onsort}
									<button
										type="button"
										class="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
										onclick={() => toggleSort(column.sortKey!)}
									>
										{column.header}
										{#if sortKey === column.sortKey}
											<span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
										{/if}
									</button>
								{:else}
									{column.header}
								{/if}
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
									onrowclick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-200/50' : ''
								)}
								onclick={(e) => onrowclick?.(row, e)}
							>
								{#each columns as column}
									<td class="text-main px-6 py-4 text-sm {column.class ?? ''}">
										{#if column.render}
											{@render column.render(row)}
										{:else if column.cell}
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
{/if}
