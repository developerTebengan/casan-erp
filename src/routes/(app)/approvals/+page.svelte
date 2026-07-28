<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Card,
		Breadcrumb,
		Badge,
		DataTable,
		EmptyState,
		Button,
		Input
	} from '$lib/components/ui';
	import { formatCurrency, formatDate, formatDateTime } from '$lib/utils/format';
	import type { Purchase } from '$lib/types';

	type ApprovalTab = 'waiting' | 'approved' | 'rejected';

	let { data } = $props();

	let tab = $state<ApprovalTab>(untrack(() => data.tab as ApprovalTab));
	let month = $state(untrack(() => data.month));
	let purchases = $state(untrack(() => data.purchases.data));
	let counts = $state(untrack(() => data.counts));
	let monthStats = $state(untrack(() => data.monthStats));
	let loading = $state(false);

	$effect(() => {
		tab = data.tab as ApprovalTab;
		month = data.month;
		purchases = data.purchases.data;
		counts = data.counts;
		monthStats = data.monthStats;
	});

	const tabs = $derived([
		{ id: 'waiting' as const, label: 'Waiting', count: counts.waiting, variant: 'warning' as const },
		{
			id: 'approved' as const,
			label: 'Approved',
			count: counts.approved,
			variant: 'success' as const
		},
		{
			id: 'rejected' as const,
			label: 'Unapproved',
			count: counts.rejected,
			variant: 'danger' as const
		}
	]);

	function priorityBadge(p: Purchase) {
		const variants: Record<string, string> = {
			LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
			MEDIUM: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-600',
			HIGH: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600',
			URGENT: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600'
		};
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[p.priority]}">${p.priority}</span>`;
	}

	function myLevelInfo(p: Purchase) {
		const uid = data.user.id;
		if (p.departmentHeadId === uid) {
			return {
				level: 'Department Head',
				status: p.departmentHeadStatus,
				at: p.departmentHeadApprovedAt
			};
		}
		if (p.financeApproverId === uid) {
			return { level: 'Finance', status: p.financeStatus, at: p.financeApprovedAt };
		}
		if (p.finalApproverId === uid) {
			return { level: 'Final', status: p.finalStatus, at: p.finalApprovedAt };
		}
		return { level: 'Approver', status: p.approvalStatus, at: null };
	}

	function myDecisionBadge(p: Purchase) {
		const info = myLevelInfo(p);
		const classes =
			info.status === 'APPROVED'
				? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600'
				: info.status === 'REJECTED'
					? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600'
					: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600';
		const label =
			info.status === 'APPROVED'
				? 'Approved'
				: info.status === 'REJECTED'
					? 'Unapproved'
					: 'Waiting';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${label}</span>`;
	}

	function escapeHtml(text: string) {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;');
	}

	const columns = $derived([
		{ key: 'prNumber', header: 'PR Number' },
		{
			key: 'requester',
			header: 'Requester',
			cell: (p: Purchase) => p.requester?.name ?? '-'
		},
		{ key: 'department', header: 'Department' },
		{ key: 'priority', header: 'Priority', cell: priorityBadge },
		{
			key: 'level',
			header: 'Your level',
			cell: (p: Purchase) => myLevelInfo(p).level
		},
		{ key: 'decision', header: 'Your decision', cell: myDecisionBadge },
		...(tab !== 'waiting'
			? [
					{
						key: 'decidedAt',
						header: tab === 'approved' ? 'Approved at' : 'Decided at',
						cell: (p: Purchase) => {
							const at = myLevelInfo(p).at;
							return at ? formatDateTime(at) : formatDate(p.updatedAt);
						}
					}
				]
			: [
					{
						key: 'dateRequired',
						header: 'Required',
						cell: (p: Purchase) => formatDate(p.dateRequired)
					}
				]),
		...(tab === 'rejected'
			? [
					{
						key: 'reason',
						header: 'Rejection reason',
						cell: (p: Purchase) =>
							p.rejectionReason
								? `<span class="text-danger-600 dark:text-danger-400">${escapeHtml(p.rejectionReason)}</span>`
								: '<span class="text-slate-400">—</span>'
					}
				]
			: []),
		{
			key: 'total',
			header: 'Total',
			cell: (p: Purchase) => formatCurrency(p.total)
		}
	]);

	async function applyFilters(nextTab = tab, nextMonth = month) {
		loading = true;
		const params = new URLSearchParams();
		params.set('tab', nextTab);
		if (nextMonth) params.set('month', nextMonth);
		await goto(`/approvals?${params.toString()}`, { invalidateAll: true, keepFocus: true });
		loading = false;
	}

	function switchTab(id: ApprovalTab) {
		tab = id;
		applyFilters(id, month);
	}

	function monthLabel(ym: string) {
		const [y, m] = ym.split('-').map(Number);
		return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'My Approvals' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">My Approvals</h1>
			<p class="text-muted">Waiting queue and monthly approval history</p>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card padding="md">
			<p class="text-muted text-sm">Accepted this month</p>
			<p class="text-main mt-1 text-2xl font-bold text-success-600">{monthStats.approved}</p>
			<p class="text-muted text-xs">{monthLabel(month)}</p>
		</Card>
		<Card padding="md">
			<p class="text-muted text-sm">Rejected this month</p>
			<p class="text-main mt-1 text-2xl font-bold text-danger-600">{monthStats.rejected}</p>
			<p class="text-muted text-xs">{monthLabel(month)}</p>
		</Card>
		<Card padding="md">
			<p class="text-muted text-sm">Decisions this month</p>
			<p class="text-main mt-1 text-2xl font-bold">{monthStats.total}</p>
			<p class="text-muted text-xs">Approved + unapproved</p>
		</Card>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each tabs as t}
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors {tab ===
				t.id
					? 'bg-primary-600 text-white'
					: 'bg-card border-theme text-main border hover:bg-slate-50 dark:hover:bg-slate-800'}"
				onclick={() => switchTab(t.id)}
			>
				{t.label}
				<Badge variant={tab === t.id ? 'secondary' : t.variant}>{t.count}</Badge>
			</button>
		{/each}
	</div>

	{#if tab !== 'waiting'}
		<Card padding="md">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
				<div class="sm:w-56">
					<Input label="Month" type="month" bind:value={month} />
				</div>
				<div class="flex gap-2">
					<Button variant="primary" onclick={() => applyFilters(tab, month)} {loading}>
						Apply month
					</Button>
				</div>
			</div>
			<p class="text-muted mt-2 text-xs">
				Filter your {tab === 'approved' ? 'approvals' : 'rejections'} for {monthLabel(month)}.
				Unapproved rows include the rejection reason.
			</p>
		</Card>
	{/if}

	<Card padding="none">
		{#if purchases.length === 0}
			<div class="p-6">
				<EmptyState
					title={tab === 'waiting'
						? 'No approvals waiting'
						: tab === 'approved'
							? 'No approved PRs in this month'
							: 'No unapproved PRs in this month'}
					description={tab === 'waiting'
						? 'When someone assigns you as an approver, requests will show up here.'
						: 'Try another month, or switch tabs to see all-time totals in the badges.'}
				>
					<Button variant="secondary" href="/purchasing">View all PRs</Button>
				</EmptyState>
			</div>
		{:else}
			<DataTable
				columns={columns}
				rows={purchases}
				{loading}
				onrowclick={(row) => goto(`/purchasing/${(row as Purchase).id}`)}
			/>
		{/if}
	</Card>
</div>
