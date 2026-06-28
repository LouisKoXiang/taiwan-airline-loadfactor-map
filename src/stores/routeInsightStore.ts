import { computed } from 'vue'
import { defineStore } from 'pinia'
import rawData from '../data/monthlyAirlineRoutes.json'
import type { MonthlyAirlineRouteStat } from '../types/airline'
import { AIRLINE_META, FOUR_AIRLINES } from '../types/airline'
import { monthSortKey, sortMonths } from '../utils/month'

const allRecords = rawData as MonthlyAirlineRouteStat[]

// ── Map 索引（module-level，只建立一次）─────────────────────────────────────

/** key: "ORIGIN-DEST" → all records for that route (all airlines, all months) */
const byRouteCode = new Map<string, MonthlyAirlineRouteStat[]>()

/** key: "ORIGIN-DEST|airlineName|month" → single record for O(1) YoY lookup */
const byRouteAirlineMonth = new Map<string, MonthlyAirlineRouteStat>()

for (const r of allRecords) {
  const routeKey = `${r.originAirportCode}-${r.destinationAirportCode}`
  if (!byRouteCode.has(routeKey)) byRouteCode.set(routeKey, [])
  byRouteCode.get(routeKey)!.push(r)

  const detailKey = `${routeKey}|${r.airlineName}|${r.month}`
  byRouteAirlineMonth.set(detailKey, r)
}

// ── 全資料月份（升冪） ────────────────────────────────────────────────────────
const _allMonths = sortMonths(new Set(allRecords.map(r => r.month)))

// ── 工具函式 ─────────────────────────────────────────────────────────────────

/** 正規化 routeCode → 全大寫，並從被貼上多餘文字的 URL 中抽出第一組航線碼。 */
export function normalizeRouteCode(code: string): string {
  let decoded = code
  try {
    decoded = decodeURIComponent(code)
  } catch {
    decoded = code
  }
  const text = decoded.toUpperCase()
  const match = text.match(/([A-Z]{3})\s*(?:-|→)\s*([A-Z]{3})/)
  return match ? `${match[1]}-${match[2]}` : text.trim()
}

/** 取得此航線相關的月份區間（從航線首次出現到資料集最後一個月） */
function routeRelevantMonths(routeCode: string): string[] {
  const recs = byRouteCode.get(routeCode) ?? []
  if (recs.length === 0) return []
  const routeMonths = sortMonths(new Set(recs.map(r => r.month)))
  const firstMonth = routeMonths[0]
  const startIdx = _allMonths.indexOf(firstMonth)
  return startIdx >= 0 ? _allMonths.slice(startIdx) : _allMonths
}

function parseRocMonth(month: string): { year: number; month: number } | null {
  const match = month.match(/^(\d+)年(\d+)月$/)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

function ytdMonthsFor(month: string, yearOffset = 0): string[] {
  const parsed = parseRocMonth(month)
  if (!parsed) return []
  const year = parsed.year + yearOffset
  return Array.from({ length: parsed.month }, (_, i) => `${year}年${i + 1}月`)
}

function ytdLabelFor(month: string, yearOffset = 0): string {
  const parsed = parseRocMonth(month)
  if (!parsed) return month
  const year = parsed.year + yearOffset
  return `${year}年1-${parsed.month}月`
}

function aggregateRouteAirlineMonths(
  routeCode: string,
  airlineName: string,
  months: string[],
): Pick<MonthlyAirlineRouteStat, 'flightCount' | 'seatCount' | 'passengerCount' | 'loadFactor'> | null {
  const records = months
    .map(month => byRouteAirlineMonth.get(`${routeCode}|${airlineName}|${month}`))
    .filter((record): record is MonthlyAirlineRouteStat => record != null)

  const flightCount = records.reduce((sum, r) => sum + r.flightCount, 0)
  const seatCount = records.reduce((sum, r) => sum + r.seatCount, 0)
  const passengerCount = records.reduce((sum, r) => sum + r.passengerCount, 0)

  if (flightCount === 0 && seatCount === 0 && passengerCount === 0) return null

  return {
    flightCount,
    seatCount,
    passengerCount,
    loadFactor: seatCount > 0 ? Math.round(passengerCount / seatCount * 1000) / 10 : 0,
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RouteBasicInfo {
  routeCode: string
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  destinationCountry: string
  /** 曾飛過此航線的航司（all-time） */
  airlines: string[]
  /** 最新月份有飛的航司 */
  activeAirlines: string[]
  latestMonth: string
}

export interface RouteAirlineStat {
  airlineName: string
  airlineCode: string
  color: string
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
}

export interface RouteAirlineRanking {
  rank: number
  airlineName: string
  airlineCode: string
  color: string
  loadFactor: number
  passengerCount: number
  flightCount: number
}

export type YoYStatus = 'normal' | 'new-route' | 'stopped' | 'no-data'

export interface RouteYoYRow {
  airlineName: string
  airlineCode: string
  color: string
  status: YoYStatus
  currentMonth: string
  previousMonth: string
  currentLoadFactor: number | null
  previousLoadFactor: number | null
  loadFactorPp: number | null
  currentPassengerCount: number | null
  previousPassengerCount: number | null
  passengerPct: number | null
  currentFlightCount: number | null
  previousFlightCount: number | null
  flightPct: number | null
}

export interface RouteMatrixCell {
  month: string
  hasService: boolean
  flightCount: number | null
  loadFactor: number | null
  passengerCount: number | null
}

export interface RouteMatrixAirline {
  airlineName: string
  airlineCode: string
  color: string
  cells: RouteMatrixCell[]
}

export interface RouteMatrixData {
  months: string[]
  airlines: RouteMatrixAirline[]
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useRouteInsightStore = defineStore('routeInsight', () => {

  const allMonths = computed(() => _allMonths)

  /** Returns all records for a routeCode, sorted by month asc */
  function getRouteRecords(routeCode: string): MonthlyAirlineRouteStat[] {
    const code = normalizeRouteCode(routeCode)
    const recs = byRouteCode.get(code) ?? []
    return recs.slice().sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month))
  }

  /** Basic info about a route */
  function routeBasicInfo(routeCode: string): RouteBasicInfo | null {
    const code = normalizeRouteCode(routeCode)
    const recs = byRouteCode.get(code)
    if (!recs || recs.length === 0) return null

    const sortedMonths = sortMonths(new Set(recs.map(r => r.month)))
    const latestMonth = sortedMonths[sortedMonths.length - 1]
    const sample = recs[0]

    // all-time airlines (only FOUR_AIRLINES that appear in data)
    const airlines = FOUR_AIRLINES.filter(a => recs.some(r => r.airlineName === a))

    // airlines with data in the latest month
    const activeAirlines = FOUR_AIRLINES.filter(a =>
      byRouteAirlineMonth.has(`${code}|${a}|${latestMonth}`)
    )

    return {
      routeCode: code,
      originAirportCode: sample.originAirportCode,
      destinationAirportCode: sample.destinationAirportCode,
      destinationCityName: sample.destinationCityName,
      destinationCountry: sample.destinationCountry,
      airlines,
      activeAirlines,
      latestMonth,
    }
  }

  /**
   * Latest month stats — only for airlines that actually flew in the latest month.
   * Airlines that flew in the past but not latest month are excluded here.
   */
  function routeInsight(routeCode: string): RouteAirlineStat[] {
    const code = normalizeRouteCode(routeCode)
    const info = routeBasicInfo(code)
    if (!info) return []
    const { latestMonth, activeAirlines } = info

    return activeAirlines.map(airlineName => {
      const r = byRouteAirlineMonth.get(`${code}|${airlineName}|${latestMonth}`)!
      return {
        airlineName,
        airlineCode: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.code ?? '',
        color: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.accent ?? '#999',
        flightCount: r.flightCount,
        seatCount: r.seatCount,
        passengerCount: r.passengerCount,
        loadFactor: r.loadFactor,
      }
    })
  }

  /**
   * Monthly series per airline, aligned to route-relevant months only.
   * Used by MultiLineTrendChart.
   */
  function routeMonthlySeries(routeCode: string) {
    const code = normalizeRouteCode(routeCode)
    const info = routeBasicInfo(code)
    if (!info) return { lf: [], pax: [], flights: [] }

    const months = routeRelevantMonths(code)

    const makeSeries = (
      key: 'lf' | 'pax' | 'flights',
      _label: string,
      getValue: (r: MonthlyAirlineRouteStat) => number,
    ) =>
      info.airlines.map(airlineName => ({
        key: `${airlineName}-${key}`,
        label: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.code ?? airlineName,
        color: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.accent ?? '#999',
        points: months.map(month => ({
          month,
          value: (() => {
            const r = byRouteAirlineMonth.get(`${code}|${airlineName}|${month}`)
            return r != null ? getValue(r) : null
          })(),
        })),
      }))

    return {
      lf: makeSeries('lf', '載客率', r => r.loadFactor),
      pax: makeSeries('pax', '旅客數', r => r.passengerCount),
      flights: makeSeries('flights', '班次', r => r.flightCount),
    }
  }

  /** Rankings for the latest month — only active airlines */
  function routeAirlineRankings(routeCode: string): {
    byLoadFactor: RouteAirlineRanking[]
    byPassengers: RouteAirlineRanking[]
    byFlights: RouteAirlineRanking[]
  } {
    const stats = routeInsight(routeCode)

    const rank = (arr: RouteAirlineStat[], key: keyof RouteAirlineStat) =>
      [...arr]
        .sort((a, b) => (b[key] as number) - (a[key] as number))
        .map((s, i) => ({
          rank: i + 1,
          airlineName: s.airlineName,
          airlineCode: s.airlineCode,
          color: s.color,
          loadFactor: s.loadFactor,
          passengerCount: s.passengerCount,
          flightCount: s.flightCount,
        }))

    return {
      byLoadFactor: rank(stats, 'loadFactor'),
      byPassengers: rank(stats, 'passengerCount'),
      byFlights: rank(stats, 'flightCount'),
    }
  }

  /**
   * YoY comparison — covers all all-time airlines on this route.
   * Uses YTD cumulative periods, e.g. latest 115年5月 → 115年1-5月 vs 114年1-5月.
   * status field distinguishes: normal / new-route / stopped / no-data
   */
  function routeYoYComparison(routeCode: string): RouteYoYRow[] {
    const code = normalizeRouteCode(routeCode)
    const info = routeBasicInfo(code)
    if (!info) return []
    const { latestMonth, airlines } = info
    const currentMonths = ytdMonthsFor(latestMonth)
    const previousMonths = ytdMonthsFor(latestMonth, -1)
    const currentPeriod = ytdLabelFor(latestMonth)
    const previousPeriod = ytdLabelFor(latestMonth, -1)

    return airlines.map(airlineName => {
      const cur = aggregateRouteAirlineMonths(code, airlineName, currentMonths)
      const prev = aggregateRouteAirlineMonths(code, airlineName, previousMonths)

      let status: YoYStatus
      if (cur && prev) status = 'normal'
      else if (cur && !prev) status = 'new-route'
      else if (!cur && prev) status = 'stopped'
      else status = 'no-data'

      const curLF = cur?.loadFactor ?? null
      const prevLF = prev?.loadFactor ?? null
      const curPax = cur?.passengerCount ?? null
      const prevPax = prev?.passengerCount ?? null
      const curFlt = cur?.flightCount ?? null
      const prevFlt = prev?.flightCount ?? null

      return {
        airlineName,
        airlineCode: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.code ?? '',
        color: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.accent ?? '#999',
        status,
        currentMonth: currentPeriod,
        previousMonth: previousPeriod,
        currentLoadFactor: curLF,
        previousLoadFactor: prevLF,
        loadFactorPp: status === 'normal' ? curLF! - prevLF! : null,
        currentPassengerCount: curPax,
        previousPassengerCount: prevPax,
        passengerPct: status === 'normal' && prevPax! > 0
          ? ((curPax! - prevPax!) / prevPax!) * 100 : null,
        currentFlightCount: curFlt,
        previousFlightCount: prevFlt,
        flightPct: status === 'normal' && prevFlt! > 0
          ? ((curFlt! - prevFlt!) / prevFlt!) * 100 : null,
      }
    })
  }

  /**
   * Month × airline matrix for this route.
   * X = route-relevant months, Y = all four airlines.
   */
  function routeMonthMatrix(routeCode: string): RouteMatrixData {
    const code = normalizeRouteCode(routeCode)
    const months = routeRelevantMonths(code)

    const airlines: RouteMatrixAirline[] = FOUR_AIRLINES.map(airlineName => ({
      airlineName,
      airlineCode: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.code ?? '',
      color: AIRLINE_META[airlineName as keyof typeof AIRLINE_META]?.accent ?? '#999',
      cells: months.map(month => {
        const r = byRouteAirlineMonth.get(`${code}|${airlineName}|${month}`)
        return {
          month,
          hasService: r != null && r.flightCount > 0,
          flightCount: r?.flightCount ?? null,
          loadFactor: r?.loadFactor ?? null,
          passengerCount: r?.passengerCount ?? null,
        }
      }),
    }))

    return { months, airlines }
  }

  return {
    allMonths,
    getRouteRecords,
    routeBasicInfo,
    routeInsight,
    routeMonthlySeries,
    routeAirlineRankings,
    routeYoYComparison,
    routeMonthMatrix,
  }
})
