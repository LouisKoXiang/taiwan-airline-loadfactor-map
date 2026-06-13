<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

const props = defineProps<{
  inbound: number
  outbound: number
}>()

const chartRef = ref<SVGSVGElement | null>(null)

const renderChart = () => {
  if (!chartRef.value) return

  const width = 260
  const height = 126
  const margin = { top: 18, right: 18, bottom: 28, left: 56 }
  const data = [
    { label: '入境', value: props.inbound, color: '#2b8fbc' },
    { label: '出境', value: props.outbound, color: '#5b7cfa' },
  ]

  const svg = d3.select(chartRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (item) => item.value) ?? 0])
    .nice()
    .range([margin.left, width - margin.right])
  const y = d3
    .scaleBand()
    .domain(data.map((item) => item.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.28)

  svg
    .append('g')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', margin.left)
    .attr('y', (item) => y(item.label) ?? 0)
    .attr('width', (item) => Math.max(8, x(item.value) - margin.left))
    .attr('height', y.bandwidth())
    .attr('rx', 8)
    .attr('fill', (item) => item.color)

  svg
    .append('g')
    .attr('class', 'chart-labels')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('x', margin.left - 10)
    .attr('y', (item) => (y(item.label) ?? 0) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((item) => item.label)

  svg
    .append('g')
    .attr('class', 'chart-values')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('x', (item) => x(item.value) + 8)
    .attr('y', (item) => (y(item.label) ?? 0) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text((item) => d3.format(',')(item.value))
}

onMounted(renderChart)
watch(() => [props.inbound, props.outbound], renderChart)
</script>

<template>
  <svg ref="chartRef" class="mini-chart" role="img" aria-label="入境出境旅客比較"></svg>
</template>
