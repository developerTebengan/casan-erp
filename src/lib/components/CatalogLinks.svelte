<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import { Button, Select } from '$lib/components/ui';

	interface Item {
		id: string;
		label: string;
	}

	interface Props {
		items: Item[];
		options: Item[];
		canWrite?: boolean;
		emptyLabel?: string;
		addLabel?: string;
		onadd: (id: string) => Promise<void>;
		onremove: (id: string) => Promise<void>;
	}

	let {
		items,
		options,
		canWrite = false,
		emptyLabel = 'None yet',
		addLabel = 'Add',
		onadd,
		onremove
	}: Props = $props();

	let pick = $state('');
	let busy = $state(false);

	const available = $derived([
		{ value: '', label: 'Select…' },
		...options
			.filter((opt) => !items.some((item) => item.id === opt.id))
			.map((opt) => ({ value: opt.id, label: opt.label }))
	]);

	async function add() {
		if (!pick || busy) return;
		busy = true;
		try {
			await onadd(pick);
			pick = '';
		} finally {
			busy = false;
		}
	}

	async function remove(id: string) {
		if (busy) return;
		busy = true;
		try {
			await onremove(id);
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-3">
	{#if items.length === 0}
		<p class="text-muted text-sm">{emptyLabel}</p>
	{:else}
		<ul class="space-y-2">
			{#each items as item (item.id)}
				<li class="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
					<span class="text-main text-sm">{item.label}</span>
					{#if canWrite}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="text-danger-500 hover:text-danger-600"
							onclick={() => remove(item.id)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if canWrite && available.length > 1}
		<div class="flex items-end gap-2">
			<div class="flex-1">
				<Select label={addLabel} options={available} bind:value={pick} />
			</div>
			<Button type="button" variant="secondary" loading={busy} onclick={add}>
				<Plus class="h-4 w-4" />
				Add
			</Button>
		</div>
	{/if}
</div>
