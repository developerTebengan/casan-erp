<script lang="ts">
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from '@lucide/svelte';
	import { toastStore, type ToastType } from '$lib/stores/toast.svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		id: string;
		message: string;
		type: ToastType;
	}

	let { id, message, type }: Props = $props();

	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};

	const styles = $derived({
		success: 'bg-success-500 text-white',
		error: 'bg-danger-500 text-white',
		warning: 'bg-warning-500 text-white',
		info: 'bg-primary-600 text-white'
	});

	const Icon = $derived(icons[type]);
	const styleClasses = $derived(styles[type]);
</script>

<div
	class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg px-4 py-3 shadow-lg {styleClasses}"
	role="alert"
	transition:fly={{ x: 100, duration: 200 }}
>
	<Icon class="h-5 w-5 shrink-0" />
	<p class="flex-1 text-sm font-medium">{message}</p>
	<button
		type="button"
		class="rounded p-1 hover:bg-white/20"
		onclick={() => toastStore.remove(id)}
		aria-label="Dismiss notification"
	>
		<X class="h-4 w-4" />
	</button>
</div>
