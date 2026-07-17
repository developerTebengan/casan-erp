<script lang="ts">
	import { Drawer } from '$lib/components/ui';
	import Sidebar from './Sidebar.svelte';
	import Navbar from './Navbar.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	import type { User } from '$lib/types';

	interface Props {
		user: User | null;
		children?: import('svelte').Snippet;
	}

	let { user, children }: Props = $props();

	onMount(() => {
		themeStore.init();
		if (user) authStore.set(user);
	});

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		authStore.clear();
		goto('/login');
	}
</script>

<div class="bg-body min-h-screen">
	<div class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
		<Sidebar {user} onlogout={handleLogout} />
	</div>

	<Drawer
		open={sidebarStore.isOpen}
		title="Menu"
		position="left"
		onclose={() => sidebarStore.close()}
	>
		<Sidebar
			{user}
			onlogout={() => {
				sidebarStore.close();
				handleLogout();
			}}
		/>
	</Drawer>

	<div class="lg:pl-64">
		<Navbar {user} />
		<main class="min-h-[calc(100vh-4rem)] px-4 pt-6 pb-24 sm:px-6 lg:px-8">
			{@render children?.()}
		</main>
	</div>
</div>
