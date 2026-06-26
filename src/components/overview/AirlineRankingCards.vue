<script setup lang="ts">
import { computed } from 'vue'
import type { AirlineYearlyStat } from '../../stores/marketOverviewStore'

const props = defineProps<{
  stats: AirlineYearlyStat[]
  year: number
}>()

const fmt = new Intl.NumberFormat('zh-TW')

interface Metric {
  key: keyof Pick<AirlineYearlyStat, 'avgLoadFactor' | 'passengerCount' | 'flightCount' | 'seatCount' | 'routeCount'>
  label: string
  format: (v: number) => string
}

const METRICS: Metric[] = [
  { key: 'avgLoadFactor',  label: '平均載客率', format: (v) => `${v.toFixed(1)}%` },
  { key: 'passengerCount', label: '載客人數',   format: (v) => fmt.format(Math.round(v)) },
  { key: 'flightCount',    label: '飛行架次',   format: (v) => fmt.format(Math.round(v)) },
  { key: 'seatCount',      label: '座位數',     format: (v) => fmt.format(Math.round(v)) },
  { key: 'routeCount',     label: '航線數',     format: (v) => `${v} 條` },
]

const sortedByMetric = computed(() =>
  METRICS.map((m) => ({
    ...m,
    ranked: [...props.stats]
      .filter((s) => s[m.key] > 0)
      .sort((a, b) => b[m.key] - a[m.key]),
  })),
)
</script>

<template>
  <div class="ranking-grid">
    <div v-for="metric in sortedByMetric" :key="metric.key" class="ranking-card">
      <div class="ranking-card-title">{{ metric.label }}</div>
      <div class="ranking-list">
        <div
          v-for="(stat, rank) in metric.ranked"
          :key="stat.airlineName"
          class="ranking-row"
        >
          <span class="rank-num" :class="`rank-num--${rank + 1}`">{{ rank + 1 }}</span>
          <span class="rank-dot" :style="{ background: stat.color }"></span>
          <span class="rank-airline">{{ stat.airlineName }}</span>
          <span class="rank-value">{{ metric.format(stat[metric.key]) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
