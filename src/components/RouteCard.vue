<script setup lang="ts">
import type { AirlineRouteStats, Route } from '../types/route'
import { formatNumber, getLoadLevel, getRegionClass } from '../utils/routeMetrics'

defineProps<{
  route: Route
  stats: Route | AirlineRouteStats
  active: boolean
}>()

defineEmits<{
  select: [routeId: string]
}>()
</script>

<template>
  <article
    class="route-card"
    :class="{ active }"
    role="button"
    tabindex="0"
    @click="$emit('select', route.id)"
    @keydown.enter="$emit('select', route.id)"
  >
    <div
      class="route-card__visual"
      :class="[getRegionClass(route.destinationCountry), `load-${getLoadLevel(stats.loadFactor)}`]"
    >
      <span class="card-airport-code">{{ route.destinationAirportCode }}</span>
      <span class="card-load-badge">{{ stats.loadFactor.toFixed(0) }}%</span>
    </div>

    <div class="route-card__body">
      <div class="route-card__topline">
        <strong>{{ route.destinationDisplayName ?? route.destinationCityName }}</strong>
        <span class="route-country">{{ route.destinationCountry }}</span>
      </div>
      <p class="route-card__meta">{{ route.airlineRankings.length }} 家航空公司飛行</p>

      <div class="stats-row">
        <span>{{ formatNumber(stats.passengerCount) }} 人</span>
        <span>{{ formatNumber(stats.flightCount) }} 架次</span>
        <span class="load-pill" :class="`load-pill--${getLoadLevel(stats.loadFactor)}`">
          {{ stats.loadFactor.toFixed(1) }}%
        </span>
      </div>

      <div class="card-airline-hint">
        <span v-if="'airlineName' in stats">{{ stats.airlineName }}</span>
        <span v-else>{{ route.airlineRankings[0]?.airlineName }} 等</span>
      </div>
    </div>
  </article>
</template>
