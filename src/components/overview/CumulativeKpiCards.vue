<script setup lang="ts">
import { ref } from 'vue'
import type { CumulativeAirlineSummary, CumulativeMetric, CumulativeOverviewSummary } from '../../stores/marketOverviewStore'
import { AIRLINE_META } from '../../types/airline'
import AnimatedNumber from './AnimatedNumber.vue'

defineProps<{
  summary: CumulativeOverviewSummary
}>()

const showFormula = ref(false)

function pctText(metric: CumulativeMetric): string | null {
  if (metric.percentChange === null) return null
  return `${metric.percentChange >= 0 ? '↑' : '↓'}${Math.abs(metric.percentChange).toFixed(1)}% vs 去年同期`
}

function ppText(metric: CumulativeMetric): string | null {
  if (metric.delta === null) return null
  return `${metric.delta >= 0 ? '↑' : '↓'}${Math.abs(metric.delta).toFixed(1)}pp vs 去年同期`
}

function airlineCode(card: CumulativeAirlineSummary): string {
  return AIRLINE_META[card.airlineName].code
}
</script>

<template>
  <section class="overview-section">
    <div class="overview-section-heading">
      <div>
        <h2 class="overview-section-title">{{ summary.year }} 年度各航空累積表現</h2>
        <p class="overview-section-note">
          統計 {{ summary.monthRangeLabel }}，並與 {{ summary.prevMonthRangeLabel }} 比較。
        </p>
      </div>
    </div>

    <div class="cumulative-kpi-grid">
      <article
        v-for="card in summary.airlines"
        :key="card.airlineName"
        class="cumulative-kpi-card"
        :style="{ '--airline-accent': card.color }"
      >
        <div class="cumulative-kpi-airline">
          <span class="cumulative-kpi-code">{{ airlineCode(card) }}</span>
          <strong>{{ card.airlineName }}</strong>
        </div>

        <div class="cumulative-kpi-metrics">
          <div class="cumulative-kpi-metric">
            <span class="cumulative-kpi-label">載客人數</span>
            <strong class="cumulative-kpi-value">
              <AnimatedNumber :value="card.passengerCount.current" />
            </strong>
            <span
              v-if="pctText(card.passengerCount)"
              class="cumulative-kpi-yoy"
              :class="card.passengerCount.percentChange !== null && card.passengerCount.percentChange >= 0 ? 'cumulative-kpi-yoy--pos' : 'cumulative-kpi-yoy--neg'"
            >
              {{ pctText(card.passengerCount) }}
            </span>
            <span v-else class="cumulative-kpi-yoy cumulative-kpi-yoy--muted">無去年同期資料</span>
          </div>

          <div class="cumulative-kpi-metric cumulative-kpi-metric--load">
            <div class="cumulative-kpi-label-row">
              <span class="cumulative-kpi-label">平均載客率</span>
              <button
                type="button"
                class="cumulative-kpi-info"
                aria-label="平均載客率公式"
                @click="showFormula = true"
              >?</button>
            </div>
            <strong class="cumulative-kpi-value cumulative-kpi-value--load">
              <AnimatedNumber :value="card.avgLoadFactor.current" :decimals="1" suffix="%" />
            </strong>
            <span
              v-if="ppText(card.avgLoadFactor)"
              class="cumulative-kpi-yoy"
              :class="card.avgLoadFactor.delta !== null && card.avgLoadFactor.delta >= 0 ? 'cumulative-kpi-yoy--pos' : 'cumulative-kpi-yoy--neg'"
            >
              {{ ppText(card.avgLoadFactor) }}
            </span>
            <span v-else class="cumulative-kpi-yoy cumulative-kpi-yoy--muted">無去年同期資料</span>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="showFormula"
      class="formula-dialog-backdrop"
      role="presentation"
      @click.self="showFormula = false"
    >
      <section class="formula-dialog" role="dialog" aria-modal="true" aria-label="平均載客率公式">
        <div class="formula-dialog-header">
          <h3>平均載客率公式</h3>
          <button type="button" class="formula-dialog-close" aria-label="關閉" @click="showFormula = false">×</button>
        </div>
        <p>
          平均載客率以加權方式計算：
          <strong>累積載客人數 ÷ 累積座位數 × 100</strong>。
        </p>
        <p>
          因此它不是把每個月份或每條航線的載客率直接平均，而是用整段期間的總載客人數與總座位數計算。
        </p>
      </section>
    </div>
  </section>
</template>
