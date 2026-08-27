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
					placeholder="Insert email"
					required
					bind:value={email}
					error={form?.errors?.email ?? ''}
				/>

				<div class="relative">
					<Input
						label="Password"
						type={showPassword ? 'text' : 'password'}
						name="password"
						placeholder="Insert password"
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

				<Button type="submit" variant="primary" size="lg" class="w-full" {loading}>Sign in</Button>
			</form>

			<div
				class="border-theme mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
			>
				<p class="mb-2 font-semibold text-slate-900 dark:text-white">
					Demo accounts — password: <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">password</code>
				</p>
				<ul class="space-y-1.5 text-slate-700 dark:text-slate-200">
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'admin@casanerp.com'; password = 'password'; }}>admin@casanerp.com</button> — Admin</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'user@casanerp.com'; password = 'password'; }}>user@casanerp.com</button> — Requester</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'buyer@casanerp.com'; password = 'password'; }}>buyer@casanerp.com</button> — Buyer</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'stock@casanerp.com'; password = 'password'; }}>stock@casanerp.com</button> — Stock Keeper</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'dept.head@casanerp.com'; password = 'password'; }}>dept.head@casanerp.com</button> — Dept Head</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'finance@casanerp.com'; password = 'password'; }}>finance@casanerp.com</button> — Finance</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'manager@casanerp.com'; password = 'password'; }}>manager@casanerp.com</button> — Manager</li>
					<li><button type="button" class="text-left hover:text-primary-600 hover:underline" onclick={() => { email = 'director@casanerp.com'; password = 'password'; }}>director@casanerp.com</button> — Director</li>
				</ul>
				<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Click an email to fill the form.</p>
			</div>
		</div>
	</div>
</div>
