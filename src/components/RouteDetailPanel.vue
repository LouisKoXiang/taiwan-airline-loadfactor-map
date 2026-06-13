<script setup lang="ts">
import { computed } from 'vue'
import type { AirlineRouteStats, Route } from '../types/route'
import { formatNumber } from '../utils/routeMetrics'
import PassengerCompareChart from './PassengerCompareChart.vue'

const props = defineProps<{
  route?: Route
  stats?: Route | AirlineRouteStats
  airlines: AirlineRouteStats[]
}>()

defineEmits<{ close: [] }>()

const displayStats = computed(() => props.stats ?? props.route)
</script>

<template>
  <Transition name="panel-slide">
    <aside v-if="route" class="detail-panel">
      <!-- Header -->
      <div class="detail-panel__header">
        <div class="detail-panel__titles">
          <span class="eyebrow">航點詳情</span>
          <h2>{{ route.destinationDisplayName ?? route.destinationCityName }}</h2>
          <p>{{ route.destinationAirportCode }} · {{ route.destinationCountry }}</p>
        </div>
        <button
          type="button"
          class="panel-close-btn"
          aria-label="關閉詳情"
          @click="$emit('close')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Route path indicator -->
      <div class="detail-route">
        <span class="route-code">{{ route.originAirportCode }}</span>
        <div class="route-line-graphic">
          <div class="route-dot"></div>
          <div class="route-dash"></div>
          <div class="route-plane">✈</div>
          <div class="route-dash"></div>
          <div class="route-dot"></div>
        </div>
        <span class="route-code">{{ route.destinationAirportCode }}</span>
      </div>

      <!-- Stats grid -->
      <dl class="detail-stats">
        <div>
          <dt>飛行架次</dt>
          <dd>{{ formatNumber(displayStats?.flightCount ?? 0) }}</dd>
        </div>
        <div>
          <dt>座位數</dt>
          <dd>{{ formatNumber(displayStats?.seatCount ?? 0) }}</dd>
        </div>
        <div>
          <dt>載客人數</dt>
          <dd>{{ formatNumber(displayStats?.passengerCount ?? 0) }}</dd>
        </div>
        <div>
          <dt>載客率</dt>
          <dd class="stat-highlight">{{ (displayStats?.loadFactor ?? 0).toFixed(1) }}%</dd>
        </div>
      </dl>

      <!-- Airline ranking (top 5) -->
      <section class="airline-list">
        <span class="section-label">航空公司排名</span>
        <div
          v-for="airline in airlines.slice(0, 5)"
          :key="airline.airlineName"
          class="detail-airline-row"
        >
          <span class="detail-airline-rank">{{ airline.rank }}</span>
          <div class="detail-airline-info">
            <strong>{{ airline.airlineName }}</strong>
            <div class="detail-airline-bar-wrap">
              <div
                class="detail-airline-bar"
                :style="{ width: `${Math.min(100, airline.loadFactor)}%` }"
              ></div>
            </div>
          </div>
          <em>{{ formatNumber(airline.passengerCount) }} 人<br>{{ airline.loadFactor.toFixed(1) }}%</em>
        </div>
      </section>

      <!-- Inbound/outbound chart -->
      <section class="panel-section">
        <span class="section-label">入境 / 出境</span>
        <PassengerCompareChart
          :inbound="displayStats?.inboundPassengerCount ?? 0"
          :outbound="displayStats?.outboundPassengerCount ?? 0"
        />
      </section>
    </aside>
  </Transition>
</template>
