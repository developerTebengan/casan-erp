<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		localeStore.init();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
