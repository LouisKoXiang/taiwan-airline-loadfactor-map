<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketOverviewStore } from '../stores/marketOverviewStore'
import { FOUR_AIRLINES, AIRLINE_META, AIRLINE_SLUG } from '../types/airline'
import MultiLineTrendChart from '../components/overview/MultiLineTrendChart.vue'
import AirlineRankingCards from '../components/overview/AirlineRankingCards.vue'
import MarketShareChart from '../components/overview/MarketShareChart.vue'
import AirportBreakdown from '../components/overview/AirportBreakdown.vue'
import RegionMarketCharts from '../components/overview/RegionMarketCharts.vue'
import NewRoutesPanel from '../components/overview/NewRoutesPanel.vue'
import CumulativeKpiCards from '../components/overview/CumulativeKpiCards.vue'
import ShareButton from '../components/ShareButton.vue'
import SiteFooter from '../components/SiteFooter.vue'
import type { ChartSeries } from '../components/overview/MultiLineTrendChart.vue'

const store = useMarketOverviewStore()
const router = useRouter()

const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (v: number) => fmt.format(Math.round(v))

function makeSeriesFor(metric: 'loadFactor' | 'passengerCount' | 'flightCount' | 'routeCount'): ChartSeries[] {
  return store.airlineSeries.map((s) => ({
    key: s.airline,
    label: s.airline,
    color: s.color,
    points: s.points.map((p) => ({ month: p.month, value: p[metric] })),
  }))
}

const lfSeries = computed(() => makeSeriesFor('loadFactor'))
const paxSeries = computed(() => makeSeriesFor('passengerCount'))
const routeSeries = computed(() => makeSeriesFor('routeCount'))
const flightSeries = computed(() => makeSeriesFor('flightCount'))
const shareUrl = 'https://taiwanairlinedata.com/'
const shareTitle = '台灣航空載客率查詢｜四大航空總覽'
const activeSectionId = ref('overview-cumulative')
const activeCapacityMetric = ref<'passengerCount' | 'flightCount'>('passengerCount')
const isSectionNavVisible = ref(true)
const isFooterVisible = ref(false)
let sectionObserver: IntersectionObserver | undefined
let footerObserver: IntersectionObserver | undefined
let preserveClickedSectionUntil = 0

const capacityMetricOptions = [
  {
    value: 'passengerCount',
    label: '載客人數',
    title: '載客人數月趨勢',
    note: '比較各航空實際承載旅客量，適合看市場規模與成長動能。',
    unit: ' 人',
  },
  {
    value: 'flightCount',
    label: '飛行架次',
    title: '飛行架次月趨勢',
    note: '追蹤供給端是否增班或縮班，搭配載客率可判斷運能配置是否有效。',
    unit: ' 次',
  },
] as const

const activeCapacityOption = computed(() =>
  capacityMetricOptions.find((option) => option.value === activeCapacityMetric.value) ?? capacityMetricOptions[0],
)
const capacitySeries = computed(() =>
  activeCapacityMetric.value === 'passengerCount' ? paxSeries.value : flightSeries.value,
)
const overviewInsight = computed(() => {
  const stats = store.airlineYearlyStats.filter((stat) => stat.passengerCount > 0)
  if (stats.length === 0) return ''

  const passengerLeader = [...stats].sort((a, b) => b.passengerCount - a.passengerCount)[0]
  const loadFactorLeader = [...stats].sort((a, b) => b.avgLoadFactor - a.avgLoadFactor)[0]
  const growthLeader = [...store.cumulativeOverviewSummary.airlines]
    .filter((airline) => airline.passengerCount.percentChange !== null)
    .sort((a, b) => (b.passengerCount.percentChange ?? -Infinity) - (a.passengerCount.percentChange ?? -Infinity))[0]

  const newRouteCounts = new Map<string, number>()
  for (const route of store.newRoutes) {
    newRouteCounts.set(route.airline, (newRouteCounts.get(route.airline) ?? 0) + 1)
  }
  const newRouteLeader = [...newRouteCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  const parts = [
    `${store.cumulativeOverviewSummary.monthRangeLabel}累積，${passengerLeader.airlineName}以 ${formatNum(passengerLeader.passengerCount)} 人居四大航空載客人數第一`,
  ]

  if (growthLeader?.passengerCount.percentChange !== null && growthLeader?.passengerCount.percentChange !== undefined) {
    parts.push(`${growthLeader.airlineName}載客人數年增 ${growthLeader.passengerCount.percentChange.toFixed(1)}% 最明顯`)
  }

  parts.push(`${loadFactorLeader.airlineName}平均載客率 ${loadFactorLeader.avgLoadFactor.toFixed(1)}% 最高`)

  if (newRouteLeader) {
    parts.push(`${newRouteLeader[0]}新增航點 ${newRouteLeader[1]} 條`)
  }

  return `${parts.join('；')}。`
})

const sectionNavItems = computed(() => [
  { id: 'overview-cumulative', label: '累積表現' },
  { id: 'overview-ranking', label: '指標排行' },
  { id: 'overview-share', label: '市佔比較' },
  { id: 'overview-region', label: '區域視角' },
  { id: 'overview-new-routes', label: '新增航點' },
  ...(store.airportBreakdown.length > 0 ? [{ id: 'overview-airports', label: '機場視角' }] : []),
  { id: 'overview-load-factor', label: '載客率' },
  { id: 'overview-capacity', label: '運能趨勢' },
  { id: 'overview-route-count', label: '航線數' },
])

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobileSectionNav() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
}

function pageScroller() {
  return document.querySelector<HTMLElement>('.page-content')
}

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId)
  if (!target) return
  activeSectionId.value = sectionId
  preserveClickedSectionUntil = Date.now() + 1400

  const scrollOffset = isMobileSectionNav() ? 72 : 84
  const scroller = pageScroller()
  if (!scroller) return

  const scrollTop = target.getBoundingClientRect().top
    - scroller.getBoundingClientRect().top
    + scroller.scrollTop
    - scrollOffset

  scroller.scrollTo({
    top: Math.max(0, scrollTop),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

async function scrollActiveNavItemIntoView() {
  await nextTick()
  const activeButton = document.querySelector<HTMLElement>(
    `.overview-section-nav-btn[data-section-id="${activeSectionId.value}"]`,
  )
  const nav = activeButton?.closest<HTMLElement>('.overview-section-nav')
  if (!activeButton || !nav) return

  const targetLeft = activeButton.offsetLeft - (nav.clientWidth - activeButton.offsetWidth) / 2
  nav.scrollTo({
    left: Math.max(0, targetLeft),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

async function setupSectionObserver() {
  sectionObserver?.disconnect()
  await nextTick()

  if (typeof IntersectionObserver === 'undefined') return
  const scroller = pageScroller()

  sectionObserver = new IntersectionObserver(
    (entries) => {
      if (Date.now() < preserveClickedSectionUntil) return
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target.id) activeSectionId.value = visible.target.id
    },
    {
      root: scroller,
      rootMargin: '-18% 0px -66% 0px',
      threshold: [0.1, 0.25, 0.5, 0.75],
    },
  )

  for (const item of sectionNavItems.value) {
    const el = document.getElementById(item.id)
    if (el) sectionObserver.observe(el)
  }
}

async function setupFooterObserver() {
  footerObserver?.disconnect()
  await nextTick()

  if (typeof IntersectionObserver === 'undefined') return
  const footer = document.getElementById('overview-footer')
  if (!footer) return

  footerObserver = new IntersectionObserver(
    ([entry]) => {
      isFooterVisible.value = Boolean(entry?.isIntersecting)
    },
    {
      root: pageScroller(),
      threshold: 0.08,
    },
  )
  footerObserver.observe(footer)
}

onMounted(() => {
  setupSectionObserver()
  setupFooterObserver()
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
  footerObserver?.disconnect()
})

watch(() => [store.activeYear, store.airportBreakdown.length], setupSectionObserver)
watch(activeSectionId, scrollActiveNavItemIntoView)
</script>

<template>
  <div class="overview-page">
    <!-- Header -->
    <header class="overview-header">
      <div>
        <h1 class="overview-title">台灣航空載客率查詢</h1>
        <p class="overview-subtitle">
          四大航空總覽：比較中華航空、長榮航空、星宇航空、台灣虎航的年度載客率、市佔率與區域航線表現
        </p>
        <p v-if="overviewInsight" class="overview-insight">{{ overviewInsight }}</p>
      </div>
      <div class="header-actions">
        <ShareButton
          :url="shareUrl"
          :title="shareTitle"
          text="查看四大航空年度載客率、市佔率與區域航線表現。"
        />
        <div class="overview-year-wrap">
          <label class="field-label" for="year-sel">資料年度</label>
          <select
            id="year-sel"
            class="month-select"
            :value="store.activeYear"
            @change="store.selectedYear = parseInt(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="y in store.availableYears" :key="y" :value="y">{{ y }} 年</option>
          </select>
        </div>
      </div>
    </header>

    <!-- Airline switcher (navigation) -->
    <section class="airline-switcher" aria-label="選擇檢視方式">
      <button type="button" class="airline-tab active" style="--tab-accent: var(--blue-500)">
        <span class="tab-code">四大航空</span>
        <span class="tab-name">總覽</span>
      </button>
      <button
        v-for="name in FOUR_AIRLINES"
        :key="name"
        type="button"
        class="airline-tab airline-tab--brand"
        :style="{ '--tab-accent': AIRLINE_META[name].accent }"
        @click="router.push('/airlines/' + AIRLINE_SLUG[name])"
      >
        <span class="tab-code">{{ AIRLINE_META[name].code }}</span>
        <span class="tab-name">{{ name }}</span>
      </button>
    </section>

    <nav
      v-show="!isFooterVisible"
      class="overview-section-nav"
      :class="{ 'is-visible': isSectionNavVisible }"
      aria-label="總覽頁區塊導覽"
    >
      <button
        v-for="item in sectionNavItems"
        :key="item.id"
        type="button"
        class="overview-section-nav-btn"
        :data-section-id="item.id"
        :class="{ active: activeSectionId === item.id }"
        @click="scrollToSection(item.id)"
      >
        {{ item.label }}
      </button>
    </nav>

    <CumulativeKpiCards id="overview-cumulative" :summary="store.cumulativeOverviewSummary" />

    <!-- A. 指標排行卡 -->
    <section id="overview-ranking" class="overview-section">
      <h2 class="overview-section-title">{{ store.activeYear }} 年度指標排行</h2>
      <AirlineRankingCards :stats="store.airlineYearlyStats" :year="store.activeYear" />
    </section>

    <!-- B. 年度市佔比較 -->
    <section id="overview-share" class="overview-section">
      <h2 class="overview-section-title">{{ store.activeYear }} 年度市佔比較</h2>
      <div class="overview-card">
        <MarketShareChart
          :stats="store.airlineYearlyStats"
          :previous-stats="store.prevFullYearAirlineStats"
          :current-label="`${store.activeYear} 年目前累積`"
          :previous-label="`${store.prevYear} 年完整年度`"
        />
      </div>
    </section>

    <!-- C. 航點 / 區域視角 -->
    <section id="overview-region" class="overview-section">
      <h2 class="overview-section-title">航點 / 區域視角</h2>
      <p class="overview-region-subtitle">
        比較四大航空在日本線、美國線與歐洲線的載客率、航班量與旅客數。
      </p>
      <RegionMarketCharts :stats="store.regionMarketStats" />
    </section>

    <!-- D. 新增航點 -->
    <section id="overview-new-routes" class="overview-section">
      <h2 class="overview-section-title">新增航點</h2>
      <NewRoutesPanel
        :routes="store.newRoutes"
        :current-year="store.activeYear"
        :previous-year="store.prevYear"
      />
    </section>

    <!-- D. 機場視角（含同期比較） -->
    <section v-if="store.airportBreakdown.length > 0" id="overview-airports" class="overview-section">
      <h2 class="overview-section-title">
        各出發機場載客人數（{{ store.activeYear }} vs {{ store.prevYear }} 年同期）
      </h2>
      <AirportBreakdown :breakdown="store.airportBreakdown" />
    </section>

    <!-- D. 載客率月趨勢 -->
    <section id="overview-load-factor" class="overview-section">
      <h2 class="overview-section-title">平均載客率月趨勢</h2>
      <p class="overview-section-note">觀察四大航空座位利用率的月度變化，快速辨識淡旺季與需求熱度。</p>
      <MultiLineTrendChart
        title="平均載客率月趨勢"
        :series="lfSeries"
        unit="%"
        :format-value="(v) => v.toFixed(1)"
      />
    </section>

    <!-- E + F. 載客人數 + 飛行架次 -->
    <section id="overview-capacity" class="overview-section">
      <div class="overview-section-head">
        <div>
          <h2 class="overview-section-title">{{ activeCapacityOption.title }}</h2>
          <p class="overview-section-note">{{ activeCapacityOption.note }}</p>
        </div>
        <div class="trend-mode-toggle" aria-label="運能趨勢指標切換">
          <button
            v-for="option in capacityMetricOptions"
            :key="option.value"
            type="button"
            class="trend-mode-btn"
            :class="{ active: activeCapacityMetric === option.value }"
            @click="activeCapacityMetric = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <MultiLineTrendChart
        :title="activeCapacityOption.title"
        :series="capacitySeries"
        :unit="activeCapacityOption.unit"
        :format-value="formatNum"
      />
    </section>

    <!-- G. 航線數趨勢 -->
    <section id="overview-route-count" class="overview-section">
      <h2 class="overview-section-title">航線數月趨勢</h2>
      <p class="overview-section-note">查看航網廣度是否擴張，適合觀察誰正在新增市場或收斂航點。</p>
      <MultiLineTrendChart
        title="航線數月趨勢（誰在擴張？）"
        :series="routeSeries"
        unit=" 條"
        :format-value="(v) => String(Math.round(v))"
      />
    </section>

    <div id="overview-footer">
      <SiteFooter />
    </div>
  </div>
</template>
