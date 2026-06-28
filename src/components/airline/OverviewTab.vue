<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import MetricBarChart from './MetricBarChart.vue'
import TrendChart from './TrendChart.vue'
import RouteTimelineMatrix from './RouteTimelineMatrix.vue'
import { AIRLINE_META } from '../../types/airline'
import type { SortKey } from '../../types/airline'

const store = useAirlineGrowthStore()
const router = useRouter()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))
const accent = computed(() => AIRLINE_META[store.selectedAirline].accent)

function navigateToRoute(routeCode: string) {
  router.push(`/routes/${routeCode}`)
}
type AirportTrendMetric = 'loadFactor' | 'passengerCount'
const khhTrendMetric = ref<AirportTrendMetric>('passengerCount')
const rmqTrendMetric = ref<AirportTrendMetric>('passengerCount')
const trendModeOptions = [
  { value: 'passengerCount', label: '人數' },
  { value: 'loadFactor', label: '載客率' },
]

const khhTrendPoints = computed(() =>
  khhTrendMetric.value === 'passengerCount'
    ? store.kaohsiungPassengerTrendData
    : store.kaohsiungLoadFactorTrendData,
)
const rmqTrendPoints = computed(() =>
  rmqTrendMetric.value === 'passengerCount'
    ? store.taichungPassengerTrendData
    : store.taichungLoadFactorTrendData,
)
const khhTrendTitle = computed(() =>
  khhTrendMetric.value === 'passengerCount' ? '高雄載客人數月趨勢' : '高雄載客率月趨勢',
)
const rmqTrendTitle = computed(() =>
  rmqTrendMetric.value === 'passengerCount' ? '台中載客人數月趨勢' : '台中載客率月趨勢',
)
const khhTrendUnit = computed(() => khhTrendMetric.value === 'passengerCount' ? ' 人' : '%')
const rmqTrendUnit = computed(() => rmqTrendMetric.value === 'passengerCount' ? ' 人' : '%')
const khhTrendFormatter = computed(() =>
  khhTrendMetric.value === 'passengerCount' ? formatNum : (v: number) => v.toFixed(1),
)
const rmqTrendFormatter = computed(() =>
  rmqTrendMetric.value === 'passengerCount' ? formatNum : (v: number) => v.toFixed(1),
)

const lfChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.loadFactor - a.loadFactor)
    .map((r) => ({
      id: `${r.originAirportCode}-${r.destinationAirportCode}`,
      label: r.destinationCityName,
      subLabel: r.originAirportCode,
      value: r.loadFactor,
    })),
)

const paxChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.passengerCount - a.passengerCount)
    .map((r) => ({
      id: `${r.originAirportCode}-${r.destinationAirportCode}`,
      label: r.destinationCityName,
      subLabel: r.originAirportCode,
      value: r.passengerCount,
    })),
)

const flightChartItems = computed(() =>
  [...store.airlineRecords]
    .sort((a, b) => b.flightCount - a.flightCount)
    .map((r) => ({
      id: `${r.originAirportCode}-${r.destinationAirportCode}`,
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
        <div class="trend-primary-stack">
          <TrendChart
            title="整體載客率月趨勢"
            :trend-points="store.trendData"
            :current-month="store.activeMonth"
            :accent-color="accent"
          />
          <TrendChart
            title="日本航線載客率月趨勢"
            :trend-points="store.japanTrendData"
            :current-month="store.activeMonth"
            :accent-color="accent"
          />
        </div>
        <TrendChart
          :title="khhTrendTitle"
          :trend-points="khhTrendPoints"
          :current-month="store.activeMonth"
          :accent-color="accent"
          :value-unit="khhTrendUnit"
          :format-value="khhTrendFormatter"
          :mode-options="trendModeOptions"
          :active-mode="khhTrendMetric"
          empty-text="目前無高雄出發資料"
          empty-note="此航空公司在目前資料期間沒有 KHH 出發航線。"
          @select-mode="(value) => { khhTrendMetric = value as AirportTrendMetric }"
          compact
        />
      </div>
      <div class="trend-card-stack">
        <MetricBarChart
          :items="lfChartItems"
          title="航點載客率排行"
          unit="%"
          :format-value="(v) => v.toFixed(1)"
          :accent-color="accent"
          :max-items="15"
          action-label="看明細"
          @action="openDetails('loadFactor')"
          @select-item="navigateToRoute"
        />
        <TrendChart
          :title="rmqTrendTitle"
          :trend-points="rmqTrendPoints"
          :current-month="store.activeMonth"
          :accent-color="accent"
          :value-unit="rmqTrendUnit"
          :format-value="rmqTrendFormatter"
          :mode-options="trendModeOptions"
          :active-mode="rmqTrendMetric"
          empty-text="目前無台中出發資料"
          empty-note="此航空公司在目前資料期間沒有 RMQ 出發航線。"
          @select-mode="(value) => { rmqTrendMetric = value as AirportTrendMetric }"
          compact
        />
      </div>
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
        @select-item="navigateToRoute"
      />
      <MetricBarChart
        :items="flightChartItems"
        title="各航點飛行架次"
        unit=" 次"
        :format-value="(v) => formatNum(v)"
        :accent-color="accent"
        action-label="看明細"
        @action="openDetails('flightCount')"
        @select-item="navigateToRoute"
      />
    </div>
  </section>
</template>
