<script setup lang="ts">
import { computed } from 'vue'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

function diffClass(val: number | undefined) {
  if (val === undefined) return ''
  return val >= 0 ? 'yoy-diff--pos' : 'yoy-diff--neg'
}

function diffText(val: number | undefined, unit: string) {
  if (val === undefined) return '—'
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}${unit}`
}

// 整體摘要卡片
const summaryCards = computed(() => {
  const s = store.yoySummary
  return [
    {
      label: '載客率',
      value: store.summary.avgLoadFactor.toFixed(1) + '%',
      diff: s.loadFactorPp,
      diffText: diffText(s.loadFactorPp, 'pp'),
      unit: 'pp vs 去年',
    },
    {
      label: '載客人數',
      value: formatNum(store.summary.passengerCount),
      diff: s.passengerPct,
      diffText: diffText(s.passengerPct, '%'),
      unit: '% vs 去年',
    },
    {
      label: '飛行架次',
      value: formatNum(store.summary.flightCount),
      diff: s.flightPct,
      diffText: diffText(s.flightPct, '%'),
      unit: '% vs 去年',
    },
    {
      label: '座位數',
      value: formatNum(store.summary.seatCount),
      diff: s.seatPct,
      diffText: diffText(s.seatPct, '%'),
      unit: '% vs 去年',
    },
    {
      label: '航點數',
      value: formatNum(store.summary.routeCount),
      diff: s.routeCountChange,
      diffText: diffText(s.routeCountChange, ''),
      unit: '條 vs 去年',
    },
  ]
})

</script>

<template>
  <div class="yoy-tab">
    <!-- 無去年同月資料 -->
    <div v-if="!store.hasPreviousYearData" class="yoy-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <p>{{ store.yoySummary.summaryText }}</p>
      <small>匯入 {{ store.previousYearMonth || '去年同月' }} 的 ODS 資料後將自動顯示同期比較。</small>
    </div>

    <template v-else>
      <!-- 整體摘要卡片列 -->
      <div class="yoy-summary-grid">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          class="yoy-card"
          :class="card.diff !== undefined ? (card.diff >= 0 ? 'yoy-card--pos' : 'yoy-card--neg') : ''"
        >
          <span class="yoy-card-label">{{ card.label }}</span>
          <strong class="yoy-card-value">{{ card.value }}</strong>
          <span class="yoy-card-diff" :class="diffClass(card.diff)">
            {{ card.diffText }} {{ card.unit }}
          </span>
        </div>
      </div>

      <!-- 摘要文字 -->
      <p class="yoy-summary-text">{{ store.yoySummary.summaryText }}</p>

      <!-- 各航線同期比較表 -->
      <div class="table-wrap">
        <table class="route-data-table yoy-table">
          <thead>
            <tr>
              <th>出發</th>
              <th>目的地</th>
              <th>城市</th>
              <th class="num-col">本月載客率</th>
              <th class="num-col">vs 去年</th>
              <th class="num-col">本月載客人數</th>
              <th class="num-col">vs 去年</th>
              <th class="num-col">本月架次</th>
              <th class="num-col">vs 去年</th>
              <th class="num-col">本月座位</th>
              <th class="num-col">vs 去年</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in store.routesWithYoY" :key="`${r.originAirportCode}-${r.destinationAirportCode}`">
              <td class="code-cell">{{ r.originAirportCode }}</td>
              <td class="code-cell">{{ r.destinationAirportCode }}</td>
              <td>{{ r.destinationCityName }}</td>
              <td class="num-col">
                <span class="lf-badge" :class="r.loadFactor >= 90 ? 'lf-high' : r.loadFactor >= 80 ? 'lf-mid' : 'lf-low'">
                  {{ r.loadFactor.toFixed(1) }}%
                </span>
              </td>
              <td class="num-col">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyLoadFactorPp)">
                  {{ diffText(r.yoyLoadFactorPp, 'pp') }}
                </span>
                <span v-else class="route-tag route-tag--new">新增</span>
              </td>
              <td class="num-col">{{ formatNum(r.passengerCount) }}</td>
              <td class="num-col">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyPassengerPct)">
                  {{ diffText(r.yoyPassengerPct, '%') }}
                </span>
              </td>
              <td class="num-col">{{ formatNum(r.flightCount) }}</td>
              <td class="num-col">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyFlightPct)">
                  {{ diffText(r.yoyFlightPct, '%') }}
                </span>
              </td>
              <td class="num-col">{{ formatNum(r.seatCount) }}</td>
              <td class="num-col">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoySeatPct)">
                  {{ diffText(r.yoySeatPct, '%') }}
                </span>
              </td>
              <td>
                <span v-if="r.isNew" class="route-tag route-tag--new">新增</span>
                <span v-else class="route-tag route-tag--continue">持續</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
