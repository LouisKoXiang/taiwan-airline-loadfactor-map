<script setup lang="ts">
import { nextTick, watch } from 'vue'
import AirlineComparison from '../components/AirlineComparison.vue'
import AirlineRouteItem from '../components/AirlineRouteItem.vue'
import RouteCard from '../components/RouteCard.vue'
import RouteDetailPanel from '../components/RouteDetailPanel.vue'
import RouteFilter from '../components/RouteFilter.vue'
import RouteMap from '../components/RouteMap.vue'
import { useRouteStore } from '../stores/routeStore'
import { formatNumber } from '../utils/routeMetrics'

const routeStore = useRouteStore()

watch(
  () => routeStore.focusedRouteId,
  async (routeId) => {
    await nextTick()
    document.getElementById(`route-${routeId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <header class="hero-copy">
        <span class="eyebrow">Airline Route Explorer</span>
        <h1>台灣航點探索地圖</h1>
        <p>從台灣出發，比較各航空公司的航線規模、載客率與航點布局。</p>
      </header>

      <section class="summary-strip" aria-label="航線摘要">
        <div class="summary-cell">
          <strong>{{ routeStore.summary.routeCount }}</strong>
          <span>航線</span>
        </div>
        <div class="summary-cell">
          <strong>{{ formatNumber(routeStore.summary.passengerCount) }}</strong>
          <span>載客人數</span>
        </div>
        <div class="summary-cell">
          <strong>{{ routeStore.summary.avgLoadFactor.toFixed(1) }}%</strong>
          <span>平均載客率</span>
        </div>
      </section>

      <RouteFilter />

      <AirlineComparison v-if="!routeStore.selectedRoute" />

      <section
        class="route-list"
        :aria-label="routeStore.selectedRoute ? '航點航空公司排名' : '航點卡片列表'"
      >
        <template v-if="routeStore.selectedRoute">
          <div class="selected-route-heading">
            <button type="button" class="back-btn" @click="routeStore.clearSelection()">
              ← 全部航點
            </button>
            <span class="selected-route-code">
              {{ routeStore.selectedRoute.originAirportCode }} → {{ routeStore.selectedRoute.destinationAirportCode }}
            </span>
            <strong class="selected-route-name">
              {{ routeStore.selectedRoute.destinationDisplayName ?? routeStore.selectedRoute.destinationCityName }} 航空公司排名
            </strong>
          </div>
          <AirlineRouteItem
            v-for="airline in routeStore.selectedRouteAirlines"
            :key="`${routeStore.selectedRoute.id}-${airline.airlineName}`"
            :airline="airline"
          />
        </template>

        <template v-else>
          <RouteCard
            v-for="route in routeStore.filteredRoutes"
            :id="`route-${route.id}`"
            :key="route.id"
            :route="route"
            :stats="routeStore.routeStatsForFilter(route)"
            :active="route.id === routeStore.selectedRouteId"
            @select="routeStore.selectRoute"
          />
          <div v-if="routeStore.filteredRoutes.length === 0" class="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>找不到符合條件的航點</p>
            <button type="button" @click="routeStore.resetFilters()">重設篩選條件</button>
          </div>
        </template>
      </section>
    </aside>

    <section class="map-stage">
      <RouteMap />
      <RouteDetailPanel
        :route="routeStore.selectedRoute"
        :stats="routeStore.selectedRoute ? routeStore.routeStatsForFilter(routeStore.selectedRoute) : undefined"
        :airlines="routeStore.selectedRouteAirlines"
        @close="routeStore.clearSelection()"
      />
    </section>
  </div>
</template>
