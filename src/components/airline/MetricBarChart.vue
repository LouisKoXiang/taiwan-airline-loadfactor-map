<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

interface BarItem {
  id: string        // 唯一的 band-scale 鍵值，例如「福岡-TPE」
  label: string     // 顯示名稱，例如「福岡」
  subLabel?: string // 第二行輔助文字，例如「TPE」
  value: number
}

const props = defineProps<{
  items: BarItem[]
  title: string
  unit?: string
  formatValue?: (v: number) => string
  accentColor?: string
  maxItems?: number
  actionLabel?: string
}>()

const emit = defineEmits<{
  action: []
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | undefined

const accent = () => props.accentColor ?? '#1f8fff'
const fmt = (v: number) => props.formatValue ? props.formatValue(v) : d3.format(',')(Math.round(v))

const MAX = 25

const render = () => {
  if (!svgRef.value || !wrapperRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const data = props.items.slice(0, props.maxItems ?? MAX)
  if (data.length === 0) return

  const W = wrapperRef.value.clientWidth || 300
  const rowH = 28
  const compact = W < 420
  const marginLeft = compact ? 74 : 92
  const marginRight = compact ? 50 : 72
  const marginTop = 8
  const marginBottom = 4
  const H = marginTop + data.length * rowH + marginBottom

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)

  const xMax = d3.max(data, (d) => d.value) ?? 1

  const x = d3.scaleLinear()
    .domain([0, xMax])
    .range([marginLeft, W - marginRight])
    .nice()

  // 使用唯一 id 作為 band domain 鍵值，避免同城市但不同機場的列互相重疊。
  const y = d3.scaleBand()
    .domain(data.map((d) => d.id))
    .range([marginTop, H - marginBottom])
    .padding(0.26)

  const yPos = (d: BarItem) => y(d.id) ?? 0

  // 交錯列背景
  svg.append('g')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', 0)
    .attr('y', (d) => yPos(d))
    .attr('width', W)
    .attr('height', rowH)
    .attr('fill', (_, i) => i % 2 === 0 ? 'rgb(248 252 255)' : 'transparent')

  // 長條圖（含動畫）
  svg.append('g')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', marginLeft)
    .attr('y', (d) => yPos(d))
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('rx', 3)
    .attr('fill', accent())
    .attr('opacity', (_, i) => Math.max(0.55, 0.88 - i * 0.007))
    .transition().duration(460).ease(d3.easeQuadOut)
    .attr('width', (d) => Math.max(0, x(d.value) - marginLeft))

  // 城市名稱標籤（過長時截斷）
  svg.append('g')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('x', marginLeft - 6)
    .attr('y', (d) => yPos(d) + y.bandwidth() / 2 - (data.some((d) => d.subLabel) ? 5 : 0))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('class', 'bar-label')
    .text((d) => {
      const limit = compact ? 4 : 6
      return d.label.length > limit ? `${d.label.slice(0, limit - 1)}…` : d.label
    })

  // 輔助標籤（出發機場代碼）
  if (data.some((d) => d.subLabel)) {
    svg.append('g')
      .selectAll('text')
      .data(data)
      .join('text')
      .attr('x', marginLeft - 6)
      .attr('y', (d) => yPos(d) + y.bandwidth() / 2 + 8)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('class', 'bar-sublabel')
      .text((d) => d.subLabel ?? '')
  }

  // 數值標籤：長條太短時收進圖表內側
  svg.append('g')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('x', (d) => {
      const barEnd = x(d.value)
      const labelWidth = compact ? 42 : 52 // 預估像素寬度
      return barEnd + labelWidth > W ? barEnd - 4 : barEnd + 5
    })
    .attr('y', (d) => yPos(d) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => {
      const barEnd = x(d.value)
      const labelWidth = compact ? 42 : 52
      return barEnd + labelWidth > W ? 'end' : 'start'
    })
    .attr('class', (d) => {
      const barEnd = x(d.value)
      return barEnd + (compact ? 42 : 52) > W ? 'bar-value bar-value--inside' : 'bar-value'
    })
    .text((d) => `${fmt(d.value)}${props.unit ?? ''}`)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  render()
})

watch(() => [props.items, props.accentColor], render, { deep: true })

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="metric-bar-chart">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <div class="chart-header-actions">
        <span v-if="items.length > (maxItems ?? MAX)" class="chart-overflow-note">
          顯示前 {{ maxItems ?? MAX }} 筆
        </span>
        <button
          v-if="actionLabel"
          type="button"
          class="chart-action-btn"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </button>
      </div>
    </div>
    <div ref="wrapperRef" class="chart-wrapper">
      <svg ref="svgRef" class="bar-svg"></svg>
    </div>
  </div>
</template>
