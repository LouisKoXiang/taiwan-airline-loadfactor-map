<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import landAtlas from 'world-atlas/land-110m.json'
import { useRouteStore } from '../stores/routeStore'
import type { Route } from '../types/route'
import { formatNumber, getLoadColor, getMetricValue } from '../utils/routeMetrics'
import { getArcPath } from '../composables/useArcPath'

const worldLand = feature(
  landAtlas as any,
  (landAtlas as any).objects.land,
) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry>

const continentLabels = [
  { name: '北美洲', coordinates: [-104, 46] as [number, number] },
  { name: '南美洲', coordinates: [-61, -18] as [number, number] },
  { name: '歐洲', coordinates: [14, 51] as [number, number] },
  { name: '非洲', coordinates: [20, 4] as [number, number] },
  { name: '亞洲', coordinates: [86, 34] as [number, number] },
  { name: '澳洲', coordinates: [135, -24] as [number, number] },
]

const routeStore = useRouteStore()
const wrapperRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const tooltip = ref({ visible: false, x: 0, y: 0, route: null as Route | null })
const size = ref({ width: 900, height: 720 })
const currentZoom = ref(1)

let resizeObserver: ResizeObserver | undefined
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | undefined
let currentProjection: d3.GeoProjection | undefined

const routes = computed(() => routeStore.filteredRoutes)

const makeProjection = () =>
  d3
    .geoNaturalEarth1()
    .fitExtent([[24, 24], [size.value.width - 24, size.value.height - 52]], worldLand)

const originRoutes = (routeList: Route[]) => {
  const seen = new Set<string>()
  return routeList.filter((r) => {
    if (seen.has(r.originAirportCode)) return false
    seen.add(r.originAirportCode)
    return true
  })
}

// 完整重建 SVG：只在尺寸或資料變更時呼叫。
const render = () => {
  if (!svgRef.value) return

  const { width, height } = size.value
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  currentProjection = makeProjection()
  const projection = currentProjection
  const path = d3.geoPath(projection)
  const root = svg.append('g').attr('class', 'map-root')

  // 底圖：經緯線
  const graticule = d3.geoGraticule().step([15, 15])
  root.append('path').datum(graticule()).attr('class', 'graticule').attr('d', path)

  // 底圖：陸地
  root
    .append('g')
    .attr('class', 'land-layer')
    .selectAll('path')
    .data(worldLand.features)
    .join('path')
    .attr('d', path)
    .attr('class', 'land')

  // 底圖：洲名標籤
  root
    .append('g')
    .attr('class', 'continent-labels')
    .selectAll('text')
    .data(continentLabels)
    .join('text')
    .attr('x', (d) => projection(d.coordinates)?.[0] ?? 0)
    .attr('y', (d) => projection(d.coordinates)?.[1] ?? 0)
    .text((d) => d.name)

  // 航線弧線
  const metricExtent = d3.extent(
    routes.value,
    (r) => getMetricValue(r, routeStore.filters.viewMetric),
  ) as [number, number]
  const strokeScale = d3
    .scaleSqrt()
    .domain(metricExtent[0] === metricExtent[1] ? [0, metricExtent[1] ?? 1] : metricExtent)
    .range([1.4, 6.5])
  const opacityScale = d3.scaleLinear().domain([40, 350]).range([0.22, 0.8]).clamp(true)

  const isSelected = !!routeStore.selectedRouteId

  root
    .append('g')
    .attr('class', 'route-layer')
    .selectAll<SVGPathElement, Route>('path')
    .data(routes.value, (r) => r.id)
    .join('path')
    .attr('class', (r) =>
      ['route-line', r.id === routeStore.selectedRouteId ? 'selected' : '', isSelected && r.id !== routeStore.selectedRouteId ? 'dimmed' : '']
        .filter(Boolean)
        .join(' '),
    )
    .attr('d', (r) => getArcPath(r, projection))
    .attr('stroke', (r) => getLoadColor(r.loadFactor))
    .attr('stroke-width', (r) => strokeScale(getMetricValue(r, routeStore.filters.viewMetric)))
    .attr('stroke-opacity', (r) => opacityScale(r.flightCount))
    .on('pointermove', (event, r) => showTooltip(event, r))
    .on('pointerleave', hideTooltip)
    .on('click', (_, r) => routeStore.selectRoute(r.id))

  // 目的地標記
  root
    .append('g')
    .attr('class', 'marker-layer')
    .selectAll<SVGGElement, Route>('g')
    .data(routes.value, (r) => r.id)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'marker')
      const content = g.append('g').attr('class', 'marker-content')
      content.append('circle').attr('r', 5.5).attr('class', 'marker-ring')
      content.append('circle').attr('r', 2.6).attr('class', 'marker-dot')
      content
        .append('text')
        .attr('class', 'marker-label')
        .attr('x', 9)
        .attr('y', -8)
        .text((r) => `${r.destinationDisplayName ?? r.destinationCityName} (${r.destinationAirportCode})`)
      return g
    })
    .attr('transform', (r) => {
      const [px, py] = projection(r.coordinates.destination) ?? [0, 0]
      return `translate(${px},${py})`
    })
    .classed('selected', (r) => r.id === routeStore.selectedRouteId)
    .classed('dimmed', (r) => isSelected && r.id !== routeStore.selectedRouteId)
    .on('pointermove', (event, r) => showTooltip(event, r))
    .on('pointerleave', hideTooltip)
    .on('click', (_, r) => routeStore.selectRoute(r.id))

  // 出發地標記（永遠位於最上層）
  root
    .append('g')
    .attr('class', 'origin-layer')
    .selectAll<SVGGElement, Route>('g')
    .data(originRoutes(routes.value), (r) => r.originAirportCode)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'origin-marker')
      const content = g.append('g').attr('class', 'origin-marker-content')
      content.append('circle').attr('r', 9)
      content.append('circle').attr('r', 3.8)
      content.append('text').attr('x', 13).attr('y', 4).text((r) => r.originAirportCode)
      return g
    })
    .attr('transform', (r) => {
      const [px, py] = projection(r.coordinates.origin) ?? [0, 0]
      return `translate(${px},${py})`
    })

  // 地圖縮放
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 7])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
      const k = event.transform.k
      currentZoom.value = k
      root
        .selectAll<SVGGElement, unknown>('.marker-content, .origin-marker-content')
        .attr('transform', `scale(${1 / k})`)
    })

  svg.call(zoomBehavior)
}

// 輕量更新：只切換既有 DOM 節點上的 CSS class。
const updateSelection = () => {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  const isSelected = !!routeStore.selectedRouteId

  svg
    .selectAll<SVGPathElement, Route>('.route-line')
    .classed('selected', (r) => r.id === routeStore.selectedRouteId)
    .classed('dimmed', (r) => isSelected && r.id !== routeStore.selectedRouteId)

  svg
    .selectAll<SVGGElement, Route>('.marker')
    .classed('selected', (r) => r.id === routeStore.selectedRouteId)
    .classed('dimmed', (r) => isSelected && r.id !== routeStore.selectedRouteId)
}

const showTooltip = (event: PointerEvent, route: Route) => {
  const bounds = wrapperRef.value?.getBoundingClientRect()
  let x = event.clientX - (bounds?.left ?? 0) + 18
  let y = event.clientY - (bounds?.top ?? 0) + 18
  // 讓 tooltip 維持在地圖面板內。
  const panelW = bounds?.width ?? 900
  if (x + 240 > panelW) x = event.clientX - (bounds?.left ?? 0) - 250
  tooltip.value = { visible: true, x, y, route }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}

const zoomToRoute = (animate = true) => {
  if (!svgRef.value || !zoomBehavior || !routeStore.selectedRoute || !currentProjection) return
  const { width, height } = size.value
  const dest = currentProjection(routeStore.selectedRoute.coordinates.destination)
  const origin = currentProjection(routeStore.selectedRoute.coordinates.origin)
  if (!dest || !origin) return

  // 以出發地與目的地中點置中，並放大 2.2 倍。
  const cx = (dest[0] + origin[0]) / 2
  const cy = (dest[1] + origin[1]) / 2

  const transform = d3.zoomIdentity
    .translate(width * 0.5, height * 0.48)
    .scale(2.2)
    .translate(-cx, -cy)

  const svg = d3.select(svgRef.value)
  if (animate) {
    svg.transition().duration(680).call(zoomBehavior.transform, transform)
  } else {
    svg.call(zoomBehavior.transform, transform)
  }
}

const resetZoom = () => {
  if (!svgRef.value || !zoomBehavior) return
  d3.select(svgRef.value).transition().duration(480).call(zoomBehavior.transform, d3.zoomIdentity)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    size.value = { width: Math.max(320, width), height: Math.max(360, height) }
  })
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  render()
})

watch(size, render)
watch(
  () => [routes.value, routeStore.filters.viewMetric] as const,
  render,
  { deep: true },
)
watch(
  () => routeStore.selectedRouteId,
  (newId) => {
    updateSelection()
    if (newId) {
      void nextTick(() => zoomToRoute())
    } else {
      resetZoom()
    }
  },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <section ref="wrapperRef" class="map-panel">
    <svg ref="svgRef" class="route-map" role="img" aria-label="台灣出發的全球航線地圖"></svg>

    <!-- 浮動地圖控制 -->
    <div class="map-controls">
      <button
        v-if="currentZoom > 1.05"
        type="button"
        class="map-ctrl-btn"
        title="重設地圖視角"
        @click="resetZoom"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
        重設視角
      </button>
      <button
        v-if="routeStore.selectedRouteId"
        type="button"
        class="map-ctrl-btn map-ctrl-btn--clear"
        title="清除選取"
        @click="routeStore.clearSelection()"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        清除選取
      </button>
    </div>

    <!-- 圖例 -->
    <div class="map-legend">
      <span><i class="legend-swatch legend-high"></i>高載客率 ≥85%</span>
      <span><i class="legend-swatch legend-mid"></i>中載客率 75–84%</span>
      <span><i class="legend-swatch legend-low"></i>低載客率 &lt;75%</span>
    </div>

    <!-- 地圖提示框 -->
    <Transition name="tooltip-fade">
      <div
        v-if="tooltip.visible && tooltip.route"
        class="map-tooltip"
        :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
      >
        <strong>{{ tooltip.route.originAirportCode }} → {{ tooltip.route.destinationAirportCode }}</strong>
        <span class="tooltip-city">{{ tooltip.route.destinationDisplayName ?? tooltip.route.destinationCityName }}・{{ tooltip.route.destinationCountry }}</span>
        <div class="tooltip-stats">
          <span>{{ formatNumber(tooltip.route.passengerCount) }} 人</span>
          <span>{{ tooltip.route.loadFactor.toFixed(1) }}% 載客率</span>
          <span>{{ formatNumber(tooltip.route.flightCount) }} 架次</span>
        </div>
        <span class="tooltip-airlines">{{ tooltip.route.airlineRankings.length }} 家航空 · 首選 {{ tooltip.route.airlineRankings[0]?.airlineName ?? '—' }}</span>
      </div>
    </Transition>
  </section>
</template>
