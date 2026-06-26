<script setup lang="ts">
import type { AirportStat } from '../../stores/marketOverviewStore'

defineProps<{ breakdown: AirportStat[] }>()

const AIRPORT_NAMES: Record<string, string> = {
  TPE: '桃園國際機場',
  TSA: '台北松山機場',
  KHH: '高雄國際機場',
  RMQ: '台中國際機場',
}

const fmt = new Intl.NumberFormat('zh-TW')

function maxPax(ap: AirportStat): number {
  let m = 0
  for (const d of ap.airlineData) {
    if (d.passengerCount > m) m = d.passengerCount
    if (d.previousPassengerCount !== null && d.previousPassengerCount > m) m = d.previousPassengerCount
  }
  return m || 1
}

function pct(v: number, max: number): string {
  return Math.min(100, (v / max) * 100).toFixed(1) + '%'
}
</script>

<template>
  <div class="airport-grid">
    <div v-for="ap in breakdown" :key="ap.airport" class="airport-card">
      <div class="airport-card-header">
        <span class="airport-code">{{ ap.airport }}</span>
        <span class="airport-name">{{ AIRPORT_NAMES[ap.airport] ?? ap.airport }}</span>
      </div>
      <div class="airport-airlines">
        <div v-for="d in ap.airlineData" :key="d.airline" class="apb-airline-block">
          <div class="apb-airline-header">
            <span class="apb-name">{{ d.airline }}</span>
            <span
              v-if="d.passengerYoYPct !== null"
              class="apb-yoy"
              :class="d.passengerYoYPct >= 0 ? 'apb-yoy--up' : 'apb-yoy--down'"
            >
              {{ d.passengerYoYPct >= 0 ? '+' : '' }}{{ d.passengerYoYPct.toFixed(1) }}%
            </span>
          </div>
          <!-- Current year -->
          <div class="apb-row">
            <span class="apb-lbl">今年</span>
            <div class="apb-track">
              <div class="apb-fill" :style="{ width: pct(d.passengerCount, maxPax(ap)), background: d.color }"></div>
            </div>
            <span class="apb-val">{{ fmt.format(Math.round(d.passengerCount)) }}</span>
          </div>
          <!-- Previous year -->
          <div v-if="d.previousPassengerCount !== null" class="apb-row">
            <span class="apb-lbl apb-lbl--prev">同期</span>
            <div class="apb-track apb-track--prev">
              <div class="apb-fill apb-fill--prev" :style="{ width: pct(d.previousPassengerCount, maxPax(ap)) }"></div>
            </div>
            <span class="apb-val apb-val--prev">{{ fmt.format(Math.round(d.previousPassengerCount)) }}</span>
          </div>
          <div v-else class="apb-row">
            <span class="apb-lbl apb-lbl--prev">同期</span>
            <span class="apb-no-data">無同期資料</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
