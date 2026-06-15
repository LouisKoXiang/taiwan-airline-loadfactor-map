import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import routesData from '../data/realRoutes.json'
import monthlyRoutesData from '../data/monthlyAirlineRoutes.json'
import type { MonthlyAirlineRouteStat } from '../types/airline'
import type { AirlineRouteStats, Route, RouteFilters, ViewMetric } from '../types/route'

const routeMetadata = routesData as Route[]
const monthlyRoutes = monthlyRoutesData as MonthlyAirlineRouteStat[]

const originMeta: Record<string, { city: string, coordinates: [number, number] }> = {
  TPE: { city: '台北', coordinates: [121.2328, 25.0777] },
  TSA: { city: '台北', coordinates: [121.5525, 25.0697] },
  KHH: { city: '高雄', coordinates: [120.35, 22.5771] },
  RMQ: { city: '台中', coordinates: [120.6461, 24.2647] },
}

const destinationCoordinates: Record<string, [number, number]> = {
  YVR: [-123.184, 49.1947],
  FKS: [140.431, 37.2274],
  HIJ: [132.919, 34.4361],
  PEN: [100.277, 5.2971],
  SFO: [-122.379, 37.6213],
  GUM: [144.797, 13.4839],
  DPS: [115.167, -8.748],
  CEB: [123.979, 10.3075],
  KMQ: [136.407, 36.3946],
  KMI: [131.449, 31.8772],
  VIE: [16.5697, 48.1103],
  CRK: [120.56, 15.1858],
  VII: [105.67, 18.7376],
  MXP: [8.728, 45.63],
  FCO: [12.2508, 41.8003],
  AOJ: [140.69, 40.7347],
  FSZ: [138.189, 34.796],
  LHR: [-0.4543, 51.47],
  YYZ: [-79.6306, 43.6777],
  IBR: [140.4147, 36.1811],
  HKD: [140.822, 41.77],
  ISG: [124.186, 24.3445],
  AMS: [4.7639, 52.3086],
  AKJ: [142.454, 43.6708],
  KOJ: [130.719, 31.8034],
  HSG: [130.302, 33.1497],
  KCZ: [133.669, 33.5461],
  MYJ: [132.6997, 33.8272],
  HNA: [141.135, 39.4286],
  AXT: [140.2186, 39.6156],
  KIJ: [139.121, 37.9559],
  HGH: [120.434, 30.2295],
  PEK: [116.5845, 40.0801],
  CAN: [113.2988, 23.3924],
  OIT: [131.737, 33.4794],
  YGJ: [133.236, 35.4922],
  MMY: [125.144, 24.8267],
  PHX: [-112.0116, 33.4342],
  TOY: [137.1875, 36.6483],
}

function monthSortKey(m: string): number {
  const match = m.match(/(\d+)年(\d+)月/)
  if (!match) return 0
  return parseInt(match[1]) * 100 + parseInt(match[2])
}

function sortMonths(months: Iterable<string>): string[] {
  return [...months].sort((a, b) => monthSortKey(a) - monthSortKey(b))
}

const availableMonths = sortMonths(new Set(monthlyRoutes.map((route) => route.month)))
const latestMonth = availableMonths.at(-1) ?? ''

const metadataByRoute = new Map(routeMetadata.map((route) => [route.id, route]))
const metadataByDestination = new Map(routeMetadata.map((route) => [route.destinationAirportCode, route]))

function routeKey(route: Pick<MonthlyAirlineRouteStat, 'originAirportCode' | 'destinationAirportCode'>) {
  return `${route.originAirportCode.toLowerCase()}-${route.destinationAirportCode.toLowerCase()}`
}

function airlineShortName(airlineName: string) {
  return airlineName.replace(/航空$/, '')
}

function buildRoutesForMonth(month: string): Route[] {
  const grouped = new Map<string, MonthlyAirlineRouteStat[]>()

  monthlyRoutes
    .filter((route) => route.month === month)
    .forEach((route) => {
      const key = routeKey(route)
      grouped.set(key, [...(grouped.get(key) ?? []), route])
    })

  return [...grouped.entries()].flatMap(([id, records]) => {
    const first = records[0]
    const origin = originMeta[first.originAirportCode]
    const routeMeta = metadataByRoute.get(id)
    const destinationMeta = metadataByDestination.get(first.destinationAirportCode)
    const destination = routeMeta?.coordinates.destination ??
      destinationMeta?.coordinates.destination ??
      destinationCoordinates[first.destinationAirportCode]

    if (!origin || !destination) return []

    const airlineRankings = records
      .map<AirlineRouteStats>((record, index) => ({
        rank: index + 1,
        airlineName: record.airlineName,
        airlineShortName: airlineShortName(record.airlineName),
        airlineCode: record.airlineCode,
        flightCount: record.flightCount,
        seatCount: record.seatCount,
        passengerCount: record.passengerCount,
        loadFactor: record.seatCount ? Math.round((record.passengerCount / record.seatCount) * 1000) / 10 : record.loadFactor,
        inboundPassengerCount: record.inboundPassengerCount,
        outboundPassengerCount: record.outboundPassengerCount,
      }))
      .sort((a, b) => b.passengerCount - a.passengerCount)
      .map((record, index) => ({ ...record, rank: index + 1 }))

    const flightCount = records.reduce((sum, record) => sum + record.flightCount, 0)
    const seatCount = records.reduce((sum, record) => sum + record.seatCount, 0)
    const passengerCount = records.reduce((sum, record) => sum + record.passengerCount, 0)
    const inboundPassengerCount = records.reduce((sum, record) => sum + (record.inboundPassengerCount ?? 0), 0)
    const outboundPassengerCount = records.reduce((sum, record) => sum + (record.outboundPassengerCount ?? 0), 0)

    return [{
      id,
      originAirportCode: first.originAirportCode,
      originCityName: origin.city,
      destinationAirportCode: first.destinationAirportCode,
      destinationCityName: first.destinationCityName,
      destinationDisplayName: routeMeta?.destinationDisplayName ?? destinationMeta?.destinationDisplayName ?? first.destinationCityName,
      destinationCountry: first.destinationCountry,
      flightCount,
      seatCount,
      passengerCount,
      loadFactor: seatCount ? Math.round((passengerCount / seatCount) * 1000) / 10 : 0,
      inboundPassengerCount,
      outboundPassengerCount,
      dataSourceLabel: `民航局 ${month} 按航點及航空公司統計（航運四雄）`,
      airlineRankings,
      coordinates: {
        origin: origin.coordinates,
        destination,
      },
    }]
  })
}

const defaultFilters: RouteFilters = {
  month: latestMonth,
  originAirportCode: 'TPE',
  searchTerm: '',
  airlineName: '全部航空公司',
  destinationCountry: '全部國家 / 地區',
  viewMetric: 'passengers',
}

export const useRouteStore = defineStore('route-store', () => {
  const filters = ref<RouteFilters>({ ...defaultFilters })
  const selectedRouteId = ref<string>('')
  const hoveredRouteId = ref<string>('')
  const focusedRouteId = ref<string>('')
  const detailPanelOpen = ref(false)

  const routes = computed(() => buildRoutesForMonth(filters.value.month))

  const airlines = computed(() => [
    '全部航空公司',
    ...Array.from(new Set(routes.value.flatMap((route) => route.airlineRankings.map((a) => a.airlineName)))),
  ])

  const countries = computed(() => [
    '全部國家 / 地區',
    ...Array.from(new Set(routes.value.map((route) => route.destinationCountry))),
  ])

  const filteredRoutes = computed(() => {
    const term = filters.value.searchTerm.trim().toLowerCase()

    return routes.value.filter((route) => {
      const matchesOrigin = route.originAirportCode === filters.value.originAirportCode
      const matchesSearch =
        !term ||
        route.destinationAirportCode.toLowerCase().includes(term) ||
        route.destinationCityName.toLowerCase().includes(term) ||
        route.destinationCountry.toLowerCase().includes(term) ||
        (route.destinationDisplayName ?? '').toLowerCase().includes(term)
      const matchesAirline =
        filters.value.airlineName === '全部航空公司' ||
        route.airlineRankings.some((a) => a.airlineName === filters.value.airlineName)
      const matchesCountry =
        filters.value.destinationCountry === '全部國家 / 地區' ||
        route.destinationCountry === filters.value.destinationCountry

      return matchesOrigin && matchesSearch && matchesAirline && matchesCountry
    })
  })

  // 目前選取航點被篩掉時，自動清除選取狀態。
  watch(filteredRoutes, (newRoutes) => {
    if (selectedRouteId.value && !newRoutes.find((r) => r.id === selectedRouteId.value)) {
      selectedRouteId.value = ''
      detailPanelOpen.value = false
    }
  })

  const selectedRoute = computed<Route | undefined>(() =>
    filteredRoutes.value.find((route) => route.id === selectedRouteId.value),
  )

  // 航空公司比較使用出發地、搜尋與國家篩選，但不套用航空公司篩選。
  const comparisonBaseRoutes = computed(() => {
    const term = filters.value.searchTerm.trim().toLowerCase()

    return routes.value.filter((route) => {
      const matchesOrigin = route.originAirportCode === filters.value.originAirportCode
      const matchesSearch =
        !term ||
        route.destinationAirportCode.toLowerCase().includes(term) ||
        route.destinationCityName.toLowerCase().includes(term) ||
        route.destinationCountry.toLowerCase().includes(term) ||
        (route.destinationDisplayName ?? '').toLowerCase().includes(term)
      const matchesCountry =
        filters.value.destinationCountry === '全部國家 / 地區' ||
        route.destinationCountry === filters.value.destinationCountry

      return matchesOrigin && matchesSearch && matchesCountry
    })
  })

  const airlineStats = computed(() => {
    const grouped = new Map<string, {
      airlineName: string
      airlineCode: string
      routeCount: number
      flightCount: number
      seatCount: number
      passengerCount: number
    }>()

    comparisonBaseRoutes.value.forEach((route) => {
      route.airlineRankings.forEach((airline) => {
        const key = airline.airlineName
        const current = grouped.get(key) ?? {
          airlineName: key,
          airlineCode: airline.airlineCode ?? '',
          routeCount: 0,
          flightCount: 0,
          seatCount: 0,
          passengerCount: 0,
        }
        current.routeCount += 1
        current.flightCount += airline.flightCount
        current.seatCount += airline.seatCount
        current.passengerCount += airline.passengerCount
        grouped.set(key, current)
      })
    })

    return Array.from(grouped.values())
      .map((airline) => ({
        ...airline,
        loadFactor: airline.seatCount ? (airline.passengerCount / airline.seatCount) * 100 : 0,
      }))
      .sort((a, b) => b.passengerCount - a.passengerCount)
  })

  const selectedRouteAirlines = computed<AirlineRouteStats[]>(() => {
    const airlineList = selectedRoute.value?.airlineRankings ?? []
    if (filters.value.airlineName === '全部航空公司') return airlineList
    return airlineList.filter((a) => a.airlineName === filters.value.airlineName)
  })

  const routeStatsForFilter = (route: Route) => {
    if (filters.value.airlineName === '全部航空公司') return route
    const airline = route.airlineRankings.find((item) => item.airlineName === filters.value.airlineName)
    return airline ?? route
  }

  const summary = computed(() => {
    const routeList = filteredRoutes.value
    const statsList = routeList.map(routeStatsForFilter)
    const passengerCount = statsList.reduce((sum, r) => sum + r.passengerCount, 0)
    const flightCount = statsList.reduce((sum, r) => sum + r.flightCount, 0)
    const seatCount = statsList.reduce((sum, r) => sum + r.seatCount, 0)
    const avgLoadFactor = seatCount ? (passengerCount / seatCount) * 100 : 0

    return { routeCount: routeList.length, passengerCount, flightCount, avgLoadFactor }
  })

  const isFilterActive = computed(
    () =>
      filters.value.originAirportCode !== defaultFilters.originAirportCode ||
      filters.value.month !== defaultFilters.month ||
      filters.value.searchTerm !== '' ||
      filters.value.airlineName !== defaultFilters.airlineName ||
      filters.value.destinationCountry !== defaultFilters.destinationCountry,
  )

  const selectRoute = (routeId: string, openPanel = true) => {
    selectedRouteId.value = routeId
    focusedRouteId.value = routeId
    detailPanelOpen.value = openPanel
  }

  const clearSelection = () => {
    selectedRouteId.value = ''
    focusedRouteId.value = ''
    detailPanelOpen.value = false
  }

  const resetFilters = () => {
    filters.value = { ...defaultFilters }
  }

  const setViewMetric = (metric: ViewMetric) => {
    filters.value.viewMetric = metric
  }

  return {
    filters,
    availableMonths,
    airlines,
    countries,
    filteredRoutes,
    selectedRoute,
    selectedRouteId,
    hoveredRouteId,
    focusedRouteId,
    detailPanelOpen,
    summary,
    airlineStats,
    selectedRouteAirlines,
    routeStatsForFilter,
    selectRoute,
    clearSelection,
    resetFilters,
    setViewMetric,
    isFilterActive,
  }
})
