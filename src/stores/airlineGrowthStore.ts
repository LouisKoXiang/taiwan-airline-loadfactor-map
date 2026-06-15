import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import rawData from '../data/monthlyAirlineRoutes.json'
import type { AirlineMonthlySummary, AirlineName, MonthlyAirlineRouteStat, SortDir, SortKey } from '../types/airline'
import { FOUR_AIRLINES } from '../types/airline'

const allRecords = rawData as MonthlyAirlineRouteStat[]

export const useAirlineGrowthStore = defineStore('airline-growth', () => {
  // ── 篩選狀態 ─────────────────────────────────────────────────────
  const selectedAirline = ref<AirlineName>('中華航空')
  // 預設使用最新可用月份，避免月份選擇器空白。
  const selectedMonth = ref<string>(
    [...new Set(allRecords.map((r) => r.month))].sort().at(-1) ?? '',
  )

  // ── 衍生資料：所有可用月份 ─────────────
  const availableMonths = computed(() => {
    const months = [...new Set(allRecords.map((r) => r.month))].sort()
    return months
  })

  // 未選月份時回退到最新月份。
  const activeMonth = computed(() => selectedMonth.value || availableMonths.value.at(-1) || '')

  // ── 目前航空公司與月份的篩選結果 ─────────────────────
  const airlineRecords = computed(() =>
    allRecords.filter(
      (r) => r.airlineName === selectedAirline.value && r.month === activeMonth.value,
    ),
  )

  // ── KPI 摘要 ──────────────────────────────────────────────────────
  const summary = computed<AirlineMonthlySummary>(() => {
    const recs = airlineRecords.value
    const totalFlights = recs.reduce((s, r) => s + r.flightCount, 0)
    const totalSeats = recs.reduce((s, r) => s + r.seatCount, 0)
    const totalPax = recs.reduce((s, r) => s + r.passengerCount, 0)
    const avgLf = totalSeats > 0 ? (totalPax / totalSeats) * 100 : 0

    return {
      month: activeMonth.value,
      airlineName: selectedAirline.value,
      routeCount: recs.length,
      flightCount: totalFlights,
      seatCount: totalSeats,
      passengerCount: totalPax,
      avgLoadFactor: Math.round(avgLf * 10) / 10,
      // 成長率欄位需要多月份資料，目前先保留為 undefined。
    }
  })

  // ── 航點表現列表（可排序） ────────────────────────────────
  const sortKey = ref<SortKey>('loadFactor')
  const sortDir = ref<SortDir>('desc')

  const sortedRoutes = computed(() => {
    const recs = [...airlineRecords.value]
    recs.sort((a, b) => {
      const diff = a[sortKey.value] - b[sortKey.value]
      return sortDir.value === 'desc' ? -diff : diff
    })
    return recs
  })

  const setSort = (key: SortKey) => {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
    } else {
      sortKey.value = key
      sortDir.value = 'desc'
    }
  }

  // ── 圖表資料輔助 ────────────────────────────────────────────────
  const chartRoutes = computed(() =>
    [...airlineRecords.value].sort((a, b) => b.loadFactor - a.loadFactor),
  )

  // ── 跨月份輔助資料（供未來成長率使用） ─────────────────────
  const monthsForAirline = computed(() =>
    [...new Set(allRecords.filter((r) => r.airlineName === selectedAirline.value).map((r) => r.month))].sort(),
  )

  const hasMultipleMonths = computed(() => monthsForAirline.value.length > 1)

  // 選定航空公司各月份平均載客率（供趨勢圖使用）
  const trendData = computed(() =>
    monthsForAirline.value.map((m) => {
      const recs = allRecords.filter(
        (r) => r.airlineName === selectedAirline.value && r.month === m,
      )
      const totalSeats = recs.reduce((s, r) => s + r.seatCount, 0)
      const totalPax = recs.reduce((s, r) => s + r.passengerCount, 0)
      return {
        month: m,
        avgLoadFactor: totalSeats > 0 ? Math.round((totalPax / totalSeats) * 1000) / 10 : 0,
      }
    }),
  )

  // MoM 成長率（百分點差）：當月 vs 前一個月
  const momGrowth = computed<number | undefined>(() => {
    const months = monthsForAirline.value
    const idx = months.indexOf(activeMonth.value)
    if (idx <= 0) return undefined

    const prevMonth = months[idx - 1]
    const prevRecs = allRecords.filter(
      (r) => r.airlineName === selectedAirline.value && r.month === prevMonth,
    )
    const prevSeats = prevRecs.reduce((s, r) => s + r.seatCount, 0)
    const prevPax = prevRecs.reduce((s, r) => s + r.passengerCount, 0)
    const prevLf = prevSeats > 0 ? (prevPax / prevSeats) * 100 : 0

    return Math.round((summary.value.avgLoadFactor - prevLf) * 10) / 10
  })

  // ── 四家航空公司當月摘要（保留給未來比較區使用） ──────────
  const fourAirlinesSummary = computed(() =>
    FOUR_AIRLINES.map((name) => {
      const recs = allRecords.filter(
        (r) => r.airlineName === name && r.month === activeMonth.value,
      )
      const totalSeats = recs.reduce((s, r) => s + r.seatCount, 0)
      const totalPax = recs.reduce((s, r) => s + r.passengerCount, 0)
      return {
        airlineName: name,
        routeCount: recs.length,
        flightCount: recs.reduce((s, r) => s + r.flightCount, 0),
        passengerCount: totalPax,
        avgLoadFactor: totalSeats > 0 ? Math.round((totalPax / totalSeats) * 1000) / 10 : 0,
      }
    }),
  )

  return {
    selectedAirline,
    selectedMonth,
    activeMonth,
    availableMonths,
    airlineRecords,
    summary,
    sortKey,
    sortDir,
    sortedRoutes,
    setSort,
    chartRoutes,
    hasMultipleMonths,
    trendData,
    momGrowth,
    fourAirlinesSummary,
  }
})
