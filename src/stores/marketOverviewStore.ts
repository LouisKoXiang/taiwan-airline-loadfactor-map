import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import rawData from '../data/monthlyAirlineRoutes.json'
import type { AirlineName, MonthlyAirlineRouteStat } from '../types/airline'
import { FOUR_AIRLINES, AIRLINE_META } from '../types/airline'

const allRecords = rawData as MonthlyAirlineRouteStat[]

function monthYear(m: string): number {
  const match = m.match(/(\d+)年/)
  return match ? parseInt(match[1]) : 0
}

function monthSortKey(m: string): number {
  const match = m.match(/(\d+)年(\d+)月/)
  if (!match) return 0
  return parseInt(match[1]) * 100 + parseInt(match[2])
}

function sortMonths(months: Iterable<string>): string[] {
  return [...months].sort((a, b) => monthSortKey(a) - monthSortKey(b))
}

function monthRangeLabel(year: number, months: Iterable<number>): string {
  const nums = [...months].filter((m) => m > 0).sort((a, b) => a - b)
  if (nums.length === 0) return `${year} 年`
  return `${year} 年 ${nums[0]} 月至 ${nums[nums.length - 1]} 月`
}

function makeMetric(current: number, previous: number | null): CumulativeMetric {
  const delta = previous === null ? null : current - previous
  const percentChange = previous !== null && previous > 0
    ? Math.round(((current - previous) / previous) * 1000) / 10
    : null
  return { current, previous, delta, percentChange }
}

function aggregateRecords(records: MonthlyAirlineRouteStat[]) {
  const seatCount = records.reduce((s, r) => s + r.seatCount, 0)
  const passengerCount = records.reduce((s, r) => s + r.passengerCount, 0)
  return {
    routeCount: new Set(records.map((r) => `${r.airlineName}|${r.originAirportCode}-${r.destinationAirportCode}`)).size,
    flightCount: records.reduce((s, r) => s + r.flightCount, 0),
    passengerCount,
    seatCount,
    avgLoadFactor: seatCount > 0 ? Math.round((passengerCount / seatCount) * 1000) / 10 : 0,
  }
}

function airlineStatsFromRecords(records: MonthlyAirlineRouteStat[]): AirlineYearlyStat[] {
  return FOUR_AIRLINES.map((airline) => {
    const recs = records.filter((r) => r.airlineName === airline)
    const seats = recs.reduce((s, r) => s + r.seatCount, 0)
    const pax = recs.reduce((s, r) => s + r.passengerCount, 0)
    const flights = recs.reduce((s, r) => s + r.flightCount, 0)
    const routes = new Set(recs.map((r) => `${r.originAirportCode}-${r.destinationAirportCode}`)).size
    return {
      airlineName: airline,
      color: AIRLINE_META[airline].accent,
      avgLoadFactor: seats > 0 ? Math.round((pax / seats) * 1000) / 10 : 0,
      passengerCount: pax,
      flightCount: flights,
      seatCount: seats,
      routeCount: routes,
    }
  })
}

export interface AirlineYearlyStat {
  airlineName: AirlineName
  color: string
  avgLoadFactor: number
  passengerCount: number
  flightCount: number
  seatCount: number
  routeCount: number
}

export interface CumulativeMetric {
  current: number
  previous: number | null
  delta: number | null
  percentChange: number | null
}

export interface CumulativeOverviewSummary {
  year: number
  prevYear: number
  monthRangeLabel: string
  prevMonthRangeLabel: string
  airlines: CumulativeAirlineSummary[]
}

export interface CumulativeAirlineSummary {
  airlineName: AirlineName
  color: string
  passengerCount: CumulativeMetric
  avgLoadFactor: CumulativeMetric
}

export interface MonthlyPoint {
  month: string
  loadFactor: number | null
  passengerCount: number | null
  flightCount: number | null
  routeCount: number | null
}

export interface AirlineSeries {
  airline: AirlineName
  color: string
  points: MonthlyPoint[]
}

export interface AirportAirlineData {
  airline: AirlineName
  color: string
  passengerCount: number
  flightCount: number
  routeCount: number
  previousPassengerCount: number | null
  passengerYoYPct: number | null
}

export interface AirportStat {
  airport: string
  airlineData: AirportAirlineData[]
  totalPax: number
}

// ─── 區域定義 ────────────────────────────────────────────────────────────────

export type RegionKey = 'japan' | 'usa' | 'europe'

const EUROPE_COUNTRIES = new Set([
  '英國', '法國', '德國', '義大利', '荷蘭', '奧地利', '捷克',
  '土耳其', '瑞士', '西班牙', '芬蘭', '瑞典', '挪威', '丹麥',
  '比利時', '葡萄牙', '波蘭', '匈牙利', '希臘', '俄羅斯',
])

function classifyRegion(country: string): RegionKey | null {
  if (country === '日本') return 'japan'
  if (country === '美國' || country === 'USA' || country === 'United States') return 'usa'
  if (EUROPE_COUNTRIES.has(country)) return 'europe'
  return null
}

const REGION_NAMES: Record<RegionKey, string> = {
  japan: '日本線',
  usa:   '美國線',
  europe: '歐洲線',
}

const REGION_KEYS: RegionKey[] = ['japan', 'usa', 'europe']

export interface RegionMarketStat {
  regionKey: RegionKey
  regionName: string
  airline: AirlineName
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
}

export const useMarketOverviewStore = defineStore('market-overview', () => {
  const availableYears = computed(() => {
    const years = new Set<number>()
    for (const r of allRecords) {
      const y = monthYear(r.month)
      if (y > 0) years.add(y)
    }
    return [...years].sort((a, b) => b - a)
  })

  const selectedYear = ref(0)
  const activeYear = computed(() =>
    selectedYear.value > 0 ? selectedYear.value : (availableYears.value[0] ?? 0),
  )

  const yearRecords = computed(() =>
    allRecords.filter((r) => monthYear(r.month) === activeYear.value),
  )

  const monthsInYear = computed(() =>
    sortMonths(new Set(yearRecords.value.map((r) => r.month))),
  )

  // Group by airline+month for O(1) lookups in series computation
  const byAirlineMonth = computed(() => {
    const map = new Map<string, MonthlyAirlineRouteStat[]>()
    for (const r of yearRecords.value) {
      const key = `${r.airlineName}|${r.month}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  })

  const airlineSeries = computed<AirlineSeries[]>(() =>
    FOUR_AIRLINES.map((airline) => {
      const color = AIRLINE_META[airline].accent
      const points = monthsInYear.value.map((month) => {
        const recs = byAirlineMonth.value.get(`${airline}|${month}`) ?? []
        if (recs.length === 0) {
          return { month, loadFactor: null, passengerCount: null, flightCount: null, routeCount: null }
        }
        const seats = recs.reduce((s, r) => s + r.seatCount, 0)
        const pax = recs.reduce((s, r) => s + r.passengerCount, 0)
        const flights = recs.reduce((s, r) => s + r.flightCount, 0)
        const routes = new Set(recs.map((r) => `${r.originAirportCode}-${r.destinationAirportCode}`)).size
        return {
          month,
          loadFactor: seats > 0 ? Math.round((pax / seats) * 1000) / 10 : null,
          passengerCount: pax,
          flightCount: flights,
          routeCount: routes,
        }
      })
      return { airline, color, points }
    }),
  )

  const airlineYearlyStats = computed<AirlineYearlyStat[]>(() => airlineStatsFromRecords(yearRecords.value))

  const MAIN_AIRPORTS = ['TPE', 'TSA', 'KHH', 'RMQ'] as const

  const prevYear = computed(() => activeYear.value - 1)

  const prevFullYearRecords = computed(() =>
    allRecords.filter((r) => monthYear(r.month) === prevYear.value),
  )

  const prevFullYearAirlineStats = computed<AirlineYearlyStat[]>(() =>
    airlineStatsFromRecords(prevFullYearRecords.value),
  )

  // Month numbers (1-12) present in the active year's data
  const activeMonthNums = computed(() => {
    const nums = new Set<number>()
    for (const m of monthsInYear.value) {
      const match = m.match(/\d+年(\d+)月/)
      if (match) nums.add(parseInt(match[1]))
    }
    return nums
  })

  // Previous year records for only the months comparable to the active year
  const prevYearComparableRecords = computed(() =>
    allRecords.filter((r) => {
      if (monthYear(r.month) !== prevYear.value) return false
      const match = r.month.match(/\d+年(\d+)月/)
      return match ? activeMonthNums.value.has(parseInt(match[1])) : false
    }),
  )

  const cumulativeOverviewSummary = computed<CumulativeOverviewSummary>(() => {
    const previousRecords = prevYearComparableRecords.value
    const airlines = FOUR_AIRLINES.map((airline) => {
      const current = aggregateRecords(yearRecords.value.filter((r) => r.airlineName === airline))
      const previousSource = previousRecords.filter((r) => r.airlineName === airline)
      const previous = previousSource.length > 0 ? aggregateRecords(previousSource) : null
      const currentLfDelta = previous ? current.avgLoadFactor - previous.avgLoadFactor : null

      return {
        airlineName: airline,
        color: AIRLINE_META[airline].accent,
        passengerCount: makeMetric(current.passengerCount, previous?.passengerCount ?? null),
        avgLoadFactor: {
          current: current.avgLoadFactor,
          previous: previous?.avgLoadFactor ?? null,
          delta: currentLfDelta === null ? null : Math.round(currentLfDelta * 10) / 10,
          percentChange: null,
        },
      }
    })

    return {
      year: activeYear.value,
      prevYear: prevYear.value,
      monthRangeLabel: monthRangeLabel(activeYear.value, activeMonthNums.value),
      prevMonthRangeLabel: monthRangeLabel(prevYear.value, activeMonthNums.value),
      airlines,
    }
  })

  // Aggregate prev-year pax by "airline|airport" for O(1) airport breakdown lookup
  const prevByAirlineAirport = computed(() => {
    const map = new Map<string, number>()
    for (const r of prevYearComparableRecords.value) {
      const key = `${r.airlineName}|${r.originAirportCode}`
      map.set(key, (map.get(key) ?? 0) + r.passengerCount)
    }
    return map
  })

  const airportBreakdown = computed<AirportStat[]>(() =>
    MAIN_AIRPORTS.flatMap((airport) => {
      const airlineData: AirportAirlineData[] = FOUR_AIRLINES.flatMap((airline) => {
        const recs = yearRecords.value.filter(
          (r) => r.airlineName === airline && r.originAirportCode === airport,
        )
        if (recs.length === 0) return []
        const currentPax = recs.reduce((s, r) => s + r.passengerCount, 0)
        const prevPax = prevByAirlineAirport.value.get(`${airline}|${airport}`) ?? null
        const passengerYoYPct = prevPax !== null && prevPax > 0
          ? Math.round(((currentPax - prevPax) / prevPax) * 1000) / 10
          : null
        return [{
          airline,
          color: AIRLINE_META[airline].accent,
          passengerCount: currentPax,
          flightCount: recs.reduce((s, r) => s + r.flightCount, 0),
          routeCount: new Set(recs.map((r) => r.destinationAirportCode)).size,
          previousPassengerCount: prevPax,
          passengerYoYPct,
        }]
      }).sort((a, b) => b.passengerCount - a.passengerCount)

      if (airlineData.length === 0) return []
      return [{
        airport,
        airlineData,
        totalPax: airlineData.reduce((s, d) => s + d.passengerCount, 0),
      }]
    }),
  )

  // ─── 區域市場統計 ────────────────────────────────────────────────────────
  const regionMarketStats = computed<RegionMarketStat[]>(() => {
    const result: RegionMarketStat[] = []
    for (const regionKey of REGION_KEYS) {
      for (const airline of FOUR_AIRLINES) {
        const recs = yearRecords.value.filter(
          (r) => r.airlineName === airline && classifyRegion(r.destinationCountry) === regionKey,
        )
        if (recs.length === 0) continue
        const flightCount = recs.reduce((s, r) => s + r.flightCount, 0)
        const seatCount = recs.reduce((s, r) => s + r.seatCount, 0)
        const passengerCount = recs.reduce((s, r) => s + r.passengerCount, 0)
        const loadFactor = seatCount > 0 ? Math.round((passengerCount / seatCount) * 1000) / 10 : 0
        result.push({
          regionKey,
          regionName: REGION_NAMES[regionKey],
          airline,
          flightCount,
          seatCount,
          passengerCount,
          loadFactor,
        })
      }
    }
    return result
  })

  return {
    selectedYear,
    activeYear,
    availableYears,
    prevYear,
    monthsInYear,
    cumulativeOverviewSummary,
    airlineSeries,
    airlineYearlyStats,
    prevFullYearAirlineStats,
    airportBreakdown,
    regionMarketStats,
    REGION_KEYS,
    REGION_NAMES,
  }
})
