<script lang="ts">
	import { classNames } from '$lib/utils/format';
	import { filterOptions, type ComboboxOption } from '$lib/ui/comboboxFilter';

	interface Props {
		label?: string;
		name?: string;
		id?: string;
		value?: string;
		options: ComboboxOption[];
		placeholder?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		onchange?: () => void;
	}

	let {
		label,
		name,
		id,
		value = $bindable(''),
		options,
		placeholder = 'Search…',
		error,
		disabled = false,
		required = false,
		class: className = '',
		onchange
	}: Props = $props();

	const inputId = $derived(id ?? name ?? crypto.randomUUID());
	let open = $state(false);
	let query = $state('');
	let highlight = $state(0);

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');
	const filtered = $derived(filterOptions(options, query));
	const display = $derived(open ? query : selectedLabel);

	function select(next: string) {
		value = next;
		query = '';
		open = false;
		onchange?.();
	}

	function onInput(e: Event) {
		query = (e.target as HTMLInputElement).value;
		open = true;
		highlight = 0;
		if (value) {
			value = '';
			onchange?.();
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			query = '';
			return;
		}
		if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
			open = true;
			query = selectedLabel;
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(highlight + 1, filtered.length - 1);
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(highlight - 1, 0);
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const pick = filtered[highlight];
			if (pick) select(pick.value);
		}
	}
</script>

<div class={classNames('relative w-full', className)}>
	{#if label}
		<label for={inputId} class="text-main mb-1.5 block text-sm font-medium">
			{label}
			{#if required}<span class="text-danger-500">*</span>{/if}
		</label>
	{/if}
	<input type="hidden" {name} value={value} />
	<input
		id={inputId}
		type="text"
		role="combobox"
		autocomplete="off"
		aria-expanded={open}
		aria-controls="{inputId}-list"
		{disabled}
		placeholder={placeholder}
		value={display}
		oninput={onInput}
		onkeydown={onKey}
		onfocus={() => {
			open = true;
			query = selectedLabel;
		}}
		onblur={() => {
			setTimeout(() => {
				open = false;
				query = '';
			}, 150);
		}}
		class={classNames(
			'bg-card text-main w-full rounded-lg border px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800',
			error
				? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500/20'
				: 'border-theme'
		)}
	/>
	{#if open && filtered.length > 0}
		<ul
			id="{inputId}-list"
			role="listbox"
			class="border-theme bg-card absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border py-1 shadow-lg"
		>
			{#each filtered as option, i}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={option.value === value}
						class={classNames(
							'text-main w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
							i === highlight ? 'bg-slate-100 dark:bg-slate-800' : ''
						)}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => select(option.value)}
					>
						{option.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if error}
		<p class="mt-1 text-sm text-danger-500">{error}</p>
	{/if}
</div>
