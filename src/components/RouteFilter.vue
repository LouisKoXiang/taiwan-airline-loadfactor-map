<script setup lang="ts">
import { useRouteStore } from '../stores/routeStore'
import type { ViewMetric } from '../types/route'

const routeStore = useRouteStore()

const metrics: { label: string; value: ViewMetric }[] = [
  { label: '載客人數', value: 'passengers' },
  { label: '載客率', value: 'loadFactor' },
  { label: '飛行架次', value: 'flightCount' },
]

const airports = [
  { code: 'TPE', label: '台北桃園' },
  { code: 'TSA', label: '台北松山' },
  { code: 'KHH', label: '高雄' },
  { code: 'RMQ', label: '台中' },
]
</script>

<template>
  <section class="filter-panel" aria-label="航點篩選">
    <!-- Origin airport -->
    <div class="field">
      <span class="field-label">出發機場</span>
      <div class="airport-tabs">
        <button
          v-for="ap in airports"
          :key="ap.code"
          type="button"
          :class="{ active: routeStore.filters.originAirportCode === ap.code }"
          @click="routeStore.filters.originAirportCode = ap.code"
        >
          <strong>{{ ap.code }}</strong>
          <small>{{ ap.label }}</small>
        </button>
      </div>
    </div>

    <!-- Destination search -->
    <label class="field">
      <span class="field-label">目的地搜尋</span>
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="routeStore.filters.searchTerm"
          type="search"
          placeholder="城市、國家或航點代碼"
        />
      </div>
    </label>

    <!-- Airline + Country row -->
    <div class="filter-row">
      <label class="field">
        <span class="field-label">航空公司</span>
        <select v-model="routeStore.filters.airlineName">
          <option v-for="a in routeStore.airlines" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">國家 / 地區</span>
        <select v-model="routeStore.filters.destinationCountry">
          <option v-for="c in routeStore.countries" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </div>

    <!-- Metric switch + reset -->
    <div class="filter-footer">
      <div class="metric-switch">
        <span class="field-label">視角</span>
        <button
          v-for="m in metrics"
          :key="m.value"
          type="button"
          :class="{ active: routeStore.filters.viewMetric === m.value }"
          @click="routeStore.setViewMetric(m.value)"
        >
          {{ m.label }}
        </button>
      </div>

      <button
        v-if="routeStore.isFilterActive"
        type="button"
        class="reset-btn"
        @click="routeStore.resetFilters()"
      >
        重設篩選
      </button>
    </div>
  </section>
</template>
