<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import MetricBarChart from './MetricBarChart.vue'
import TrendChart from './TrendChart.vue'
import RouteTimelineMatrix from './RouteTimelineMatrix.vue'
import { AIRLINE_META } from '../../types/airline'
import type { SortKey } from '../../types/airline'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))
const accent = computed(() => AIRLINE_META[store.selectedAirline].accent)

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

async function openDetails(key: SortKey) {
  store.openDetailsWithSort(key)
  await nextTick()
  document.querySelector('.route-table-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
</script>

<template>
  <section class="charts-section">
    <!-- 第一區：月趨勢圖 + 載客率排行 -->
    <div class="charts-row">
      <div class="trend-card-stack">
        <TrendChart
          title="整體載客率月趨勢"
          :trend-points="store.trendData"
          :current-month="store.activeMonth"
          :accent-color="accent"
          compact
        />
        <TrendChart
          title="日本航線載客率月趨勢"
          :trend-points="store.japanTrendData"
          :current-month="store.activeMonth"
          :accent-color="accent"
          compact
        />
        <TrendChart
          title="高雄＋台中載客率月趨勢"
          :trend-points="store.regionalAirportTrendData"
          :current-month="store.activeMonth"
          :accent-color="accent"
          compact
        />
      </div>
      <MetricBarChart
        :items="lfChartItems"
        title="航點載客率排行"
        unit="%"
        :format-value="(v) => v.toFixed(1)"
        :accent-color="accent"
        action-label="看明細"
        @action="openDetails('loadFactor')"
      />
    </div>

    <!-- 第二區：航點月份矩陣（滿版） -->
    <RouteTimelineMatrix />

    <!-- 第三區：載客人數 + 飛行架次排行 -->
    <div class="charts-row">
      <MetricBarChart
        :items="paxChartItems"
        title="各航點載客人數"
        :format-value="formatNum"
        :accent-color="accent"
        action-label="看明細"
        @action="openDetails('passengerCount')"
      />
      <MetricBarChart
        :items="flightChartItems"
        title="各航點飛行架次"
        unit=" 次"
        :format-value="(v) => formatNum(v)"
        :accent-color="accent"
        action-label="看明細"
        @action="openDetails('flightCount')"
      />
    </div>
  </section>
</template>
