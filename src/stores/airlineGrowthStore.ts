import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import rawData from '../data/monthlyAirlineRoutes.json'
import type { AnalysisTab, AirlineMonthlySummary, AirlineName, MonthlyAirlineRouteStat, SortDir, SortKey } from '../types/airline'
import { FOUR_AIRLINES } from '../types/airline'
import { monthSortKey, sortMonths } from '../utils/month'

interface RouteWithYoY extends MonthlyAirlineRouteStat {
  previousFlightCount?: number
  previousSeatCount?: number
  previousPassengerCount?: number
  previousLoadFactor?: number
  yoyLoadFactorPp?: number
  yoyPassengerPct?: number
  yoyFlightPct?: number
  yoySeatPct?: number
  isNew: boolean
}

interface YoySummaryData {
  currentMonth: string
  previousYearMonth: string
  hasPreviousYearData: boolean
  currentAvgLoadFactor: number
  previousAvgLoadFactor?: number
  loadFactorPp?: number
  currentPassengerCount: number
  previousPassengerCount?: number
  passengerPct?: number
  currentFlightCount: number
  previousFlightCount?: number
  flightPct?: number
  currentSeatCount: number
  previousSeatCount?: number
  seatPct?: number
  currentRouteCount: number
  previousRouteCount?: number
  routeCountChange?: number
  summaryText: string
}

interface RouteChangeItem {
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  destinationCountry: string
  currentFlightCount: number
  previousFlightCount: number
  flightDiff: number
  flightChangePercent?: number
  currentLoadFactor?: number
  previousLoadFactor?: number
  currentPassengerCount: number
  previousPassengerCount: number
}

interface OpportunityRoute extends MonthlyAirlineRouteStat {
  reason: string
  yoyPassengerPct?: number
}

interface DetailRow extends MonthlyAirlineRouteStat {
  yoyLoadFactorPp?: number
  yoyPassengerPct?: number
  yoyFlightPct?: number
  yoySeatPct?: number
  isNew: boolean
  tags: string[]
}

interface TimelineCell {
  month: string
  hasService: boolean
  flightCount?: number
  passengerCount?: number
  seatCount?: number
  loadFactor?: number
}

interface TimelineRow {
  routeKey: string
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  destinationCountry: string
  activeMonthCount: number
  latestPassengerCount: number
  latestFlightCount: number
  latestLoadFactor?: number
  months: TimelineCell[]
}

const allRecords = rawData as MonthlyAirlineRouteStat[]

function weightedLoadFactor(records: MonthlyAirlineRouteStat[]): number {
  const totalSeats = records.reduce((s, r) => s + r.seatCount, 0)
  const totalPax = records.reduce((s, r) => s + r.passengerCount, 0)
  return totalSeats > 0 ? Math.round((totalPax / totalSeats) * 1000) / 10 : 0
}

function routeKey(r: Pick<MonthlyAirlineRouteStat, 'originAirportCode' | 'destinationAirportCode'>) {
  return `${r.originAirportCode}-${r.destinationAirportCode}`
}

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function ppChange(current: number, previous: number): number {
  return Math.round((current - previous) * 10) / 10
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function toChangeItem(current?: MonthlyAirlineRouteStat, previous?: MonthlyAirlineRouteStat): RouteChangeItem {
  const base = current ?? previous
  if (!base) {
    throw new Error('route change item requires current or previous route')
  }
  const currentFlightCount = current?.flightCount ?? 0
  const previousFlightCount = previous?.flightCount ?? 0
  return {
    originAirportCode: base.originAirportCode,
    destinationAirportCode: base.destinationAirportCode,
    destinationCityName: base.destinationCityName,
    destinationCountry: base.destinationCountry,
    currentFlightCount,
    previousFlightCount,
    flightDiff: currentFlightCount - previousFlightCount,
    flightChangePercent: previousFlightCount > 0
      ? pctChange(currentFlightCount, previousFlightCount)
      : undefined,
    currentLoadFactor: current?.loadFactor,
    previousLoadFactor: previous?.loadFactor,
    currentPassengerCount: current?.passengerCount ?? 0,
    previousPassengerCount: previous?.passengerCount ?? 0,
  }
}

export const useAirlineGrowthStore = defineStore('airline-growth', () => {
  // ── 篩選狀態 ─────────────────────────────────────────────────────
  const selectedAirline = ref<AirlineName>('中華航空')
  // 預設使用最新可用月份，避免月份選擇器空白。
  const selectedMonth = ref<string>(
    sortMonths(new Set(allRecords.map((r) => r.month))).at(-1) ?? '',
  )

  // ── 衍生資料：所有可用月份 ─────────────
  const availableMonths = computed(() =>
    sortMonths(new Set(allRecords.map((r) => r.month))),
  )

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

  // ── 跨月份輔助資料（月份依時間順序排列） ─────────────────────
  const monthsForAirline = computed(() =>
    sortMonths(new Set(allRecords.filter((r) => r.airlineName === selectedAirline.value).map((r) => r.month))),
  )

  const hasMultipleMonths = computed(() => monthsForAirline.value.length > 1)

  // 選定航空公司各月份平均載客率（供趨勢圖使用）
  const trendData = computed(() =>
    monthsForAirline.value.map((m) => {
      const recs = allRecords.filter(
        (r) => r.airlineName === selectedAirline.value && r.month === m,
      )
      return {
        month: m,
        avgLoadFactor: weightedLoadFactor(recs),
      }
    }),
  )

  // 日本航線月趨勢：觀察四大航空最重要旅遊市場之一。
  const japanTrendData = computed(() =>
    monthsForAirline.value.map((m) => {
      const recs = allRecords.filter(
        (r) =>
          r.airlineName === selectedAirline.value &&
          r.month === m &&
          r.destinationCountry === '日本',
      )
      return {
        month: m,
        avgLoadFactor: weightedLoadFactor(recs),
      }
    }).filter((point) => point.avgLoadFactor > 0),
  )

  // 中南部機場月趨勢：合併高雄（KHH）與台中（RMQ）出發航線。
  const regionalAirportTrendData = computed(() =>
    monthsForAirline.value.map((m) => {
      const recs = allRecords.filter(
        (r) =>
          r.airlineName === selectedAirline.value &&
          r.month === m &&
          (r.originAirportCode === 'KHH' || r.originAirportCode === 'RMQ'),
      )
      return {
        month: m,
        avgLoadFactor: weightedLoadFactor(recs),
      }
    }).filter((point) => point.avgLoadFactor > 0),
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

  // ── 分析 Tab 狀態 ──────────────────────────────────────────────
  const activeTab = ref<AnalysisTab>('overview')
  const setActiveTab = (tab: AnalysisTab) => { activeTab.value = tab }

  // ── 去年同月 ────────────────────────────────────────────────────
  const previousYearMonth = computed(() => {
    const match = activeMonth.value.match(/(\d+)年(\d+)月/)
    if (!match) return ''
    return `${parseInt(match[1]) - 1}年${match[2]}月`
  })

  const hasPreviousYearData = computed(() =>
    previousYearMonth.value !== '' &&
    allRecords.some((r) => r.airlineName === selectedAirline.value && r.month === previousYearMonth.value),
  )

  // ── 含同期比較的航線資料 ─────────────────────────────────────
  const routesWithYoY = computed<RouteWithYoY[]>(() => {
    const prevRecs = hasPreviousYearData.value
      ? allRecords.filter((r) => r.airlineName === selectedAirline.value && r.month === previousYearMonth.value)
      : []

    return airlineRecords.value.map((r) => {
      const prev = prevRecs.find(
        (p) => p.originAirportCode === r.originAirportCode && p.destinationAirportCode === r.destinationAirportCode,
      )
      if (!prev) return { ...r, isNew: hasPreviousYearData.value }

      const yoyLoadFactorPp = ppChange(r.loadFactor, prev.loadFactor)
      const yoyPassengerPct = pctChange(r.passengerCount, prev.passengerCount)
      const yoyFlightPct = pctChange(r.flightCount, prev.flightCount)
      const yoySeatPct = pctChange(r.seatCount, prev.seatCount)

      return {
        ...r,
        previousFlightCount: prev.flightCount,
        previousSeatCount: prev.seatCount,
        previousPassengerCount: prev.passengerCount,
        previousLoadFactor: prev.loadFactor,
        yoyLoadFactorPp,
        yoyPassengerPct,
        yoyFlightPct,
        yoySeatPct,
        isNew: false,
      }
    })
  })

  // ── 同期整體摘要 ────────────────────────────────────────────────
  const yoySummary = computed<YoySummaryData>(() => {
    if (!hasPreviousYearData.value) {
      return {
        currentMonth: activeMonth.value,
        previousYearMonth: previousYearMonth.value,
        hasPreviousYearData: false,
        currentAvgLoadFactor: summary.value.avgLoadFactor,
        currentPassengerCount: summary.value.passengerCount,
        currentFlightCount: summary.value.flightCount,
        currentSeatCount: summary.value.seatCount,
        currentRouteCount: summary.value.routeCount,
        summaryText: `目前沒有 ${previousYearMonth.value || '去年同月'} 的同期資料，暫無法計算年增表現。`,
      }
    }

    const prevRecs = allRecords.filter(
      (r) => r.airlineName === selectedAirline.value && r.month === previousYearMonth.value,
    )
    const prevSeats = prevRecs.reduce((s, r) => s + r.seatCount, 0)
    const prevPax = prevRecs.reduce((s, r) => s + r.passengerCount, 0)
    const prevFlights = prevRecs.reduce((s, r) => s + r.flightCount, 0)
    const prevLf = prevSeats > 0 ? (prevPax / prevSeats) * 100 : 0

    const loadFactorPp = ppChange(summary.value.avgLoadFactor, prevLf)
    const passengerPct = pctChange(summary.value.passengerCount, prevPax)
    const flightPct = pctChange(summary.value.flightCount, prevFlights)
    const seatPct = pctChange(summary.value.seatCount, prevSeats)
    const routeCountChange = summary.value.routeCount - prevRecs.length

    const d = (val: number, unit: string) => `${val >= 0 ? '提升' : '下降'} ${Math.abs(val).toFixed(1)}${unit}`
    const p = (val: number | undefined) => val === undefined ? '無法計算' : `${val >= 0 ? '年增' : '年減'} ${Math.abs(val).toFixed(1)}%`

    const summaryText = `${selectedAirline.value} ${activeMonth.value}平均載客率為 ${summary.value.avgLoadFactor.toFixed(1)}%，較 ${previousYearMonth.value} ${d(loadFactorPp, 'pp')}；載客人數${p(passengerPct)}，飛行架次${p(flightPct)}。`

    return {
      currentMonth: activeMonth.value,
      previousYearMonth: previousYearMonth.value,
      hasPreviousYearData: true,
      currentAvgLoadFactor: summary.value.avgLoadFactor,
      previousAvgLoadFactor: Math.round(prevLf * 10) / 10,
      loadFactorPp,
      currentPassengerCount: summary.value.passengerCount,
      previousPassengerCount: prevPax,
      passengerPct,
      currentFlightCount: summary.value.flightCount,
      previousFlightCount: prevFlights,
      flightPct,
      currentSeatCount: summary.value.seatCount,
      previousSeatCount: prevSeats,
      seatPct,
      currentRouteCount: summary.value.routeCount,
      previousRouteCount: prevRecs.length,
      routeCountChange,
      summaryText,
    }
  })

  // ── 航線異動（新增 / 停飛 / 增班 / 減班）──────────────────────
  const routeChanges = computed(() => {
    if (!hasPreviousYearData.value) {
      return {
        newRoutes: [] as RouteChangeItem[],
        suspendedRoutes: [] as RouteChangeItem[],
        increasedRoutes: [] as RouteChangeItem[],
        decreasedRoutes: [] as RouteChangeItem[],
      }
    }

    const prevRecs = allRecords.filter(
      (r) => r.airlineName === selectedAirline.value && r.month === previousYearMonth.value,
    )
    const currentMap = new Map(airlineRecords.value.map((r) => [routeKey(r), r]))
    const prevMap = new Map(prevRecs.map((r) => [routeKey(r), r]))
    const newRoutes: RouteChangeItem[] = []
    const suspendedRoutes: RouteChangeItem[] = []
    const increasedRoutes: RouteChangeItem[] = []
    const decreasedRoutes: RouteChangeItem[] = []

    for (const [key, current] of currentMap) {
      const previous = prevMap.get(key)
      if (!previous) {
        newRoutes.push(toChangeItem(current, undefined))
        continue
      }

      const item = toChangeItem(current, previous)
      const absDiff = Math.abs(item.flightDiff)
      const absPct = Math.abs(item.flightChangePercent ?? 0)
      if (absDiff >= 8 || absPct >= 30) {
        if (item.flightDiff > 0) increasedRoutes.push(item)
        if (item.flightDiff < 0) decreasedRoutes.push(item)
      }
    }

    for (const [key, previous] of prevMap) {
      if (!currentMap.has(key)) {
        suspendedRoutes.push(toChangeItem(undefined, previous))
      }
    }

    const byAbsDiff = (a: RouteChangeItem, b: RouteChangeItem) => Math.abs(b.flightDiff) - Math.abs(a.flightDiff)

    return {
      newRoutes: newRoutes.sort(byAbsDiff),
      suspendedRoutes: suspendedRoutes.sort(byAbsDiff),
      increasedRoutes: increasedRoutes.sort(byAbsDiff),
      decreasedRoutes: decreasedRoutes.sort(byAbsDiff),
    }
  })

  // ── 增班潛力航線：LF ≥ 90% 且（低於中位架次或同期旅客增長 ≥ 20%） ──
  const opportunityRoutes = computed<OpportunityRoute[]>(() => {
    const recs = airlineRecords.value
    if (recs.length === 0) return []

    const medianFlights = median(recs.map((r) => r.flightCount))

    return recs.flatMap((r) => {
      if (r.loadFactor < 90) return []
      const yoyRow = routesWithYoY.value.find(
        (rr) => rr.originAirportCode === r.originAirportCode && rr.destinationAirportCode === r.destinationAirportCode,
      )
      const belowMedian = r.flightCount < medianFlights
      const highPaxGrowth = (yoyRow?.yoyPassengerPct ?? 0) >= 20
      if (!belowMedian && !highPaxGrowth) return []

      const reasons: string[] = []
      if (belowMedian) reasons.push(`載客率 ${r.loadFactor.toFixed(1)}%，班次低於當月中位數`)
      if (highPaxGrowth && yoyRow?.yoyPassengerPct !== undefined) {
        reasons.push(`載客人數較去年同期成長 ${yoyRow.yoyPassengerPct.toFixed(1)}%`)
      }
      return [{ ...r, reason: reasons.join('；'), yoyPassengerPct: yoyRow?.yoyPassengerPct }]
    }).sort((a, b) => b.loadFactor - a.loadFactor || b.passengerCount - a.passengerCount)
  })

  // ── 航線標籤 ─────────────────────────────────────────────────────
  const routeDetailTags = computed(() => {
    const map = new Map<string, string[]>()
    const oppKeys = new Set(
      opportunityRoutes.value.map((r) => routeKey(r)),
    )
    const increasedKeys = new Set(routeChanges.value.increasedRoutes.map((r) => `${r.originAirportCode}-${r.destinationAirportCode}`))
    const decreasedKeys = new Set(routeChanges.value.decreasedRoutes.map((r) => `${r.originAirportCode}-${r.destinationAirportCode}`))

    for (const r of routesWithYoY.value) {
      const key = routeKey(r)
      const tags: string[] = []
      if (r.isNew) tags.push('新航點')
      if (r.loadFactor >= 90) tags.push('高需求')
      if (oppKeys.has(key)) tags.push('增班潛力')
      if (increasedKeys.has(key)) tags.push('增班')
      if (decreasedKeys.has(key)) tags.push('減班')
      map.set(key, tags)
    }
    return map
  })

  // ── 明細列（含同期比較與標籤） ────────────────────────────────
  const detailRows = computed<DetailRow[]>(() =>
    sortedRoutes.value.map((r) => {
      const key = `${r.originAirportCode}-${r.destinationAirportCode}`
      const yoyRow = routesWithYoY.value.find(
        (rr) => rr.originAirportCode === r.originAirportCode && rr.destinationAirportCode === r.destinationAirportCode,
      )
      return {
        ...r,
        yoyLoadFactorPp: yoyRow?.yoyLoadFactorPp,
        yoyPassengerPct: yoyRow?.yoyPassengerPct,
        yoyFlightPct: yoyRow?.yoyFlightPct,
        yoySeatPct: yoyRow?.yoySeatPct,
        isNew: yoyRow?.isNew ?? false,
        tags: routeDetailTags.value.get(key) ?? [],
      }
    }),
  )

  // ── 矩陣顯示月份：目前月份往前 12 個月 ────────────────────────
  const visibleTimelineMonths = computed<string[]>(() => {
    const endKey = monthSortKey(activeMonth.value)
    if (endKey === 0) return []
    const match = activeMonth.value.match(/(\d+)年(\d+)月/)
    if (!match) return []
    // 往前 12 個月：年份減 1，月份不變
    const startKey = (parseInt(match[1]) - 1) * 100 + parseInt(match[2])
    return monthsForAirline.value.filter((m) => {
      const k = monthSortKey(m)
      return k >= startKey && k <= endKey
    })
  })

  // ── 航點月份矩陣 ─────────────────────────────────────────────
  const routeTimelineMatrix = computed<TimelineRow[]>(() => {
    const months = visibleTimelineMonths.value
    if (months.length === 0) return []

    const monthSet = new Set(months)
    const rangeRecs = allRecords.filter(
      (r) => r.airlineName === selectedAirline.value && monthSet.has(r.month),
    )

    type RouteInfo = {
      originAirportCode: string
      destinationAirportCode: string
      destinationCityName: string
      destinationCountry: string
      records: Map<string, MonthlyAirlineRouteStat>
    }
    const routeInfoMap = new Map<string, RouteInfo>()

    for (const r of rangeRecs) {
      const key = routeKey(r)
      if (!routeInfoMap.has(key)) {
        routeInfoMap.set(key, {
          originAirportCode: r.originAirportCode,
          destinationAirportCode: r.destinationAirportCode,
          destinationCityName: r.destinationCityName,
          destinationCountry: r.destinationCountry,
          records: new Map(),
        })
      }
      routeInfoMap.get(key)!.records.set(r.month, r)
    }

    const current = activeMonth.value

    const rows: TimelineRow[] = [...routeInfoMap.entries()].map(([key, info]) => {
      const monthCells: TimelineCell[] = months.map((m) => {
        const rec = info.records.get(m)
        if (!rec) return { month: m, hasService: false }
        return {
          month: m,
          hasService: true,
          flightCount: rec.flightCount,
          passengerCount: rec.passengerCount,
          seatCount: rec.seatCount,
          loadFactor: rec.loadFactor,
        }
      })

      const currentRec = info.records.get(current)

      return {
        routeKey: key,
        originAirportCode: info.originAirportCode,
        destinationAirportCode: info.destinationAirportCode,
        destinationCityName: info.destinationCityName,
        destinationCountry: info.destinationCountry,
        activeMonthCount: monthCells.filter((c) => c.hasService).length,
        latestPassengerCount: currentRec?.passengerCount ?? 0,
        latestFlightCount: currentRec?.flightCount ?? 0,
        latestLoadFactor: currentRec?.loadFactor,
        months: monthCells,
      }
    })

    // 只顯示區間內有班次變化的航點：有些月份有飛、有些月份無班。
    const changedRows = rows.filter((row) =>
      row.activeMonthCount > 0 && row.activeMonthCount < months.length,
    )

    // 排序：① 目前月份有飛 → ② activeMonthCount 多 → ③ latestPassengerCount 多
    return changedRows.sort((a, b) => {
      const aActive = a.latestPassengerCount > 0 ? 1 : 0
      const bActive = b.latestPassengerCount > 0 ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      if (a.activeMonthCount !== b.activeMonthCount) return b.activeMonthCount - a.activeMonthCount
      return b.latestPassengerCount - a.latestPassengerCount
    })
  })

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
    japanTrendData,
    regionalAirportTrendData,
    momGrowth,
    fourAirlinesSummary,
    activeTab,
    setActiveTab,
    previousYearMonth,
    hasPreviousYearData,
    routesWithYoY,
    yoySummary,
    routeChanges,
    opportunityRoutes,
    routeDetailTags,
    detailRows,
    visibleTimelineMonths,
    routeTimelineMatrix,
  }
})
