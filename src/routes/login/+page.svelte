<script lang="ts">
	import { Package, Eye, EyeOff } from '@lucide/svelte';
	import { Button, Input } from '$lib/components/ui';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { t, roleLabel } from '$lib/i18n';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import type { UserRole } from '$lib/types';

	const showDemo = env.PUBLIC_SHOW_DEMO_LOGINS !== 'false';

	const DEMO_ACCOUNTS: { name: string; email: string; role: UserRole; password: string }[] = [
		{ name: 'Admin User', email: 'admin@casanerp.com', role: 'ADMIN', password: 'password' },
		{ name: 'John Doe', email: 'user@casanerp.com', role: 'USER', password: 'password' },
		{
			name: 'Budi Santoso',
			email: 'dept.head@casanerp.com',
			role: 'DEPARTMENT_HEAD',
			password: 'password'
		},
		{ name: 'Siti Aminah', email: 'finance@casanerp.com', role: 'FINANCE', password: 'password' },
		{ name: 'Ahmad Wijaya', email: 'manager@casanerp.com', role: 'MANAGER', password: 'password' },
		{ name: 'Dewi Kusuma', email: 'director@casanerp.com', role: 'DIRECTOR', password: 'password' }
	];

	interface LoginForm {
		email?: string;
		errors?: Record<string, string>;
	}

	let { form }: { form?: LoginForm } = $props();

	let email = $state(untrack(() => form?.email ?? ''));
	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);

	onMount(() => {
		themeStore.init();
	});

	function handleSubmit() {
		loading = true;
	}
</script>

<div
	class="bg-body relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="absolute top-4 right-4">
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
	</div>
	<div class="w-full max-w-xl space-y-8">
		<div class="text-center">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30"
			>
				<Package class="h-8 w-8" />
			</div>
			<h1 class="text-main mt-6 text-3xl font-bold tracking-tight">Casan ERP</h1>
			<p class="text-muted mt-2 text-sm">{t('page.login', localeStore.value)}</p>
		</div>

		<div class="border-theme bg-card rounded-2xl border p-8 shadow-xl">
			<form method="POST" class="space-y-6" onsubmit={handleSubmit}>
				<Input
					label={t('auth.email', localeStore.value)}
					type="email"
					name="email"
					placeholder={t('auth.email', localeStore.value)}
					required
					bind:value={email}
					error={form?.errors?.email ?? ''}
				/>

				<div class="relative">
					<Input
						label={t('auth.password', localeStore.value)}
						type={showPassword ? 'text' : 'password'}
						name="password"
						placeholder={t('auth.password', localeStore.value)}
						required
						bind:value={password}
						error={form?.errors?.password ?? ''}
					/>
					<button
						type="button"
						class="absolute top-[38px] right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
						onclick={() => (showPassword = !showPassword)}
						aria-label="Toggle password visibility"
					>
						{#if showPassword}
							<EyeOff class="h-4 w-4" />
						{:else}
							<Eye class="h-4 w-4" />
						{/if}
					</button>
				</div>

				{#if form?.errors?.form}
					<p
						class="dark:bg-danger-900/20 dark:text-danger-400 rounded-lg bg-danger-50 p-3 text-sm text-danger-600"
					>
						{form.errors.form}
					</p>
				{/if}

				<Button type="submit" variant="primary" size="lg" class="w-full" {loading}
					>{t('auth.signIn', localeStore.value)}</Button
				>
			</form>

			{#if showDemo}
				<div
					class="border-theme mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
				>
					<p class="mb-3 font-semibold text-slate-900 dark:text-white">
						{t('auth.demoTitle', localeStore.value)}
					</p>
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs">
							<thead>
								<tr class="text-muted border-b border-slate-200 dark:border-slate-700">
									<th class="py-1.5 pr-3 font-semibold">{t('auth.demoName', localeStore.value)}</th>
									<th class="py-1.5 pr-3 font-semibold">{t('auth.demoPosition', localeStore.value)}</th>
									<th class="py-1.5 font-semibold">{t('auth.password', localeStore.value)}</th>
								</tr>
							</thead>
							<tbody>
								{#each DEMO_ACCOUNTS as account}
									<tr>
										<td class="py-1.5 pr-3 align-top">
											<button
												type="button"
												class="text-left font-medium hover:text-primary-600 hover:underline"
												onclick={() => {
													email = account.email;
													password = account.password;
												}}
											>
												{account.name}
											</button>
											<div class="text-muted font-mono">{account.email}</div>
										</td>
										<td class="py-1.5 pr-3 align-top">
											{roleLabel(account.role, localeStore.value)}
										</td>
										<td class="py-1.5 align-top">
											<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-700"
												>{account.password}</code
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="text-muted mt-2 text-xs">{t('auth.demoHint', localeStore.value)}</p>
				</div>
			{/if}
		</div>
	</div>
</div>
