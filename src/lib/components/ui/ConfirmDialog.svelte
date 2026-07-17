<script lang="ts">
	import { AlertTriangle } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		loading?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
	}

	let {
		open,
		title = 'Are you sure?',
		message = 'This action cannot be undone.',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();
</script>

<Modal {open} {title} size="sm" onclose={oncancel}>
	<div class="flex items-start gap-4">
		<div class="dark:bg-danger-900/30 rounded-full bg-danger-100 p-2">
			<AlertTriangle class="h-6 w-6 text-danger-500" />
		</div>
		<div>
			<p class="text-muted text-sm">{message}</p>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={oncancel} disabled={loading}>{cancelText}</Button>
		<Button variant="danger" onclick={onconfirm} {loading}>{confirmText}</Button>
	{/snippet}
</Modal>
