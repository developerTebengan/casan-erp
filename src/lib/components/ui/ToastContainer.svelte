<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import Toast from './Toast.svelte';
</script>

<div
	class="fixed right-4 bottom-4 z-[100] flex flex-col gap-2"
	aria-live="polite"
	aria-atomic="true"
>
	{#each toastStore.items as toast (toast.id)}
		<Toast id={toast.id} message={toast.message} type={toast.type} />
	{/each}
</div>
