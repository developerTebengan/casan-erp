<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import { themeStore } from '$lib/stores/theme.svelte';

	interface Props {
		labels: string[];
		data: number[];
		label?: string;
	}

	let { labels, data, label = 'Total' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart;

	const gridColor = $derived(themeStore.value === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.2)');
	const tickColor = $derived(themeStore.value === 'dark' ? '#94a3b8' : '#64748b');

	function createChart() {
		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label,
						data,
						backgroundColor: 'rgba(37, 99, 235, 0.8)',
						borderColor: 'rgba(37, 99, 235, 1)',
						borderWidth: 1,
						borderRadius: 6,
						borderSkipped: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false }
				},
				scales: {
					y: {
						beginAtZero: true,
						grid: { color: gridColor },
						ticks: { color: tickColor }
					},
					x: {
						grid: { display: false },
						ticks: { color: tickColor }
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		chart?.destroy();
	});

	$effect(() => {
		if (!chart) return;
		chart.options.scales = {
			y: {
				beginAtZero: true,
				grid: { color: gridColor },
				ticks: { color: tickColor }
			},
			x: {
				grid: { display: false },
				ticks: { color: tickColor }
			}
		};
		chart.update('none');
	});
</script>

<div class="relative h-72 w-full">
	<canvas bind:this={canvas}></canvas>
</div>
