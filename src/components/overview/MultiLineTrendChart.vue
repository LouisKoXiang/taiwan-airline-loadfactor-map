<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

export interface ChartPoint {
  month: string
  value: number | null
}

export interface ChartSeries {
  key: string
  label: string
  color: string
  points: ChartPoint[]
}

const props = defineProps<{
  series: ChartSeries[]
  title?: string
  unit?: string
  formatValue?: (v: number) => string
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | undefined

const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipFlip = ref(false)
const tooltipMonth = ref('')
const tooltipValues = ref<{ label: string; color: string; text: string }[]>([])

const unit = () => props.unit ?? ''
const fmt = (v: number) => props.formatValue ? props.formatValue(v) : v.toFixed(1)
const shouldAnimate = () =>
  typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const render = () => {
  if (!svgRef.value || !wrapperRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const validSeries = props.series.filter((s) => s.points.some((p) => p.value !== null))
  if (validSeries.length === 0 || props.series[0].points.length < 2) return

  const months = props.series[0].points.map((p) => p.month)
  const visibleW = wrapperRef.value.clientWidth || 400
  const pointGap = months.length > 18 ? 42 : 34
  const W = Math.max(visibleW, months.length * pointGap + 112)
  const H = 200
  const allValues = validSeries
    .flatMap((s) => s.points.map((p) => p.value))
    .filter((v): v is number => v !== null)
  if (allValues.length === 0) return

  const yMin = d3.min(allValues) ?? 0
  const yMax = d3.max(allValues) ?? 100
  const pad = Math.max(1, (yMax - yMin) * 0.18)
  const usesLargeValues = unit().includes('人') || yMax >= 100000
  const mTop = 16
  const mBottom = 36
  const mLeft = usesLargeValues ? (W < 520 ? 84 : 88) : 62
  const mRight = 16

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)

  const x = d3.scalePoint<string>().domain(months).range([mLeft, W - mRight]).padding(0.3)

  const yLow = usesLargeValues ? Math.max(0, yMin - pad) : Math.max(0, yMin - pad)
  const y = d3.scaleLinear().domain([yLow, yMax + pad]).range([H - mBottom, mTop]).nice()

  // Grid
  svg.append('g')
    .selectAll<SVGLineElement, number>('line')
    .data(y.ticks(4))
    .join('line')
    .attr('x1', mLeft).attr('x2', W - mRight)
    .attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
    .attr('stroke', 'var(--ink-100)').attr('stroke-width', 1)

  // Y labels
  svg.append('g')
    .selectAll<SVGTextElement, number>('text')
    .data(y.ticks(4))
    .join('text')
    .attr('x', mLeft - 6).attr('y', (d) => y(d))
    .attr('dy', '0.35em').attr('text-anchor', 'end')
    .attr('class', 'trend-y-label')
    .text((d) => `${fmt(d)}${unit()}`)

  // X labels
  const innerW = W - mLeft - mRight
  const maxLabels = Math.max(2, Math.floor(innerW / 44))
  const step = months.length <= maxLabels ? 1 : Math.ceil(months.length / maxLabels)

  svg.append('g')
    .selectAll<SVGTextElement, string>('text')
    .data(months)
    .join('text')
    .attr('x', (m) => x(m)!).attr('y', H - mBottom + 16)
    .attr('dy', '0.35em').attr('text-anchor', 'middle')
    .attr('class', 'trend-x-label')
    .attr('opacity', (_, i) => i % step === 0 || i === months.length - 1 ? 1 : 0)
    .text((m) => m.replace(/(\d+)年(\d+)月/, '$1/$2'))

  // Lines + dots per series
  const dotR = months.length > 8 ? 2.5 : 3.5

  for (const s of validSeries) {
    const path = svg.append('path')
      .datum(s.points)
      .attr('fill', 'none')
      .attr('stroke', s.color)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', d3.line<ChartPoint>()
        .x((d) => x(d.month)!)
        .y((d) => y(d.value!))
        .defined((d) => d.value !== null)
        .curve(d3.curveMonotoneX),
      )

    if (shouldAnimate()) {
      const totalLength = path.node()?.getTotalLength() ?? 0
      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(720)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0)
    }

    svg.append('g')
      .selectAll<SVGCircleElement, ChartPoint>('circle')
      .data(s.points.filter((p) => p.value !== null))
      .join('circle')
      .attr('cx', (d) => x(d.month)!)
      .attr('cy', (d) => y(d.value!))
      .attr('r', dotR)
      .attr('fill', '#fff')
      .attr('stroke', s.color)
      .attr('stroke-width', 1.5)
      .attr('opacity', shouldAnimate() ? 0 : 1)
      .style('pointer-events', 'none')
      .transition()
      .delay(shouldAnimate() ? 420 : 0)
      .duration(shouldAnimate() ? 260 : 0)
      .attr('opacity', 1)
  }

  // Hover line
  const hoverLine = svg.append('line')
    .attr('y1', mTop).attr('y2', H - mBottom)
    .attr('stroke', 'var(--ink-300)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 2')
    .attr('opacity', 0)
    .style('pointer-events', 'none')

  // Transparent overlay for mouse events
  svg.append('rect')
    .attr('x', mLeft).attr('y', mTop)
    .attr('width', W - mLeft - mRight).attr('height', H - mTop - mBottom)
    .attr('fill', 'transparent')
    .on('mousemove', (event) => {
      if (!wrapperRef.value) return
      const [mx] = d3.pointer(event)

      // Nearest month via closest x position
      let nearestMonth = months[0]
      let minDist = Infinity
      for (const m of months) {
        const dist = Math.abs(x(m)! - mx)
        if (dist < minDist) { minDist = dist; nearestMonth = m }
      }
      const xPos = x(nearestMonth)!
      hoverLine.attr('x1', xPos).attr('x2', xPos).attr('opacity', 1)

      const rect = wrapperRef.value.getBoundingClientRect()
      const relX = event.clientX - rect.left
      tooltipFlip.value = relX > rect.width * 0.60
      tooltipX.value = relX
      tooltipY.value = event.clientY - rect.top - 10
      tooltipMonth.value = nearestMonth
      tooltipVisible.value = true

      const monthIdx = months.indexOf(nearestMonth)
      tooltipValues.value = props.series.map((s) => ({
        label: s.label,
        color: s.color,
        text: s.points[monthIdx]?.value !== null && s.points[monthIdx]?.value !== undefined
          ? `${fmt(s.points[monthIdx].value!)}${unit()}`
          : '—',
      }))
    })
    .on('mouseleave', () => {
      hoverLine.attr('opacity', 0)
      tooltipVisible.value = false
    })
}

async function scheduleRender() {
  await nextTick()
  render()
}

onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  scheduleRender()
})

watch(() => [props.series, props.unit, props.formatValue], scheduleRender, { deep: true })

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="trend-chart-wrap">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
    </div>
    <div v-if="!series.some(s => s.points.some(p => p.value !== null))" class="trend-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <p>無可顯示資料</p>
    </div>
    <div v-else ref="wrapperRef" class="chart-wrapper" style="position: relative;">
      <svg ref="svgRef" class="trend-svg"></svg>
      <!-- Tooltip -->
      <div
        v-if="tooltipVisible"
        class="multiline-tooltip"
        :style="{
          left: tooltipFlip ? 'auto' : tooltipX + 14 + 'px',
          right: tooltipFlip ? `calc(100% - ${tooltipX - 14}px)` : 'auto',
          top: tooltipY + 'px',
        }"
      >
        <div class="multiline-tooltip-month">{{ tooltipMonth }}</div>
        <div v-for="item in tooltipValues" :key="item.label" class="multiline-tooltip-row">
          <span class="multiline-tooltip-dot" :style="{ background: item.color }"></span>
          <span class="multiline-tooltip-label">{{ item.label }}</span>
          <span class="multiline-tooltip-value">{{ item.text }}</span>
        </div>
      </div>
    </div>
    <!-- Legend -->
    <div class="multiline-legend">
      <span v-for="s in series" :key="s.key" class="multiline-legend-item">
        <span class="multiline-legend-dot" :style="{ background: s.color }"></span>
        {{ s.label }}
      </span>
    </div>
  </div>
</template>
