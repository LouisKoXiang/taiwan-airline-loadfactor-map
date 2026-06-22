<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAirlineGrowthStore } from '../stores/airlineGrowthStore'
import AnalysisTabs from '../components/airline/AnalysisTabs.vue'
import OverviewTab from '../components/airline/OverviewTab.vue'
import YoYComparisonTab from '../components/airline/YoYComparisonTab.vue'
import RouteChangesTab from '../components/airline/RouteChangesTab.vue'
import OpportunityRoutesTab from '../components/airline/OpportunityRoutesTab.vue'
import RouteDetailsTab from '../components/airline/RouteDetailsTab.vue'
import { AIRLINE_META, FOUR_AIRLINES } from '../types/airline'
import type { AirlineName } from '../types/airline'

const store = useAirlineGrowthStore()
const route = useRoute()
const router = useRouter()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))
const accent = computed(() => AIRLINE_META[store.selectedAirline].accent)

const airlinePaths: Record<AirlineName, string> = {
  中華航空: '/airlines/china-airlines',
  長榮航空: '/airlines/eva-air',
  星宇航空: '/airlines/starlux',
  台灣虎航: '/airlines/tigerair-taiwan',
}

watch(
  () => route.meta.airlineName,
  (airlineName) => {
    if (typeof airlineName === 'string' && FOUR_AIRLINES.includes(airlineName as AirlineName)) {
      store.selectedAirline = airlineName as AirlineName
    }
  },
  { immediate: true },
)

function selectAirline(name: AirlineName) {
  if (String(route.name).startsWith('airline-') && route.name !== 'airline-growth') {
    router.push(airlinePaths[name])
    return
  }
  store.selectedAirline = name
}

// KPI 同期差異輔助（型別安全）
const yoyLf = computed(() => {
  const pp = store.yoySummary.loadFactorPp
  if (!store.hasPreviousYearData || pp === undefined) return null
  return { text: `${pp >= 0 ? '↑' : '↓'}${Math.abs(pp).toFixed(1)}pp vs 去年`, pos: pp >= 0 }
})
const yoyPax = computed(() => {
  const pct = store.yoySummary.passengerPct
  if (!store.hasPreviousYearData || pct === undefined) return null
  return { text: `${pct >= 0 ? '↑' : '↓'}${Math.abs(pct).toFixed(1)}% vs 去年`, pos: pct >= 0 }
})
const yoyFlight = computed(() => {
  const pct = store.yoySummary.flightPct
  if (!store.hasPreviousYearData || pct === undefined) return null
  return { text: `${pct >= 0 ? '↑' : '↓'}${Math.abs(pct).toFixed(1)}% vs 去年`, pos: pct >= 0 }
})
</script>

<template>
  <div class="growth-page">
    <!-- ── 頁面標題 ─────────────────────────────────────────────── -->
    <header class="growth-header">
      <div class="growth-header-text">
        <h1>台灣航空載客率分析</h1>
        <p>切換中華航空、長榮航空、星宇航空、台灣虎航，觀察台灣航空載客率、載客人數、飛行架次與航點表現。</p>
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
        @click="selectAirline(name as AirlineName)"
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
        <span v-if="yoyFlight" class="kpi-yoy" :class="yoyFlight.pos ? 'kpi-yoy--pos' : 'kpi-yoy--neg'">
          {{ yoyFlight.text }}
        </span>
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
        <span v-if="yoyPax" class="kpi-yoy" :class="yoyPax.pos ? 'kpi-yoy--pos' : 'kpi-yoy--neg'">
          {{ yoyPax.text }}
        </span>
      </div>
      <div class="kpi-card kpi-card--accent" :style="{ '--accent': accent }">
        <span class="kpi-label">平均載客率</span>
        <strong class="kpi-value kpi-value--accent">{{ store.summary.avgLoadFactor.toFixed(1) }}%</strong>
        <span v-if="yoyLf" class="kpi-yoy" :class="yoyLf.pos ? 'kpi-yoy--pos' : 'kpi-yoy--neg'">
          {{ yoyLf.text }}
        </span>
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

    <!-- ── 分析 Tab 列 ───────────────────────────────────────────── -->
    <AnalysisTabs />

    <!-- ── Tab 內容 ──────────────────────────────────────────────── -->
    <div class="tab-panel">
      <OverviewTab v-if="store.activeTab === 'overview'" />
      <YoYComparisonTab v-else-if="store.activeTab === 'yoy'" />
      <RouteChangesTab v-else-if="store.activeTab === 'changes'" />
      <OpportunityRoutesTab v-else-if="store.activeTab === 'opportunities'" />
      <RouteDetailsTab v-else-if="store.activeTab === 'details'" />
    </div>

    <!-- ── 關於本頁（內容 SEO） ──────────────────────────────────────── -->
    <section class="seo-blurb" aria-label="關於本頁">
      <h2>關於台灣航空載客率分析</h2>
      <p>
        本頁提供台灣航空載客率查詢與比較，使用中華民國交通部民用航空局公開資料，整理<strong>中華航空</strong>、<strong>長榮航空</strong>、<strong>星宇航空</strong>與<strong>台灣虎航</strong>的每月航線表現。
        資料涵蓋載客率（Load Factor）、載客人數、飛行架次、座位數與入出境旅客分布，供讀者觀察各航空公司自身的月度營運變化。
      </p>
      <p>
        切換左上角的航空公司按鈕與月份選擇器，可逐一檢視各公司的航點表現；趨勢圖顯示所選航空公司的月均載客率變化；同期比較 Tab 可對照去年同月表現。
      </p>
      <p>
        本工具可用於查詢台灣航空載客率，也適合追蹤華航載客率、長榮載客率、星宇載客率與虎航載客率，並比較各航空公司在不同月份、航點與航線上的載客率變化。
      </p>
      <p>
        資料來源為交通部民用航空局公開統計頁面「國際及兩岸定期航線班機載客率－按航線及航空公司分」。
        本站為非官方二次整理與視覺化工具，資料可能因原始檔更新、解析規則、航點代碼映射或四捨五入而產生差異；正式數據請以民航局原始公告為準。本頁內容僅供研究與資料探索，不構成投資、營運或交易建議。
      </p>
    </section>
  </div>
</template>
