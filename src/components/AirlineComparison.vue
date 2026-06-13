<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouteStore } from '../stores/routeStore'
import { formatNumber } from '../utils/routeMetrics'

const routeStore = useRouteStore()
const expanded = ref(true)

const maxPassengers = computed(() =>
  Math.max(...routeStore.airlineStats.map((a) => a.passengerCount), 1),
)
</script>

<template>
  <section class="airline-comparison" aria-label="航空公司比較總覽">
    <button type="button" class="comparison-header" @click="expanded = !expanded">
      <div class="comparison-header-text">
        <span class="section-eyebrow">Airline Overview</span>
        <strong>航空公司比拼</strong>
      </div>
      <span class="comparison-toggle-chip">{{ expanded ? '收合' : '展開' }}</span>
    </button>

    <Transition name="slide-down">
      <div v-if="expanded" class="comparison-body">
        <button
          v-for="(airline, index) in routeStore.airlineStats"
          :key="airline.airlineName"
          type="button"
          class="airline-row"
          :class="{ active: routeStore.filters.airlineName === airline.airlineName }"
          @click="routeStore.filters.airlineName = airline.airlineName"
        >
          <span class="airline-rank">{{ index + 1 }}</span>
          <span class="airline-main">
            <strong>{{ airline.airlineName }}</strong>
            <i :style="{ width: `${Math.max(6, (airline.passengerCount / maxPassengers) * 100)}%` }"></i>
          </span>
          <span class="airline-score">
            <strong>{{ formatNumber(airline.passengerCount) }}</strong>
            <small>{{ airline.flightCount }} 架次 · {{ airline.loadFactor.toFixed(1) }}%</small>
          </span>
        </button>
      </div>
    </Transition>
  </section>
</template>
