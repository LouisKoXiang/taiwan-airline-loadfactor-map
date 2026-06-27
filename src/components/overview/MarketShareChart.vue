<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AirlineYearlyStat } from '../../stores/marketOverviewStore'

const props = defineProps<{
  stats: AirlineYearlyStat[]
  previousStats?: AirlineYearlyStat[]
  currentLabel: string
  previousLabel?: string
}>()

const fmt = new Intl.NumberFormat('zh-TW')
const showInfo = ref(false)

interface ShareBar {
  airline: string
  color: string
  value: number
  pct: number
  label: string
}

function makeBars(stats: AirlineYearlyStat[]): ShareBar[] {
  const total = stats.reduce((s, st) => s + st.passengerCount, 0)
  return [...stats]
    .sort((a, b) => b.passengerCount - a.passengerCount)
    .map((st) => ({
      airline: st.airlineName,
      color: st.color,
      value: st.passengerCount,
      pct: total > 0 ? (st.passengerCount / total) * 100 : 0,
      label: fmt.format(Math.round(st.passengerCount)),
    }))
}

const currentBars = computed(() => makeBars(props.stats))
const previousBars = computed(() => props.previousStats ? makeBars(props.previousStats) : [])
const hasPrevious = computed(() => previousBars.value.some((bar) => bar.value > 0))
</script>

<template>
  <div class="market-share-wrap">
    <div class="share-title-row">
      <div class="share-metric-title">國籍航空載客人數佔比</div>
      <button type="button" class="share-info-button" aria-label="市佔比較說明" @click="showInfo = true">?</button>
    </div>

    <div class="share-period">
      <div class="share-period-heading">{{ currentLabel }}</div>
      <div class="share-stacked-bar">
        <div
          v-for="bar in currentBars"
          :key="bar.airline"
          class="share-stacked-segment"
          :style="{ width: bar.pct + '%', background: bar.color }"
          :title="`${bar.airline}: ${bar.pct.toFixed(1)}%`"
        >
          <span v-if="bar.pct >= 8" class="share-stacked-label">{{ bar.pct.toFixed(1) }}%</span>
        </div>
      </div>
      <div class="share-legend">
        <div v-for="bar in currentBars" :key="bar.airline" class="share-legend-item">
          <span class="share-legend-dot" :style="{ background: bar.color }"></span>
          <span class="share-legend-airline">{{ bar.airline }}</span>
          <span class="share-legend-value">{{ bar.label }}</span>
        </div>
      </div>
    </div>

    <div v-if="hasPrevious" class="share-period share-period--previous">
      <div class="share-period-heading">{{ previousLabel }}</div>
      <div class="share-stacked-bar share-stacked-bar--previous">
        <div
          v-for="bar in previousBars"
          :key="bar.airline"
          class="share-stacked-segment"
          :style="{ width: bar.pct + '%', background: bar.color }"
          :title="`${bar.airline}: ${bar.pct.toFixed(1)}%`"
        >
          <span v-if="bar.pct >= 8" class="share-stacked-label">{{ bar.pct.toFixed(1) }}%</span>
        </div>
      </div>
      <div class="share-legend">
        <div v-for="bar in previousBars" :key="bar.airline" class="share-legend-item">
          <span class="share-legend-dot" :style="{ background: bar.color }"></span>
          <span class="share-legend-airline">{{ bar.airline }}</span>
          <span class="share-legend-value">{{ bar.label }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="showInfo"
      class="formula-dialog-backdrop"
      role="presentation"
      @click.self="showInfo = false"
    >
      <section class="formula-dialog" role="dialog" aria-modal="true" aria-label="國籍航空市佔比較說明">
        <div class="formula-dialog-header">
          <h3>市佔比較說明</h3>
          <button type="button" class="formula-dialog-close" aria-label="關閉" @click="showInfo = false">×</button>
        </div>
        <p>
          今年佔比採用目前年度已匯入月份的累積載客人數計算。
        </p>
        <p>
          去年對比採用去年完整年度的載客人數，因此用途是觀察四家國籍航空的乘客結構比例，而不是直接比較成長率。
        </p>
      </section>
    </div>
  </div>
</template>
