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
import AnimatedNumber from '../components/overview/AnimatedNumber.vue'
import ShareButton from '../components/ShareButton.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { AIRLINE_META, FOUR_AIRLINES } from '../types/airline'
import type { AirlineName } from '../types/airline'
import { trackAirlineSelect, trackMonthSelect } from '../utils/analytics'
import { formatMonthForDisplay, monthToSlug, slugToMonth } from '../utils/month'

const store = useAirlineGrowthStore()
const route = useRoute()
const router = useRouter()
const accent = computed(() => AIRLINE_META[store.selectedAirline].accent)
const displayMonth = computed(() => formatMonthForDisplay(store.activeMonth))
const isMonthlyAirlinePage = computed(() => route.name === 'airline-month')
const pageTitle = computed(() =>
  isMonthlyAirlinePage.value
    ? `${displayMonth.value}${store.selectedAirline}載客率分析`
    : `${store.selectedAirline}載客率分析`,
)
const pageDescription = computed(() =>
  `台灣航空載客率資料庫｜${displayMonth.value}${store.selectedAirline}航線、航點、載客人數與載客率表現。`,
)
const sourceDescription = '主要資料：國際及兩岸定期航線班機載客率－按航線別分。'
const siteBase = 'https://taiwanairlinedata.com'

const airlinePaths: Record<AirlineName, string> = {
  中華航空: '/airlines/china-airlines',
  長榮航空: '/airlines/eva-air',
  星宇航空: '/airlines/starlux',
  台灣虎航: '/airlines/tigerair-taiwan',
}

const airlineSlugToName: Record<string, AirlineName> = {
  'china-airlines': '中華航空',
  'eva-air': '長榮航空',
  starlux: '星宇航空',
  'tigerair-taiwan': '台灣虎航',
}

function latestMonth() {
  return store.availableMonths.at(-1) ?? ''
}

function airlineMonthPath(name: AirlineName, month: string) {
  const slug = monthToSlug(month)
  return slug ? `${airlinePaths[name]}/${slug}` : airlinePaths[name]
}

const shareUrl = computed(() => `${siteBase}${airlineMonthPath(store.selectedAirline, store.activeMonth)}`)
const shareTitle = computed(() => `${displayMonth.value}${store.selectedAirline}載客率分析`)

function routeAirlineName(): AirlineName | undefined {
  if (typeof route.meta.airlineName === 'string' && FOUR_AIRLINES.includes(route.meta.airlineName as AirlineName)) {
    return route.meta.airlineName as AirlineName
  }

  const slug = Array.isArray(route.params.airlineSlug)
    ? route.params.airlineSlug[0]
    : route.params.airlineSlug
  return slug ? airlineSlugToName[slug] : undefined
}

watch(
  () => [route.name, route.meta.airlineName, route.params.airlineSlug, route.params.monthSlug] as const,
  () => {
    const airlineName = routeAirlineName()
    if (airlineName) {
      store.selectedAirline = airlineName
    } else if (route.name === 'airline-month') {
      router.replace('/')
      return
    }

    if (route.name === 'airline-month') {
      const month = slugToMonth(route.params.monthSlug)
      if (!month || !store.availableMonths.includes(month)) {
        router.replace(airlineName ? airlinePaths[airlineName] : '/')
        return
      }
      store.selectedMonth = month
      return
    }

    if (airlineName) {
      const latest = latestMonth()
      if (latest) store.selectedMonth = latest
    }
  },
  { immediate: true },
)

function selectAirline(name: AirlineName) {
  trackAirlineSelect(name, store.activeMonth, route.fullPath)
  router.push(isMonthlyAirlinePage.value
    ? airlineMonthPath(name, store.activeMonth)
    : airlinePaths[name])
}

function handleMonthChange() {
  trackMonthSelect(store.activeMonth, store.selectedAirline, route.fullPath)
  if (route.name === 'airline-month' || routeAirlineName()) {
    router.push(airlineMonthPath(store.selectedAirline, store.activeMonth))
  }
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
        <h1>{{ pageTitle }}</h1>
        <p>
          <span>{{ pageDescription }}</span>
          <span class="header-source-note">{{ sourceDescription }}</span>
        </p>
      </div>
      <!-- 月份選擇器 -->
      <div class="header-actions">
        <ShareButton
          :url="shareUrl"
          :title="shareTitle"
          :accent="accent"
          :text="pageDescription"
        />
        <div class="month-select-wrap">
          <label class="field-label" for="month-sel">資料月份</label>
          <select id="month-sel" v-model="store.selectedMonth" class="month-select" @change="handleMonthChange">
            <option v-for="m in store.availableMonths" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- ── 航空公司切換器 ────────────────────────────────────────── -->
    <section class="airline-switcher" aria-label="選擇航空公司">
      <!-- 四大航空總覽入口 -->
      <button type="button" class="airline-tab" @click="router.push('/')">
        <span class="tab-code">四大航空</span>
        <span class="tab-name">總覽</span>
      </button>
      <button
        v-for="name in FOUR_AIRLINES"
        :key="name"
        type="button"
        class="airline-tab airline-tab--brand"
        :class="{ active: store.selectedAirline === (name as AirlineName) }"
        :style="{ '--tab-accent': AIRLINE_META[name as AirlineName].accent }"
        @click="selectAirline(name as AirlineName)"
      >
        <span class="tab-code">{{ AIRLINE_META[name as AirlineName].code }}</span>
        <span class="tab-name">{{ name }}</span>
      </button>
    </section>

    <!-- ── KPI 卡片 ───────────────────────────────────────────────── -->
    <section :key="`${store.selectedAirline}-${store.activeMonth}`" class="kpi-grid" aria-label="KPI 指標">
      <div class="kpi-card">
        <span class="kpi-label">航線數</span>
        <strong class="kpi-value">
          <AnimatedNumber :value="store.summary.routeCount" />
        </strong>
        <span class="kpi-unit">條</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">飛行架次</span>
        <strong class="kpi-value">
          <AnimatedNumber :value="store.summary.flightCount" />
        </strong>
        <span class="kpi-unit">次</span>
        <span v-if="yoyFlight" class="kpi-yoy" :class="yoyFlight.pos ? 'kpi-yoy--pos' : 'kpi-yoy--neg'">
          {{ yoyFlight.text }}
        </span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">座位數</span>
        <strong class="kpi-value">
          <AnimatedNumber :value="store.summary.seatCount" />
        </strong>
        <span class="kpi-unit">位</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">載客人數</span>
        <strong class="kpi-value">
          <AnimatedNumber :value="store.summary.passengerCount" />
        </strong>
        <span class="kpi-unit">人</span>
        <span v-if="yoyPax" class="kpi-yoy" :class="yoyPax.pos ? 'kpi-yoy--pos' : 'kpi-yoy--neg'">
          {{ yoyPax.text }}
        </span>
      </div>
      <div class="kpi-card kpi-card--accent" :style="{ '--accent': accent }">
        <span class="kpi-label">平均載客率</span>
        <strong class="kpi-value kpi-value--accent">
          <AnimatedNumber :value="store.summary.avgLoadFactor" :decimals="1" suffix="%" />
        </strong>
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
            <AnimatedNumber
              :value="store.momGrowth"
              :decimals="1"
              :prefix="store.momGrowth >= 0 ? '+' : ''"
              suffix="pp"
            />
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

    <SiteFooter />
  </div>
</template>
