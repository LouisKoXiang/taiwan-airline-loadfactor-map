<script setup lang="ts">
import { computed } from 'vue'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import MetricBarChart from './MetricBarChart.vue'
import TrendChart from './TrendChart.vue'
import { AIRLINE_META } from '../../types/airline'

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
</script>

<template>
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
</template>
