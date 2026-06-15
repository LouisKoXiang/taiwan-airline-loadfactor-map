<script setup lang="ts">
import { computed } from 'vue'
import { useAirlineGrowthStore } from '../stores/airlineGrowthStore'
import MetricBarChart from '../components/airline/MetricBarChart.vue'
import TrendChart from '../components/airline/TrendChart.vue'
import { AIRLINE_META, FOUR_AIRLINES } from '../types/airline'
import type { AirlineName } from '../types/airline'

const store = useAirlineGrowthStore()

const fmt = new Intl.NumberFormat('zh-TW')

function formatNum(n: number) {
  return fmt.format(Math.round(n))
}

const accent = computed(() => AIRLINE_META[store.selectedAirline].accent)

// 圖表資料：id 必須唯一，讓 D3 band scale 能替每列配置獨立位置。
// 同一城市可能從不同出發機場起飛，例如福岡-TPE、福岡-KHH。
const lfChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.loadFactor - a.loadFactor)
    .map((r) => ({
      id: `${r.destinationCityName}-${r.originAirportCode}`,
      label: r.destinationCityName,
      subLabel: r.originAirportCode,
      value: r.loadFactor,
    })),
)

const paxChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.passengerCount - a.passengerCount)
    .map((r) => ({
      id: `${r.destinationCityName}-${r.originAirportCode}`,
      label: r.destinationCityName,
      subLabel: r.originAirportCode,
      value: r.passengerCount,
    })),
)

const flightChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.flightCount - a.flightCount)
    .map((r) => ({
      id: `${r.destinationCityName}-${r.originAirportCode}`,
      label: r.destinationCityName,
      subLabel: r.originAirportCode,
      value: r.flightCount,
    })),
)

// 排序選項
const SORT_OPTIONS = [
  { key: 'loadFactor' as const, label: '載客率' },
  { key: 'passengerCount' as const, label: '載客人數' },
  { key: 'flightCount' as const, label: '飛行架次' },
  { key: 'seatCount' as const, label: '座位數' },
]
</script>

<template>
  <div class="growth-page">
    <!-- ── 頁面標題 ─────────────────────────────────────────────── -->
    <header class="growth-header">
      <div class="growth-header-text">
        <h1>航運四雄載客率成長率分析</h1>
        <p>切換中華航空、長榮航空、星宇航空、台灣虎航，觀察單一航空公司自己的載客率、載客人數、飛行架次與航點表現。</p>
      </div>
      <!-- 月份選擇器 -->
      <div class="month-select-wrap">
        <label class="field-label" for="month-sel">資料月份</label>
        <select id="month-sel" v-model="store.selectedMonth" class="month-select">
          <option v-for="m in store.availableMonths" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </header>

    <!-- ── 航空公司切換器 ────────────────────────────────────────── -->
    <section class="airline-switcher" aria-label="選擇航空公司">
      <button
        v-for="name in FOUR_AIRLINES"
        :key="name"
        type="button"
        class="airline-tab"
        :class="{ active: store.selectedAirline === (name as AirlineName) }"
        :style="store.selectedAirline === (name as AirlineName) ? { '--tab-accent': AIRLINE_META[name as AirlineName].accent } : {}"
        @click="store.selectedAirline = (name as AirlineName)"
      >
        <span class="tab-code">{{ AIRLINE_META[name as AirlineName].code }}</span>
        <span class="tab-name">{{ name }}</span>
      </button>
    </section>

    <!-- ── KPI 卡片 ───────────────────────────────────────────────── -->
    <section class="kpi-grid" aria-label="KPI 指標">
      <div class="kpi-card">
        <span class="kpi-label">航線數</span>
        <strong class="kpi-value">{{ store.summary.routeCount }}</strong>
        <span class="kpi-unit">條</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">飛行架次</span>
        <strong class="kpi-value">{{ formatNum(store.summary.flightCount) }}</strong>
        <span class="kpi-unit">次</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">座位數</span>
        <strong class="kpi-value">{{ formatNum(store.summary.seatCount) }}</strong>
        <span class="kpi-unit">位</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">載客人數</span>
        <strong class="kpi-value">{{ formatNum(store.summary.passengerCount) }}</strong>
        <span class="kpi-unit">人</span>
      </div>
      <div class="kpi-card kpi-card--accent" :style="{ '--accent': accent }">
        <span class="kpi-label">平均載客率</span>
        <strong class="kpi-value kpi-value--accent">{{ store.summary.avgLoadFactor.toFixed(1) }}%</strong>
      </div>
      <div
        class="kpi-card"
        :class="store.momGrowth !== undefined ? 'kpi-card--growth' : 'kpi-card--muted'"
      >
        <span class="kpi-label">月增長（MoM）</span>
        <template v-if="store.momGrowth !== undefined">
          <strong
            class="kpi-value"
            :class="store.momGrowth >= 0 ? 'kpi-value--pos' : 'kpi-value--neg'"
          >
            {{ store.momGrowth >= 0 ? '+' : '' }}{{ store.momGrowth.toFixed(1) }}pp
          </strong>
          <span class="kpi-unit">vs 上月</span>
        </template>
        <template v-else>
          <strong class="kpi-value kpi-value--na">—</strong>
          <span class="kpi-unit kpi-note">需要前期資料</span>
        </template>
      </div>
    </section>

    <!-- ── 圖表區塊 ─────────────────────────────────────────── -->
    <section class="charts-section">
      <div class="charts-row">
        <MetricBarChart
          :items="lfChartItems"
          title="各航點載客率"
          unit="%"
          :format-value="(v) => v.toFixed(1)"
          :accent-color="accent"
        />
        <MetricBarChart
          :items="paxChartItems"
          title="各航點載客人數"
          :format-value="formatNum"
          :accent-color="accent"
        />
      </div>
      <div class="charts-row">
        <MetricBarChart
          :items="flightChartItems"
          title="各航點飛行架次"
          unit=" 次"
          :format-value="(v) => formatNum(v)"
          :accent-color="accent"
        />
        <TrendChart
          :trend-points="store.trendData"
          :current-month="store.activeMonth"
          :accent-color="accent"
        />
      </div>
    </section>

    <!-- ── 航點明細表 ─────────────────────────────────────────────── -->
    <section class="route-table-section">
      <div class="table-header">
        <h2>{{ store.selectedAirline }} 航點明細</h2>
        <div class="sort-controls">
          <span class="field-label">排序</span>
          <button
            v-for="opt in SORT_OPTIONS"
            :key="opt.key"
            type="button"
            class="sort-btn"
            :class="{
              active: store.sortKey === opt.key,
              asc: store.sortKey === opt.key && store.sortDir === 'asc',
            }"
            @click="store.setSort(opt.key)"
          >
            {{ opt.label }}
            <span v-if="store.sortKey === opt.key" class="sort-arrow">
              {{ store.sortDir === 'desc' ? '↓' : '↑' }}
            </span>
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="route-data-table">
          <thead>
            <tr>
              <th>出發</th>
              <th>目的地</th>
              <th>城市</th>
              <th>國家</th>
              <th
                v-for="opt in SORT_OPTIONS"
                :key="opt.key"
                class="num-col"
                :class="{ sorted: store.sortKey === opt.key }"
                @click="store.setSort(opt.key)"
              >
                {{ opt.label }}
                <span v-if="store.sortKey === opt.key">{{ store.sortDir === 'desc' ? '↓' : '↑' }}</span>
              </th>
              <th class="num-col">入境人數</th>
              <th class="num-col">出境人數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in store.sortedRoutes" :key="`${r.originAirportCode}-${r.destinationAirportCode}`">
              <td class="code-cell">{{ r.originAirportCode }}</td>
              <td class="code-cell">{{ r.destinationAirportCode }}</td>
              <td>{{ r.destinationCityName }}</td>
              <td class="country-cell">{{ r.destinationCountry }}</td>
              <td class="num-col" :class="{ sorted: store.sortKey === 'loadFactor' }">
                <span
                  class="lf-badge"
                  :class="r.loadFactor >= 90 ? 'lf-high' : r.loadFactor >= 80 ? 'lf-mid' : 'lf-low'"
                >
                  {{ r.loadFactor.toFixed(1) }}%
                </span>
              </td>
              <td class="num-col" :class="{ sorted: store.sortKey === 'passengerCount' }">{{ formatNum(r.passengerCount) }}</td>
              <td class="num-col" :class="{ sorted: store.sortKey === 'flightCount' }">{{ formatNum(r.flightCount) }}</td>
              <td class="num-col" :class="{ sorted: store.sortKey === 'seatCount' }">{{ formatNum(r.seatCount) }}</td>
              <td class="num-col">{{ r.inboundPassengerCount != null ? formatNum(r.inboundPassengerCount) : '—' }}</td>
              <td class="num-col">{{ r.outboundPassengerCount != null ? formatNum(r.outboundPassengerCount) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <!-- ── 關於本頁（內容 SEO） ──────────────────────────────────────── -->
    <section class="seo-blurb" aria-label="關於本頁">
      <h2>關於台灣航運四雄載客率分析</h2>
      <p>
        本頁使用中華民國交通部民用航空局公開資料，整理<strong>中華航空</strong>、<strong>長榮航空</strong>、<strong>星宇航空</strong>與<strong>台灣虎航</strong>的每月航線表現。
        資料涵蓋載客率（Load Factor）、載客人數、飛行架次、座位數與入出境旅客分布，供讀者觀察各航空公司自身的月度營運變化。
      </p>
      <p>
        切換左上角的航空公司按鈕與月份選擇器，可逐一檢視各公司的航點表現；趨勢圖顯示所選航空公司的月均載客率變化；航點明細表可依任意欄位排序。
      </p>
    </section>
  </div>
</template>
