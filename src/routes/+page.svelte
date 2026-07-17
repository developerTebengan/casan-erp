<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	onMount(() => {
		goto('/dashboard');
	});
</script>

<div class="bg-body flex min-h-screen items-center justify-center">
	<Spinner size="lg" />
</div>
