<script lang="ts">
	import { classNames } from '$lib/utils/format';

	interface Props {
		label?: string;
		type?: string;
		name?: string;
		id?: string;
		value?: string | number;
		placeholder?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		min?: string | number;
		max?: string | number;
		class?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	}

	let {
		label,
		type = 'text',
		name,
		id,
		value = $bindable(''),
		placeholder,
		error,
		disabled = false,
		required = false,
		min,
		max,
		class: className = '',
		oninput,
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
	<input
		{type}
		{name}
		id={inputId}
		{placeholder}
		{disabled}
		{required}
		bind:value
		{min}
		{max}
		{oninput}
		{onchange}
		class={classNames(
			'bg-card text-main w-full rounded-lg border px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800',
			error ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500/20' : 'border-theme'
		)}
	/>
	{#if error}
		<p class="mt-1 text-sm text-danger-500">{error}</p>
	{/if}
</div>
