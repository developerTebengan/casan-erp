<script lang="ts">
	import { Package, Eye, EyeOff } from '@lucide/svelte';
	import { Button, Input } from '$lib/components/ui';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';

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

<div class="bg-body flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30"
			>
				<Package class="h-8 w-8" />
			</div>
			<h1 class="text-main mt-6 text-3xl font-bold tracking-tight">Casan ERP</h1>
			<p class="text-muted mt-2 text-sm">Sign in to your account to continue</p>
		</div>

		<div class="border-theme bg-card rounded-2xl border p-8 shadow-xl">
			<form method="POST" class="space-y-6" onsubmit={handleSubmit}>
				<Input
					label="Email"
					type="email"
					name="email"
					placeholder="admin@casanerp.com"
					required
					bind:value={email}
					error={form?.errors?.email ?? ''}
				/>

				<div class="relative">
					<Input
						label="Password"
						type={showPassword ? 'text' : 'password'}
						name="password"
						placeholder="••••••••"
						required
						bind:value={password}
						error={form?.errors?.password ?? ''}
					/>
					<button
						type="button"
						class="absolute top-[31px] right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
					<p class="dark:bg-danger-900/20 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">
						{form.errors.form}
					</p>
				{/if}

				<Button type="submit" variant="primary" size="lg" class="w-full" {loading}>Sign in</Button>
			</form>

			<div
				class="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
			>
				<p class="font-medium">Demo credentials:</p>
				<p>Email: admin@casanerp.com</p>
				<p>Password: password</p>
			</div>
		</div>
	</div>
</div>
