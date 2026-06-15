import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import routesData from '../data/realRoutes.json'
import type { AirlineRouteStats, Route, RouteFilters, ViewMetric } from '../types/route'

const routes = routesData as Route[]

const defaultFilters: RouteFilters = {
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

  const airlines = computed(() => [
    '全部航空公司',
    ...Array.from(new Set(routes.flatMap((route) => route.airlineRankings.map((a) => a.airlineName)))),
  ])

  const countries = computed(() => [
    '全部國家 / 地區',
    ...Array.from(new Set(routes.map((route) => route.destinationCountry))),
  ])

  const filteredRoutes = computed(() => {
    const term = filters.value.searchTerm.trim().toLowerCase()

    return routes.filter((route) => {
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

    return routes.filter((route) => {
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
