<script setup lang="ts">
import { computed } from 'vue'
import type { AirlineYearlyStat } from '../../stores/marketOverviewStore'

const props = defineProps<{
  stats: AirlineYearlyStat[]
}>()

const fmt = new Intl.NumberFormat('zh-TW')

interface ShareMetric {
  key: 'passengerCount' | 'flightCount'
  label: string
}

const SHARE_METRICS: ShareMetric[] = [
  { key: 'passengerCount', label: '載客人數市佔率' },
  { key: 'flightCount',    label: '飛行架次市佔率' },
]

const shareData = computed(() =>
  SHARE_METRICS.map((metric) => {
    const total = props.stats.reduce((s, st) => s + st[metric.key], 0)
    const bars = [...props.stats]
      .sort((a, b) => b[metric.key] - a[metric.key])
      .map((st) => ({
        airline: st.airlineName,
        color: st.color,
        value: st[metric.key],
        pct: total > 0 ? (st[metric.key] / total) * 100 : 0,
        label: fmt.format(Math.round(st[metric.key])),
      }))
    return { ...metric, total, bars }
  }),
)
</script>

<template>
  <div class="market-share-wrap">
    <div v-for="metric in shareData" :key="metric.key" class="share-metric">
      <div class="share-metric-title">{{ metric.label }}</div>
      <!-- Stacked bar -->
      <div class="share-stacked-bar">
        <div
          v-for="bar in metric.bars"
          :key="bar.airline"
          class="share-stacked-segment"
          :style="{ width: bar.pct + '%', background: bar.color }"
          :title="`${bar.airline}: ${bar.pct.toFixed(1)}%`"
        >
          <span v-if="bar.pct >= 8" class="share-stacked-label">{{ bar.pct.toFixed(1) }}%</span>
        </div>
      </div>
      <!-- Legend with values -->
      <div class="share-legend">
        <div v-for="bar in metric.bars" :key="bar.airline" class="share-legend-item">
          <span class="share-legend-dot" :style="{ background: bar.color }"></span>
          <span class="share-legend-airline">{{ bar.airline }}</span>
          <span class="share-legend-value">{{ bar.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
