<script lang="ts">
	import { Building2, Cog, Save, ScrollText } from '@lucide/svelte';
	import { Card, Breadcrumb, Button, Input, Badge, Select } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { untrack } from 'svelte';
	import {
		APP_NAME,
		APP_VERSION,
		CHANGELOG,
		CHANGE_TYPE_LABEL,
		type ChangelogChangeType
	} from '$lib/version';

	let { data } = $props();

	let activeTab = $state('company');
	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	let companyName = $state(untrack(() => data.settings.companyName));
	let email = $state(untrack(() => data.settings.email));
	let phone = $state(untrack(() => data.settings.phone));
	let taxId = $state(untrack(() => data.settings.taxId));
	let address = $state(untrack(() => data.settings.address));
	let currency = $state(untrack(() => data.settings.currency));
	let dateFormat = $state(untrack(() => data.settings.dateFormat));
	let itemsPerPage = $state(untrack(() => String(data.settings.itemsPerPage)));

	const canWrite = $derived(hasPermission(data.user.role, 'settings:write'));
	const locale = $derived(localeStore.value);

	const tabs = $derived([
		{ id: 'company', label: t('settings.company', locale), icon: Building2 },
		{ id: 'app', label: t('settings.application', locale), icon: Cog },
		{ id: 'changelog', label: t('settings.changelog', locale), icon: ScrollText }
	]);

	const pageSizeOptions = [
		{ value: '10', label: '10' },
		{ value: '25', label: '25' },
		{ value: '50', label: '50' }
	];

	const changeBadgeVariant: Record<
		ChangelogChangeType,
		'primary' | 'success' | 'warning' | 'danger' | 'secondary'
	> = {
		added: 'success',
		changed: 'primary',
		fixed: 'warning',
		removed: 'danger'
	};

	async function save() {
		saving = true;
		errors = {};
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					companyName,
					email,
					phone,
					taxId,
					address,
					currency,
					dateFormat,
					itemsPerPage: Number(itemsPerPage)
				})
			});
			const payload = await res.json();
			if (!res.ok) {
				const fieldErrors = payload.errors as Record<string, string[] | string> | undefined;
				if (fieldErrors) {
					errors = Object.fromEntries(
						Object.entries(fieldErrors).map(([key, value]) => [
							key,
							Array.isArray(value) ? (value[0] ?? '') : String(value)
						])
					);
				}
				toastStore.error(payload.message || 'Validation failed');
				return;
			}
			toastStore.success(t('settings.saved', locale));
		} catch {
			toastStore.error('Failed to save settings');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: t('page.settings', locale) }]} />

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">{t('page.settings', locale)}</h1>
	</div>

	<div class="grid gap-6 lg:grid-cols-4">
		<Card padding="none" class="h-fit">
			<nav class="flex flex-col p-2">
				{#each tabs as tab}
					<button
						type="button"
						class="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors {activeTab ===
						tab.id
							? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
						onclick={() => (activeTab = tab.id)}
					>
						<tab.icon class="h-4 w-4" />
						{tab.label}
					</button>
				{/each}
			</nav>
		</Card>

		<Card class="lg:col-span-3" padding="lg">
			{#if activeTab === 'company'}
				<div class="space-y-6">
					<h2 class="text-main text-xl font-semibold">{t('settings.company', locale)}</h2>
					<div class="grid gap-6 sm:grid-cols-2">
						<Input label="Company Name" bind:value={companyName} error={errors.companyName} />
						<Input label="Email" bind:value={email} error={errors.email} />
						<Input label="Phone" bind:value={phone} error={errors.phone} />
						<Input label="Tax ID" bind:value={taxId} error={errors.taxId} />
					</div>
					<Input label="Address" bind:value={address} error={errors.address} />
					{#if canWrite}
						<div class="flex justify-end">
							<Button variant="primary" loading={saving} onclick={save}>
								<Save class="h-4 w-4" />
								{t('settings.save', locale)}
							</Button>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'changelog'}
				<div class="space-y-6">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 class="text-main text-xl font-semibold">{t('settings.changelog', locale)}</h2>
							<p class="text-muted">Release history for {APP_NAME}</p>
						</div>
						<Badge variant="primary">Current v{APP_VERSION}</Badge>
					</div>

					<div class="space-y-6">
						{#each CHANGELOG as entry}
							<div class="border-theme rounded-xl border p-4 sm:p-5">
								<div class="mb-4 flex flex-wrap items-center gap-3">
									<span class="text-main text-lg font-semibold">v{entry.version}</span>
									<span class="text-muted text-sm">{entry.date}</span>
									{#if entry.version === APP_VERSION}
										<Badge variant="success">Current</Badge>
									{/if}
								</div>

								<div class="space-y-4">
									{#each entry.changes as group}
										<div>
											<div class="mb-2">
												<Badge variant={changeBadgeVariant[group.type]}>
													{CHANGE_TYPE_LABEL[group.type]}
												</Badge>
											</div>
											<ul class="text-main list-disc space-y-1 pl-5 text-sm">
												{#each group.items as item}
													<li>{item}</li>
												{/each}
											</ul>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					<h2 class="text-main text-xl font-semibold">{t('settings.application', locale)}</h2>
					<div class="grid gap-6 sm:grid-cols-2">
						<Input label="Default Currency" bind:value={currency} error={errors.currency} />
						<Input label="Date Format" bind:value={dateFormat} error={errors.dateFormat} />
						<Select
							label="Items Per Page"
							bind:value={itemsPerPage}
							options={pageSizeOptions}
							error={errors.itemsPerPage}
						/>
					</div>
					{#if canWrite}
						<div class="flex justify-end">
							<Button variant="primary" loading={saving} onclick={save}>
								<Save class="h-4 w-4" />
								{t('settings.save', locale)}
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</Card>
	</div>
</div>
