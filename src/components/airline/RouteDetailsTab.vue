<script setup lang="ts">
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

const SORT_OPTIONS = [
  { key: 'loadFactor' as const, label: '載客率' },
  { key: 'passengerCount' as const, label: '載客人數' },
  { key: 'flightCount' as const, label: '飛行架次' },
  { key: 'seatCount' as const, label: '座位數' },
]

function diffClass(val: number | undefined) {
  if (val === undefined) return ''
  return val >= 0 ? 'yoy-diff--pos' : 'yoy-diff--neg'
}

function diffText(val: number | undefined, unit: string) {
  if (val === undefined) return '—'
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}${unit}`
}

const TAG_META: Record<string, string> = {
  '高需求': 'route-tag--full',
  '新航點': 'route-tag--new',
  '增班潛力': 'route-tag--opportunity',
  '增班': 'route-tag--increase',
  '減班': 'route-tag--decrease',
}
</script>

<template>
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
            <th v-if="store.hasPreviousYearData" class="num-col">YoY 載客率</th>
            <th v-if="store.hasPreviousYearData" class="num-col">YoY 旅客</th>
            <th class="num-col">入境人數</th>
            <th class="num-col">出境人數</th>
            <th>標籤</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.detailRows" :key="`${r.originAirportCode}-${r.destinationAirportCode}`">
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
            <td v-if="store.hasPreviousYearData" class="num-col">
              <span class="yoy-diff" :class="diffClass(r.yoyLoadFactorPp)">
                {{ diffText(r.yoyLoadFactorPp, 'pp') }}
              </span>
            </td>
            <td v-if="store.hasPreviousYearData" class="num-col">
              <span class="yoy-diff" :class="diffClass(r.yoyPassengerPct)">
                {{ diffText(r.yoyPassengerPct, '%') }}
              </span>
            </td>
            <td class="num-col">{{ r.inboundPassengerCount != null ? formatNum(r.inboundPassengerCount) : '—' }}</td>
            <td class="num-col">{{ r.outboundPassengerCount != null ? formatNum(r.outboundPassengerCount) : '—' }}</td>
            <td class="tags-cell">
              <span
                v-for="tag in r.tags"
                :key="tag"
                class="route-tag"
                :class="TAG_META[tag]"
              >{{ tag }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
