<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketOverviewStore } from '../stores/marketOverviewStore'
import { FOUR_AIRLINES, AIRLINE_META, AIRLINE_SLUG } from '../types/airline'
import MultiLineTrendChart from '../components/overview/MultiLineTrendChart.vue'
import AirlineRankingCards from '../components/overview/AirlineRankingCards.vue'
import MarketShareChart from '../components/overview/MarketShareChart.vue'
import AirportBreakdown from '../components/overview/AirportBreakdown.vue'
import RegionMarketCharts from '../components/overview/RegionMarketCharts.vue'
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

    <CumulativeKpiCards :summary="store.cumulativeOverviewSummary" />

    <!-- A. 指標排行卡 -->
    <section class="overview-section">
      <h2 class="overview-section-title">{{ store.activeYear }} 年度指標排行</h2>
      <AirlineRankingCards :stats="store.airlineYearlyStats" :year="store.activeYear" />
    </section>

    <!-- B. 年度市佔比較 -->
    <section class="overview-section">
      <h2 class="overview-section-title">{{ store.activeYear }} 年度市佔比較</h2>
      <div class="overview-card">
        <MarketShareChart :stats="store.airlineYearlyStats" />
      </div>
    </section>

    <!-- C. 航點 / 區域視角 -->
    <section class="overview-section">
      <h2 class="overview-section-title">航點 / 區域視角</h2>
      <p class="overview-region-subtitle">
        比較四大航空在日本線、美國線與歐洲線的載客率、航班量與旅客數。
      </p>
      <RegionMarketCharts :stats="store.regionMarketStats" />
    </section>

    <!-- D. 機場視角（含同期比較） -->
    <section v-if="store.airportBreakdown.length > 0" class="overview-section">
      <h2 class="overview-section-title">
        各出發機場載客人數（{{ store.activeYear }} vs {{ store.prevYear }} 年同期）
      </h2>
      <AirportBreakdown :breakdown="store.airportBreakdown" />
    </section>

    <!-- D. 載客率月趨勢 -->
    <section class="overview-section">
      <MultiLineTrendChart
        title="平均載客率月趨勢"
        :series="lfSeries"
        unit="%"
        :format-value="(v) => v.toFixed(1)"
      />
    </section>

    <!-- E + F. 載客人數 + 飛行架次 -->
    <div class="charts-row">
      <MultiLineTrendChart
        title="載客人數月趨勢"
        :series="paxSeries"
        unit=" 人"
        :format-value="formatNum"
      />
      <MultiLineTrendChart
        title="飛行架次月趨勢"
        :series="flightSeries"
        unit=" 次"
        :format-value="formatNum"
      />
    </div>

    <!-- G. 航線數趨勢 -->
    <section class="overview-section">
      <MultiLineTrendChart
        title="航線數月趨勢（誰在擴張？）"
        :series="routeSeries"
        unit=" 條"
        :format-value="(v) => String(Math.round(v))"
      />
    </section>

    <SiteFooter />
  </div>
</template>
