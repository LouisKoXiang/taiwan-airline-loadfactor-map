<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import type { MonthlyAirlineRouteStat } from '../../types/airline'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))
const collapsedRows = ref(new Set<string>())

type YoYRoute = MonthlyAirlineRouteStat & {
  yoyLoadFactorPp?: number
  yoyPassengerPct?: number
  yoyFlightPct?: number
  yoySeatPct?: number
  isNew: boolean
}

function rowKey(r: Pick<MonthlyAirlineRouteStat, 'originAirportCode' | 'destinationAirportCode'>) {
  return `${r.originAirportCode}-${r.destinationAirportCode}`
}

const allRowsCollapsed = computed(() =>
  store.routesWithYoY.length > 0 &&
  store.routesWithYoY.every((r) => collapsedRows.value.has(rowKey(r))),
)

function isRowCollapsed(r: Pick<MonthlyAirlineRouteStat, 'originAirportCode' | 'destinationAirportCode'>) {
  return collapsedRows.value.has(rowKey(r))
}

function toggleRow(r: Pick<MonthlyAirlineRouteStat, 'originAirportCode' | 'destinationAirportCode'>) {
  const next = new Set(collapsedRows.value)
  const key = rowKey(r)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedRows.value = next
}

function toggleAllRows() {
  collapsedRows.value = allRowsCollapsed.value
    ? new Set()
    : new Set(store.routesWithYoY.map((r) => rowKey(r)))
}

function rowSummary(r: YoYRoute) {
  const status = r.isNew ? '新增' : diffText(r.yoyLoadFactorPp, 'pp')
  return `${r.destinationCityName}・${r.loadFactor.toFixed(1)}%・${status}`
}

watch(
  () => store.routesWithYoY.map((r) => rowKey(r)).join('|'),
  () => {
    collapsedRows.value = new Set(store.routesWithYoY.map((r) => rowKey(r)))
  },
  { immediate: true },
)

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
      <div class="table-mobile-toolbar">
        <button type="button" class="mobile-collapse-all-btn" @click="toggleAllRows">
          {{ allRowsCollapsed ? '全部展開' : '全部收合' }}
        </button>
      </div>
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
            <tr
              v-for="r in store.routesWithYoY"
              :key="`${r.originAirportCode}-${r.destinationAirportCode}`"
              :class="{ 'mobile-collapsed': isRowCollapsed(r) }"
            >
              <td class="mobile-card-toggle">
                <button type="button" @click="toggleRow(r)">
                  <span class="mobile-card-route">
                    <strong>{{ r.originAirportCode }} → {{ r.destinationAirportCode }}</strong>
                    <small>{{ rowSummary(r) }}</small>
                  </span>
                  <span class="mobile-card-state">{{ isRowCollapsed(r) ? '展開' : '收合' }}</span>
                </button>
              </td>
              <td class="code-cell" data-label="出發">
                <RouterLink class="route-drill-link" :to="`/routes/${r.originAirportCode}-${r.destinationAirportCode}`">
                  {{ r.originAirportCode }}
                </RouterLink>
              </td>
              <td class="code-cell" data-label="目的地">
                <RouterLink class="route-drill-link" :to="`/routes/${r.originAirportCode}-${r.destinationAirportCode}`">
                  {{ r.destinationAirportCode }}
                </RouterLink>
              </td>
              <td data-label="城市">{{ r.destinationCityName }}</td>
              <td class="num-col" data-label="本月載客率">
                <span class="lf-badge" :class="r.loadFactor >= 90 ? 'lf-high' : r.loadFactor >= 80 ? 'lf-mid' : 'lf-low'">
                  {{ r.loadFactor.toFixed(1) }}%
                </span>
              </td>
              <td class="num-col" data-label="載客率 vs 去年">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyLoadFactorPp)">
                  {{ diffText(r.yoyLoadFactorPp, 'pp') }}
                </span>
                <span v-else class="route-tag route-tag--new">新增</span>
              </td>
              <td class="num-col" data-label="本月載客人數">{{ formatNum(r.passengerCount) }}</td>
              <td class="num-col" data-label="旅客 vs 去年">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyPassengerPct)">
                  {{ diffText(r.yoyPassengerPct, '%') }}
                </span>
              </td>
              <td class="num-col" data-label="本月架次">{{ formatNum(r.flightCount) }}</td>
              <td class="num-col" data-label="架次 vs 去年">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoyFlightPct)">
                  {{ diffText(r.yoyFlightPct, '%') }}
                </span>
              </td>
              <td class="num-col" data-label="本月座位">{{ formatNum(r.seatCount) }}</td>
              <td class="num-col" data-label="座位 vs 去年">
                <span v-if="!r.isNew" class="yoy-diff" :class="diffClass(r.yoySeatPct)">
                  {{ diffText(r.yoySeatPct, '%') }}
                </span>
              </td>
              <td data-label="狀態">
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
