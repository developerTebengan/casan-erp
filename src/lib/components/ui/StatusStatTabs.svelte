<script lang="ts">
	import { Badge } from '$lib/components/ui';

	export type StatusStatVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary';

	export interface StatusStatTab {
		id: string;
		label: string;
		count: number;
		variant?: StatusStatVariant;
	}

	interface Props {
		tabs: StatusStatTab[];
		active: string;
		onchange: (id: string) => void;
		class?: string;
	}

	let { tabs, active, onchange, class: className = '' }: Props = $props();
</script>

<div class="flex flex-wrap gap-2 {className}">
	{#each tabs as t}
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors {active ===
			t.id
				? 'bg-primary-600 text-white'
				: 'bg-card border-theme text-main border hover:bg-slate-50 dark:hover:bg-slate-800'}"
			onclick={() => onchange(t.id)}
		>
			{t.label}
			<Badge variant={active === t.id ? 'secondary' : (t.variant ?? 'secondary')}>{t.count}</Badge>
		</button>
	{/each}
</div>
