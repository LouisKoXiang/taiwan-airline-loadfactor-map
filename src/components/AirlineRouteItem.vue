<script setup lang="ts">
import type { AirlineRouteStats } from '../types/route'
import { formatNumber } from '../utils/routeMetrics'

defineProps<{
  airline: AirlineRouteStats
}>()
</script>

<template>
  <article class="airline-route-item">
    <div class="airline-route-rank">{{ airline.rank }}</div>
    <div class="airline-route-main">
      <div class="airline-route-topline">
        <strong>{{ airline.airlineName }}</strong>
        <span v-if="airline.airlineCode">{{ airline.airlineCode }}</span>
      </div>
      <div class="airline-route-bar">
        <i :style="{ width: `${Math.max(8, Math.min(100, airline.loadFactor))}%` }"></i>
      </div>
      <div class="stats-row">
        <span>{{ formatNumber(airline.flightCount) }} 架次</span>
        <span>{{ formatNumber(airline.passengerCount) }} 人</span>
        <span>{{ airline.loadFactor.toFixed(1) }}%</span>
      </div>
    </div>
  </article>
</template>
