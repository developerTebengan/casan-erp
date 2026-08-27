<script lang="ts">
	import { classNames } from '$lib/utils/format';
	import Input from './Input.svelte';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		label?: string;
		name?: string;
		id?: string;
		value?: string;
		options: Option[];
		placeholder?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		onchange?: (e: Event) => void;
	}

	let {
		label,
		name,
		id,
		value = $bindable(''),
		options,
		placeholder,
		error,
		disabled = false,
		required = false,
		class: className = '',
		onchange
	}: Props = $props();

	const inputId = $derived(id ?? name ?? crypto.randomUUID());

	let open = $state(false);
	let query = $state('');

	const filteredOptions = $derived(
		options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
	);

	$effect(() => {
		const selected = options.find((o) => o.value === value);
		if (!open && selected) query = selected.label;
	});

	function selectOption(option: Option) {
		value = option.value;
		query = option.label;
		open = false;
		onchange?.({ target: { value: option.value } } as unknown as Event);
	}

	function handleInput() {
		open = true;
	}

	function handleFocus() {
		open = true;
	}

	function handleBlur() {
		setTimeout(() => (open = false), 150);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && open && filteredOptions.length > 0) {
			e.preventDefault();
			selectOption(filteredOptions[0]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class={classNames('relative', className)}>
	<Input
		{label}
		id={inputId}
		{name}
		{placeholder}
		{disabled}
		{required}
		bind:value={query}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		{error}
	/>
	{#if open && !disabled}
		<ul
			class="border-theme bg-card absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg"
			role="listbox"
		>
			{#each filteredOptions as option}
				<li role="option" aria-selected={option.value === value}>
					<button
						type="button"
						class="text-main w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
						onclick={() => selectOption(option)}
					>
						{option.label}
					</button>
				</li>
			{:else}
				<li class="text-muted px-4 py-2 text-sm">No matches</li>
			{/each}
		</ul>
	{/if}
</div>
