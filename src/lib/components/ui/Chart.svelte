<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';

	interface Props {
		labels: string[];
		data: number[];
		label?: string;
	}

	let { labels, data, label = 'Total' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart;

	onMount(() => {
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
						grid: { color: 'rgba(148, 163, 184, 0.2)' },
						ticks: { color: '#64748b' }
					},
					x: {
						grid: { display: false },
						ticks: { color: '#64748b' }
					}
				}
			}
		});
	});

	onDestroy(() => {
		chart?.destroy();
	});
</script>

<div class="relative h-72 w-full">
	<canvas bind:this={canvas}></canvas>
</div>
