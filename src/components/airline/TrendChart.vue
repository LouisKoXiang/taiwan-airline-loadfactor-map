<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

interface TrendPoint {
  month: string
  avgLoadFactor: number
}

const props = defineProps<{
  trendPoints: TrendPoint[]
  currentMonth?: string
  accentColor?: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | undefined

const accent = () => props.accentColor ?? '#1f8fff'

const render = () => {
  if (!svgRef.value || !wrapperRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const data = props.trendPoints
  if (data.length < 2) return

  const W = wrapperRef.value.clientWidth || 300
  const H = 200
  const compact = W < 420
  const mTop = 28
  const mRight = compact ? 12 : 20
  const mBottom = 38
  const mLeft = compact ? 36 : 46

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)

  const x = d3.scalePoint<string>()
    .domain(data.map((d) => d.month))
    .range([mLeft, W - mRight])
    .padding(0.3)

  const rawMin = d3.min(data, (d) => d.avgLoadFactor) ?? 0
  const rawMax = d3.max(data, (d) => d.avgLoadFactor) ?? 100
  const pad = Math.max(3, (rawMax - rawMin) * 0.2)
  const y = d3.scaleLinear()
    .domain([Math.max(0, rawMin - pad), Math.min(100, rawMax + pad)])
    .range([H - mBottom, mTop])
    .nice()

  // 格線
  svg.append('g')
    .selectAll<SVGLineElement, number>('line')
    .data(y.ticks(4))
    .join('line')
    .attr('x1', mLeft).attr('x2', W - mRight)
    .attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
    .attr('stroke', 'var(--ink-100)')
    .attr('stroke-width', 1)

  // 面積漸層
  const gradId = `tg-${Math.random().toString(36).slice(2, 7)}`
  const defs = svg.append('defs')
  const grad = defs.append('linearGradient').attr('id', gradId).attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1')
  grad.append('stop').attr('offset', '0%').attr('stop-color', accent()).attr('stop-opacity', 0.2)
  grad.append('stop').attr('offset', '100%').attr('stop-color', accent()).attr('stop-opacity', 0.0)

  svg.append('path')
    .datum(data)
    .attr('fill', `url(#${gradId})`)
    .attr('d', d3.area<TrendPoint>()
      .x((d) => x(d.month)!)
      .y0(H - mBottom)
      .y1((d) => y(d.avgLoadFactor))
      .curve(d3.curveMonotoneX),
    )

  // 折線
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', accent())
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', d3.line<TrendPoint>()
      .x((d) => x(d.month)!)
      .y((d) => y(d.avgLoadFactor))
      .curve(d3.curveMonotoneX),
    )

  // X 軸標籤：月份多時動態抽樣，避免重疊
  // 每個標籤至少需要 44px，以此計算最多顯示幾個
  const innerW = W - mLeft - mRight
  const maxLabels = Math.max(2, Math.floor(innerW / 44))
  const step = data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels)

  svg.append('g')
    .selectAll<SVGTextElement, TrendPoint>('text')
    .data(data)
    .join('text')
    .attr('x', (d) => x(d.month)!)
    .attr('y', H - mBottom + 16)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('class', 'trend-x-label')
    // 顯示抽樣標籤、最後一筆、以及目前選取月份
    .attr('opacity', (d, i) =>
      (i % step === 0 || i === data.length - 1 || d.month === props.currentMonth) ? 1 : 0,
    )
    .text((d) => d.month.replace(/(\d+)年(\d+)月/, '$1/$2'))

  // Y 軸刻度標籤
  svg.append('g')
    .selectAll<SVGTextElement, number>('text')
    .data(y.ticks(4))
    .join('text')
    .attr('x', mLeft - 6)
    .attr('y', (d) => y(d))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('class', 'trend-y-label')
    .text((d) => `${d}%`)

  // 資料點：月份多時縮小半徑
  const dotR = data.length > 8 ? 2.5 : 3.5
  const dotRCurrent = data.length > 8 ? 4.5 : 5.5

  svg.append('g')
    .selectAll<SVGCircleElement, TrendPoint>('circle')
    .data(data)
    .join('circle')
    .attr('cx', (d) => x(d.month)!)
    .attr('cy', (d) => y(d.avgLoadFactor))
    .attr('r', (d) => d.month === props.currentMonth ? dotRCurrent : dotR)
    .attr('fill', (d) => d.month === props.currentMonth ? accent() : '#fff')
    .attr('stroke', accent())
    .attr('stroke-width', 2)

  // 數值標籤：月份多時僅顯示當月
  svg.append('g')
    .selectAll<SVGTextElement, TrendPoint>('text')
    .data(data)
    .join('text')
    .attr('x', (d) => x(d.month)!)
    .attr('y', (d) => y(d.avgLoadFactor) - 10)
    .attr('text-anchor', 'middle')
    .attr('class', (d) => d.month === props.currentMonth ? 'trend-val trend-val--current' : 'trend-val')
    .attr('opacity', (d) => (step === 1 || d.month === props.currentMonth) ? 1 : 0)
    .text((d) => `${d.avgLoadFactor.toFixed(1)}%`)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  render()
})

watch(() => [props.trendPoints, props.accentColor, props.currentMonth], render, { deep: true })

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="trend-chart-wrap">
    <div class="chart-header">
      <span class="chart-title">載客率月趨勢</span>
    </div>
    <div v-if="trendPoints.length < 2" class="trend-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <p>需要更多月份資料後顯示趨勢</p>
      <small>匯入多月份 ODS 後將自動顯示月趨勢折線圖。</small>
    </div>
    <div v-else ref="wrapperRef" class="chart-wrapper">
      <svg ref="svgRef" class="trend-svg"></svg>
    </div>
  </div>
</template>
