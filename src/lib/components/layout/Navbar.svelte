<script lang="ts">
	import { Menu, Sun, Moon, Bell } from '@lucide/svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { classNames } from '$lib/utils/format';
	import type { User } from '$lib/types';

	interface Props {
		user?: User | null;
		class?: string;
	}

	let { user, class: className = '' }: Props = $props();
</script>

<header
	class={classNames(
		'border-theme bg-card/80 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur-md sm:px-6 lg:px-8',
		className
	)}
>
	<div class="flex items-center gap-4">
		<button
			type="button"
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
			onclick={() => sidebarStore.open()}
			aria-label="Open menu"
		>
			<Menu class="h-5 w-5" />
		</button>
		<h1 class="text-main text-lg font-semibold sm:text-xl">Casan ERP</h1>
	</div>

	<div class="flex items-center gap-2 sm:gap-4">
		<div class="border-theme flex rounded-lg border text-xs font-semibold">
			<button
				type="button"
				class={localeStore.value === 'id'
					? 'bg-primary-50 px-2 py-1 text-primary-700'
					: 'text-muted px-2 py-1'}
				onclick={() => localeStore.set('id')}
			>
				ID
			</button>
			<button
				type="button"
				class={localeStore.value === 'en'
					? 'bg-primary-50 px-2 py-1 text-primary-700'
					: 'text-muted px-2 py-1'}
				onclick={() => localeStore.set('en')}
			>
				EN
			</button>
		</div>
		<button
			type="button"
			class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
			aria-label="Notifications"
		>
			<Bell class="h-5 w-5" />
			<span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger-500"></span>
		</button>
		<button
			type="button"
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
			onclick={() => themeStore.toggle()}
			aria-label="Toggle theme"
		>
			{#if themeStore.value === 'dark'}
				<Sun class="h-5 w-5" />
			{:else}
				<Moon class="h-5 w-5" />
			{/if}
		</button>
		{#if user}
			<div class="hidden items-center gap-3 sm:flex">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30"
				>
					<span class="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
				</div>
				<div class="hidden md:block">
					<p class="text-main text-sm font-medium">{user.name}</p>
					<p class="text-muted text-xs">{user.role}</p>
				</div>
			</div>
		{/if}
	</div>
</header>
