<script lang="ts">
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { data, children } = $props();
</script>

<AppLayout user={data.user} unreadCount={data.unreadCount} waitingCount={data.waitingCount}>
	{@render children()}
</AppLayout>

<ToastContainer />
