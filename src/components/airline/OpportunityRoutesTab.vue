<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

function yoyText(value: number | undefined) {
  if (value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}
</script>

<template>
  <div class="opp-tab">
    <div class="opp-intro">
      <p>載客率 ≥ 90% 且（航班數低於中位數，或旅客同期增長 ≥ 20%）的航線，代表需求強勁但供給相對不足。</p>
    </div>

    <div v-if="store.opportunityRoutes.length === 0" class="yoy-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ store.activeMonth }} {{ store.selectedAirline }}目前無增班潛力航線。</p>
    </div>

    <div v-else class="opp-list">
      <RouterLink
        v-for="r in store.opportunityRoutes"
        :key="`${r.originAirportCode}-${r.destinationAirportCode}`"
        :to="`/routes/${r.originAirportCode}-${r.destinationAirportCode}`"
        class="opp-item"
      >
        <div class="opp-item-main">
          <div class="opp-item-route">
            <span class="code-cell">{{ r.originAirportCode }}</span>
            <span class="opp-arrow">→</span>
            <span class="code-cell">{{ r.destinationAirportCode }}</span>
            <strong class="opp-city">{{ r.destinationCityName }}</strong>
            <span class="country-cell">{{ r.destinationCountry }}</span>
          </div>
          <span class="opp-reason">{{ r.reason }}</span>
        </div>
        <div class="opp-item-metrics">
          <span class="lf-badge lf-high">{{ r.loadFactor.toFixed(1) }}%</span>
          <span class="opp-metric">{{ formatNum(r.passengerCount) }} 人</span>
          <span class="opp-metric">{{ formatNum(r.flightCount) }} 次</span>
          <span class="opp-metric">YoY {{ yoyText(r.yoyPassengerPct) }}</span>
          <span class="route-drill-cta">查看航線 →</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
