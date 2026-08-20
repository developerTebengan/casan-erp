<script lang="ts">
	import { classNames } from '$lib/utils/format';

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
</script>

<div class={classNames('w-full', className)}>
	{#if label}
		<label for={inputId} class="text-main mb-1.5 block text-sm font-medium">
			{label}
			{#if required}<span class="text-danger-500">*</span>{/if}
		</label>
	{/if}
	<select
		{name}
		id={inputId}
		{disabled}
		{required}
		bind:value
		{onchange}
		class={classNames(
			'bg-card text-main w-full appearance-none rounded-lg border px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800',
			error ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500/20' : 'border-theme'
		)}
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if error}
		<p class="mt-1 text-sm text-danger-500">{error}</p>
	{/if}
</div>
