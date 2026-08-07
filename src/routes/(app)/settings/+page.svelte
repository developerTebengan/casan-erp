<script lang="ts">
	import { Building2, Users, Shield, Cog, Save, ScrollText } from '@lucide/svelte';
	import { Card, Breadcrumb, Button, Input, Badge } from '$lib/components/ui';
	import {
		APP_NAME,
		APP_VERSION,
		CHANGELOG,
		CHANGE_TYPE_LABEL,
		type ChangelogChangeType
	} from '$lib/version';

	let activeTab = $state('company');

	const tabs = [
		{ id: 'company', label: 'Company Profile', icon: Building2 },
		{ id: 'users', label: 'User Management', icon: Users },
		{ id: 'roles', label: 'Role Management', icon: Shield },
		{ id: 'app', label: 'Application', icon: Cog },
		{ id: 'changelog', label: 'Version & Changelog', icon: ScrollText }
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
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Settings' }]} />

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Settings</h1>
		<p class="text-muted">Manage your company and application preferences</p>
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
					<h2 class="text-main text-xl font-semibold">Company Profile</h2>
					<div class="grid gap-6 sm:grid-cols-2">
						<Input label="Company Name" value="Casan ERP Indonesia" />
						<Input label="Email" value="info@casanerp.com" />
						<Input label="Phone" value="021-555-1234" />
						<Input label="Tax ID" value="1234567890" />
					</div>
					<Input label="Address" value="Jl. Sudirman No. 123, Jakarta" />
					<div class="flex justify-end">
						<Button variant="primary">
							<Save class="h-4 w-4" />
							Save Changes
						</Button>
					</div>
				</div>
			{:else if activeTab === 'users'}
				<div class="space-y-6">
					<h2 class="text-main text-xl font-semibold">User Management</h2>
					<p class="text-muted">Manage system users and their access.</p>
					<div class="rounded-lg bg-slate-50 p-6 dark:bg-slate-800/50">
						<p class="text-muted text-sm">
							User management functionality will be available in the next release.
						</p>
					</div>
				</div>
			{:else if activeTab === 'roles'}
				<div class="space-y-6">
					<h2 class="text-main text-xl font-semibold">Role Management</h2>
					<p class="text-muted">Define roles and permissions for the system.</p>
					<div class="rounded-lg bg-slate-50 p-6 dark:bg-slate-800/50">
						<p class="text-muted text-sm">
							Role management functionality will be available in the next release.
						</p>
					</div>
				</div>
			{:else if activeTab === 'changelog'}
				<div class="space-y-6">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 class="text-main text-xl font-semibold">Version & Changelog</h2>
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
					<h2 class="text-main text-xl font-semibold">Application Settings</h2>
					<p class="text-muted">Configure application behavior and defaults.</p>
					<div class="grid gap-6 sm:grid-cols-2">
						<Input label="Default Currency" value="IDR" />
						<Input label="Date Format" value="DD/MM/YYYY" />
						<Input label="Default Language" value="English" />
						<Input label="Items Per Page" value="10" />
					</div>
					<div class="flex justify-end">
						<Button variant="primary">
							<Save class="h-4 w-4" />
							Save Changes
						</Button>
					</div>
				</div>
			{/if}
		</Card>
	</div>
</div>
