<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'

const store = useAirlineGrowthStore()

const wrapperRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
let resizeObserver: ResizeObserver | undefined

// ── 版面常數 ────────────────────────────────────────────────────
const ROW_H = 28
const PAD = 12

// ── tooltip 狀態 ─────────────────────────────────────────────────
interface TooltipContent {
  route: string
  city: string
  country: string
  month: string
  hasService: boolean
  loadFactor?: number
  passengerCount?: number
  flightCount?: number
}
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipFlip = ref(false)
const tooltipContent = ref<TooltipContent>({
  route: '',
  city: '',
  country: '',
  month: '',
  hasService: false,
})
const fmt = new Intl.NumberFormat('zh-TW')

const SERVICE_COLOR = '#1f8fff'   // 有班次：單一藍色

function parseMonth(month: string) {
  const match = month.match(/(\d+)年(\d+)月/)
  return {
    year: match?.[1] ?? '',
    month: match?.[2] ?? month,
    short: match ? `${match[1]}/${match[2]}` : month,
  }
}

// ── FlatCell 型別（限於此元件） ─────────────────────────────────
interface FlatCell {
  ri: number
  ci: number
  route: string
  city: string
  country: string
  month: string
  hasService: boolean
  loadFactor?: number
  passengerCount?: number
  flightCount?: number
}

// ── 更新 tooltip 座標 ────────────────────────────────────────────
function updateTooltipPos(event: Event) {
  if (!wrapperRef.value) return
  const me = event as MouseEvent
  const rect = wrapperRef.value.getBoundingClientRect()
  const relX = me.clientX - rect.left
  tooltipFlip.value = relX > rect.width * 0.65
  tooltipX.value = relX
  tooltipY.value = me.clientY - rect.top - 10
}

// ── 主繪圖函式 ───────────────────────────────────────────────────
const render = () => {
  if (!svgRef.value || !wrapperRef.value) return
  const rows = store.routeTimelineMatrix
  const months = store.visibleTimelineMonths
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  if (rows.length === 0 || months.length === 0) return

  const W = Math.max(280, wrapperRef.value.clientWidth || 300)
  const compact = W < 520
  const headerH = compact ? 44 : 36
  const labelW = compact ? Math.min(96, Math.max(84, W * 0.3)) : 172
  const colW = Math.max(12, (W - labelW) / months.length)
  const dotR = Math.max(3.5, Math.min(8, colW * 0.28))
  const dashW = Math.max(6, Math.min(12, colW * 0.42))
  const dashH = compact ? 1.5 : 2
  const H = headerH + rows.length * ROW_H

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', H)

  // ── 交替行背景 ────────────────────────────────────────────────
  svg.append('g')
    .selectAll<SVGRectElement, (typeof rows)[0]>('rect')
    .data(rows)
    .join('rect')
    .attr('x', labelW)
    .attr('y', (_, i) => headerH + i * ROW_H)
    .attr('width', months.length * colW)
    .attr('height', ROW_H)
    .attr('fill', (_, i) => i % 2 === 0 ? '#f7fafc' : '#ffffff')

  // ── 欄頭底線 ─────────────────────────────────────────────────
  svg.append('line')
    .attr('x1', 0).attr('x2', W)
    .attr('y1', headerH - 0.5).attr('y2', headerH - 0.5)
    .attr('stroke', 'var(--ink-100)').attr('stroke-width', 1)

  if (compact) {
    const yearGroups: { year: string, start: number, end: number }[] = []
    months.forEach((m, i) => {
      const year = parseMonth(m).year
      const last = yearGroups.at(-1)
      if (!last || last.year !== year) {
        yearGroups.push({ year, start: i, end: i })
      } else {
        last.end = i
      }
    })

    const yearG = svg.append('g').attr('class', 'matrix-year-groups')

    yearG.selectAll<SVGRectElement, (typeof yearGroups)[0]>('rect')
      .data(yearGroups)
      .join('rect')
      .attr('x', (d) => labelW + d.start * colW)
      .attr('y', 4)
      .attr('width', (d) => (d.end - d.start + 1) * colW)
      .attr('height', 18)
      .attr('rx', 4)
      .attr('fill', 'var(--blue-50)')
      .attr('stroke', 'var(--ink-100)')
      .attr('stroke-width', 0.8)

    yearG.selectAll<SVGLineElement, (typeof yearGroups)[0]>('line.matrix-year-divider')
      .data(yearGroups)
      .join('line')
      .attr('x1', (d) => labelW + d.start * colW)
      .attr('x2', (d) => labelW + d.start * colW)
      .attr('y1', 4)
      .attr('y2', headerH)
      .attr('stroke', 'var(--ink-100)')
      .attr('stroke-width', 1)

    yearG.append('line')
      .attr('x1', labelW + months.length * colW)
      .attr('x2', labelW + months.length * colW)
      .attr('y1', 4)
      .attr('y2', headerH)
      .attr('stroke', 'var(--ink-100)')
      .attr('stroke-width', 1)

    svg.append('g')
      .selectAll<SVGTextElement, (typeof yearGroups)[0]>('text')
      .data(yearGroups)
      .join('text')
      .attr('x', (d) => labelW + ((d.start + d.end + 1) * colW) / 2)
      .attr('y', 13)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('class', 'matrix-year-label')
      .text((d) => d.year ? `${d.year}年` : '')
  }

  // ── 月份欄頭 ─────────────────────────────────────────────────
  svg.append('g')
    .selectAll<SVGTextElement, string>('text')
    .data(months)
    .join('text')
    .attr('x', (_, i) => labelW + i * colW + colW / 2)
    .attr('y', compact ? 31 : headerH / 2 + 1)
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'middle')
    .attr('class', 'matrix-month-label')
    .attr('font-size', compact ? 9 : 10)
    .text((m) => {
      const parsed = parseMonth(m)
      return compact ? parsed.month : parsed.short
    })

  // ── 縱格線 ───────────────────────────────────────────────────
  svg.append('g')
    .selectAll<SVGLineElement, string | null>('line')
    .data([...months, null])
    .join('line')
    .attr('x1', (_, i) => labelW + i * colW)
    .attr('x2', (_, i) => labelW + i * colW)
    .attr('y1', compact ? 24 : 0).attr('y2', H)
    .attr('stroke', 'var(--ink-100)').attr('stroke-width', 0.5)

  // ── 橫格線 ───────────────────────────────────────────────────
  svg.append('g')
    .selectAll<SVGLineElement, (typeof rows)[0]>('line')
    .data(rows)
    .join('line')
    .attr('x1', labelW).attr('x2', W)
    .attr('y1', (_, i) => headerH + i * ROW_H)
    .attr('y2', (_, i) => headerH + i * ROW_H)
    .attr('stroke', 'var(--ink-100)').attr('stroke-width', 0.5)

  // ── 航線標籤欄 ───────────────────────────────────────────────
  const labelG = svg.append('g')

  labelG.selectAll<SVGRectElement, (typeof rows)[0]>('rect')
    .data(rows)
    .join('rect')
    .attr('x', 0)
    .attr('y', (_, i) => headerH + i * ROW_H)
    .attr('width', labelW - 1)
    .attr('height', ROW_H)
    .attr('fill', '#fff')

  labelG.selectAll<SVGTextElement, (typeof rows)[0]>('text.matrix-route-code')
    .data(rows)
    .join('text')
    .attr('class', 'matrix-route-code')
    .attr('x', PAD)
    .attr('y', (_, i) => headerH + i * ROW_H + 11)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', compact ? 9 : 10)
    .text((r) => compact
      ? `${r.originAirportCode}→${r.destinationAirportCode}`
      : `${r.originAirportCode} → ${r.destinationAirportCode}`,
    )

  labelG.selectAll<SVGTextElement, (typeof rows)[0]>('text.matrix-city')
    .data(rows)
    .join('text')
    .attr('class', 'matrix-city')
    .attr('x', PAD)
    .attr('y', (_, i) => headerH + i * ROW_H + 22)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', compact ? 8 : 9)
    .text((r) => compact && r.destinationCityName.length > 5
      ? `${r.destinationCityName.slice(0, 4)}…`
      : r.destinationCityName,
    )

  // 標籤欄右側分隔線
  svg.append('line')
    .attr('x1', labelW - 1).attr('x2', labelW - 1)
    .attr('y1', 0).attr('y2', H)
    .attr('stroke', 'var(--ink-100)').attr('stroke-width', 1)

  // ── 展開所有格子 ─────────────────────────────────────────────
  const cells: FlatCell[] = rows.flatMap((row, ri) =>
    row.months.map((cell, ci) => ({
      ri, ci,
      route: `${row.originAirportCode}→${row.destinationAirportCode}`,
      city: row.destinationCityName,
      country: row.destinationCountry,
      month: cell.month,
      hasService: cell.hasService,
      loadFactor: cell.loadFactor,
      passengerCount: cell.passengerCount,
      flightCount: cell.flightCount,
    })),
  )

  const cx = (ci: number) => labelW + ci * colW + colW / 2
  const cy = (ri: number) => headerH + ri * ROW_H + ROW_H / 2

  // 無班次：極淡短橫線
  svg.append('g')
    .selectAll<SVGRectElement, FlatCell>('rect')
    .data(cells.filter((c) => !c.hasService || (c.flightCount ?? 0) === 0))
    .join('rect')
    .attr('x', (c) => cx(c.ci) - dashW / 2)
    .attr('y', (c) => cy(c.ri) - dashH / 2)
    .attr('width', dashW)
    .attr('height', dashH)
    .attr('rx', 1)
    .attr('fill', 'var(--ink-100)')
    .style('pointer-events', 'none')

  // 有班次（flightCount > 0）：單一藍色圓點
  svg.append('g')
    .selectAll<SVGCircleElement, FlatCell>('circle')
    .data(cells.filter((c) => c.hasService && (c.flightCount ?? 0) > 0))
    .join('circle')
    .attr('cx', (c) => cx(c.ci))
    .attr('cy', (c) => cy(c.ri))
    .attr('r', dotR)
    .attr('fill', SERVICE_COLOR)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('pointer-events', 'none')

  // hover 觸發矩形（每格不可見）
  svg.append('g')
    .selectAll<SVGRectElement, FlatCell>('rect')
    .data(cells)
    .join('rect')
    .attr('x', (c) => labelW + c.ci * colW)
    .attr('y', (c) => headerH + c.ri * ROW_H)
    .attr('width', colW)
    .attr('height', ROW_H)
    .attr('fill', 'transparent')
    .on('mouseenter', (event, c) => {
      tooltipVisible.value = true
      tooltipContent.value = {
        route: c.route,
        city: c.city,
        country: c.country,
        month: c.month,
        hasService: c.hasService,
        loadFactor: c.loadFactor,
        passengerCount: c.passengerCount,
        flightCount: c.flightCount,
      }
      updateTooltipPos(event)
    })
    .on('mousemove', (event) => updateTooltipPos(event))
    .on('mouseleave', () => { tooltipVisible.value = false })
}

onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  render()
})

watch(
  () => [store.routeTimelineMatrix, store.visibleTimelineMonths],
  () => { tooltipVisible.value = false; render() },
  { deep: false },
)

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="matrix-wrap">
    <div class="chart-header">
      <div class="matrix-title-block">
        <span class="chart-title">航點月份矩陣</span>
        <small>僅顯示區間內有新增、中斷或季節性變化的航點</small>
      </div>
      <div class="matrix-legend">
        <span class="matrix-legend-item">
          <span class="matrix-legend-dot" style="background:#1f8fff"></span>有班次
        </span>
        <span class="matrix-legend-item matrix-legend-item--dash">
          <span class="matrix-legend-dash"></span>無班次
        </span>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-if="store.routeTimelineMatrix.length === 0" class="matrix-empty">
      <p>目前顯示區間內沒有航點班次異動。</p>
    </div>

    <!-- 矩陣（依容器寬度壓縮欄位，不做內部捲動） -->
    <div v-else ref="wrapperRef" class="matrix-scroll">
      <svg ref="svgRef" class="matrix-svg"></svg>

      <!-- Tooltip -->
      <div
        v-if="tooltipVisible"
        class="matrix-tooltip"
        :style="{
          left: tooltipFlip ? 'auto' : tooltipX + 14 + 'px',
          right: tooltipFlip ? `calc(100% - ${tooltipX - 14}px)` : 'auto',
          top: tooltipY + 'px',
        }"
      >
        <div class="matrix-tooltip-route">{{ tooltipContent.route }}</div>
        <div class="matrix-tooltip-city">{{ tooltipContent.city }}・{{ tooltipContent.country }}</div>
        <div v-if="!tooltipContent.hasService" class="matrix-tooltip-none">
          {{ tooltipContent.month }} 無航班資料
        </div>
        <div v-else class="matrix-tooltip-stats">
          <span>月份：{{ tooltipContent.month }}</span>
          <span v-if="tooltipContent.loadFactor !== undefined">
            載客率：{{ tooltipContent.loadFactor.toFixed(1) }}%
          </span>
          <span v-if="tooltipContent.passengerCount !== undefined">
            載客人數：{{ fmt.format(tooltipContent.passengerCount) }}
          </span>
          <span v-if="tooltipContent.flightCount !== undefined">
            飛行架次：{{ fmt.format(tooltipContent.flightCount) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
