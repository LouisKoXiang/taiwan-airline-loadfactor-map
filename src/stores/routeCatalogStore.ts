import { computed } from 'vue'
import { defineStore } from 'pinia'
import rawData from '../data/monthlyAirlineRoutes.json'
import type { MonthlyAirlineRouteStat, AirlineName } from '../types/airline'
import { AIRLINE_META, FOUR_AIRLINES } from '../types/airline'
import { sortMonths } from '../utils/month'

const allRecords = rawData as MonthlyAirlineRouteStat[]

// ── Module-level indexes ───────────────────────────────────────────────────
const byRouteCode = new Map<string, MonthlyAirlineRouteStat[]>()
const byRouteMonth = new Map<string, MonthlyAirlineRouteStat[]>() // key: "routeCode|month"

for (const r of allRecords) {
  const routeKey = `${r.originAirportCode}-${r.destinationAirportCode}`
  if (!byRouteCode.has(routeKey)) byRouteCode.set(routeKey, [])
  byRouteCode.get(routeKey)!.push(r)

  const rmKey = `${routeKey}|${r.month}`
  if (!byRouteMonth.has(rmKey)) byRouteMonth.set(rmKey, [])
  byRouteMonth.get(rmKey)!.push(r)
}

const _allSortedMonths = sortMonths(new Set(allRecords.map(r => r.month)))
const _globalLatestMonth = _allSortedMonths[_allSortedMonths.length - 1]

function priorYearMonth(month: string): string {
  return month.replace(/^(\d+)(年\d+月)$/, (_, yr, rest) => `${parseInt(yr) - 1}${rest}`)
}

// ── Sub-region mapping ─────────────────────────────────────────────────────

/** European countries grouped under the virtual "歐洲" display country */
const EUROPE_COUNTRIES = new Set(['英國', '法國', '荷蘭', '德國', '奧地利', '捷克', '義大利'])

/**
 * Sub-region definitions per display-country.
 * Airports listed in spec order; only those present in the data are shown.
 * "歐洲" is a virtual country that aggregates all European countries.
 */
const SUBREGION_MAP: Record<string, { region: string; airports: string[] }[]> = {
  '日本': [
    { region: '北海道', airports: ['CTS', 'HKD', 'AKJ'] },
    { region: '東北',   airports: ['AOJ', 'SDJ', 'AXT', 'HNA', 'FKS'] },
    { region: '關東',   airports: ['NRT', 'HND', 'IBR'] },
    { region: '中部',   airports: ['NGO', 'KMQ', 'KIJ', 'FSZ', 'TOY'] },
    { region: '關西',   airports: ['KIX', 'UKB'] },
    { region: '中國/四國', airports: ['OKJ', 'HIJ', 'YGJ', 'TAK', 'KCZ', 'MYJ'] },
    { region: '九州',   airports: ['FUK', 'KMJ', 'KOJ', 'KMI', 'OIT', 'HSG'] },
    { region: '沖繩',   airports: ['OKA', 'ISG', 'MMY'] },
  ],
  '美國': [
    { region: '西岸',   airports: ['LAX', 'SFO', 'SEA', 'ONT', 'PHX'] },
    { region: '東岸',   airports: ['JFK', 'IAD'] },
    { region: '中南部', airports: ['DFW', 'IAH'] },
    { region: '中西部', airports: ['ORD'] },
  ],
  '歐洲': [
    { region: '西歐', airports: ['LHR', 'CDG', 'AMS'] },
    { region: '中歐', airports: ['FRA', 'MUC', 'VIE', 'PRG'] },
    { region: '南歐', airports: ['FCO', 'MXP'] },
  ],
  '韓國': [
    { region: '首都圈', airports: ['ICN', 'GMP'] },
    { region: '南部',   airports: ['PUS', 'CJU', 'TAE', 'CJJ'] },
  ],
  '中國': [
    { region: '華北', airports: ['PEK', 'TSN', 'TAO', 'TNA'] },
    { region: '華東', airports: ['PVG', 'SHA', 'HGH', 'NKG', 'WNZ', 'NGB', 'FOC', 'XMN'] },
    { region: '華南', airports: ['CAN', 'SZX', 'HAK', 'SYX'] },
    { region: '華中', airports: ['WUH', 'CGO', 'CSX'] },
    { region: '西南', airports: ['CTU', 'TFU', 'CKG', 'KMG'] },
    { region: '東北', airports: ['SHE', 'DLC', 'HRB'] },
  ],
}

/** IATA code → sub-region name (module-level O(1) lookup) */
const _airportToRegion = new Map<string, string>()
for (const regions of Object.values(SUBREGION_MAP)) {
  for (const { region, airports } of regions) {
    for (const code of airports) {
      _airportToRegion.set(code, region)
    }
  }
}

/**
 * Returns the sub-region name for a destination airport, or null if none defined.
 * e.g. getDestinationRegion('FUK') → '九州', getDestinationRegion('SIN') → null
 */
export function getDestinationRegion(_country: string, airportCode: string): string | null {
  return _airportToRegion.get(airportCode) ?? null
}

/**
 * Maps raw destinationCountry to the display country shown in the UI.
 * European countries are grouped under the virtual "歐洲" entry.
 */
function getDisplayCountry(country: string): string {
  return EUROPE_COUNTRIES.has(country) ? '歐洲' : country
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface RouteCatalogItem {
  routeCode: string
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  /** Raw country value from data (e.g. '英國', '法國') */
  destinationCountry: string
  /** UI display country; European countries are mapped to '歐洲' */
  displayCountry: string
  /** Sub-region name, e.g. '九州', '西歐', '華南'; null when not classified */
  destinationRegion: string | null
  latestMonth: string
  activeAirlines: AirlineName[]
  airlineCodes: string[]
  passengerCount: number
  flightCount: number
  seatCount: number
  /** Weighted load factor: sum(pax)/sum(seats)*100 */
  loadFactor: number
  isNewRoute: boolean
}

export interface RouteFilterState {
  origin: string      // '' = all
  country: string     // '' = all (use displayCountry)
  region: string      // '' = all
  destination: string // '' = all
  query: string
}

export interface RouteSearchSuggestion {
  type: 'route' | 'airport' | 'city' | 'country' | 'region'
  label: string
  subLabel: string
  query: string
  routeCode?: string
}

// ── Build catalog (module-level, once) ────────────────────────────────────

function buildCatalog(): RouteCatalogItem[] {
  const items: RouteCatalogItem[] = []

  for (const [routeCode, recs] of byRouteCode) {
    const routeMonths = sortMonths(new Set(recs.map(r => r.month)))
    const latestMonth = routeMonths[routeMonths.length - 1]
    const prevMonth = priorYearMonth(latestMonth)

    const latestRecs = byRouteMonth.get(`${routeCode}|${latestMonth}`) ?? []
    if (latestRecs.length === 0) continue

    const prevRecs = byRouteMonth.get(`${routeCode}|${prevMonth}`) ?? []

    const totalPax = latestRecs.reduce((s, r) => s + r.passengerCount, 0)
    const totalSeats = latestRecs.reduce((s, r) => s + r.seatCount, 0)
    const totalFlights = latestRecs.reduce((s, r) => s + r.flightCount, 0)
    const lf = totalSeats > 0 ? Math.round(totalPax / totalSeats * 1000) / 10 : 0

    const sample = recs[0]
    const activeAirlines = FOUR_AIRLINES.filter(a =>
      latestRecs.some(r => r.airlineName === a)
    )
    const airlineCodes = activeAirlines.map(a => AIRLINE_META[a]?.code ?? '')

    const isNewRoute = latestRecs.length > 0 && prevRecs.length === 0

    const displayCountry = getDisplayCountry(sample.destinationCountry)
    const destinationRegion = getDestinationRegion(sample.destinationCountry, sample.destinationAirportCode)

    items.push({
      routeCode,
      originAirportCode: sample.originAirportCode,
      destinationAirportCode: sample.destinationAirportCode,
      destinationCityName: sample.destinationCityName,
      destinationCountry: sample.destinationCountry,
      displayCountry,
      destinationRegion,
      latestMonth,
      activeAirlines,
      airlineCodes,
      passengerCount: totalPax,
      flightCount: totalFlights,
      seatCount: totalSeats,
      loadFactor: lf,
      isNewRoute,
    })
  }

  return items
}

const _catalog = buildCatalog()

// ── Store ─────────────────────────────────────────────────────────────────

export const useRouteCatalogStore = defineStore('routeCatalog', () => {

  const globalLatestMonth = _globalLatestMonth

  const allRouteCatalogItems = computed(() => _catalog)

  // ── Derived filter options ─────────────────────────────────────────────

  const availableOrigins = computed(() => {
    const origins = new Map<string, string>([
      ['TPE', 'TPE 桃園'],
      ['KHH', 'KHH 高雄'],
      ['TSA', 'TSA 松山'],
      ['RMQ', 'RMQ 台中'],
    ])
    const found = new Set(_catalog.map(r => r.originAirportCode))
    return [...origins.entries()]
      .filter(([code]) => found.has(code))
      .map(([code, label]) => ({ code, label }))
  })

  /** Countries in display order (by route count desc), with European countries merged into "歐洲" */
  const availableCountries = computed(() => {
    const counts = new Map<string, number>()
    for (const item of _catalog) {
      counts.set(item.displayCountry, (counts.get(item.displayCountry) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }))
  })

  /**
   * Map from displayCountry → sorted list of destinations.
   * European airports are accessible under the "歐洲" key.
   */
  const destinationsByCountry = computed(() => {
    const map = new Map<string, { code: string; city: string }[]>()
    for (const item of _catalog) {
      const dc = item.displayCountry
      if (!map.has(dc)) map.set(dc, [])
      const list = map.get(dc)!
      if (!list.some(d => d.code === item.destinationAirportCode)) {
        list.push({ code: item.destinationAirportCode, city: item.destinationCityName })
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.city.localeCompare(b.city, 'zh-TW'))
    }
    return map
  })

  /**
   * Map from displayCountry → region groups (only non-empty regions, in spec order).
   * Only countries that have a SUBREGION_MAP entry are included.
   * Airports not present in the catalog are excluded.
   */
  const destinationsByCountryAndRegion = computed(() => {
    const result = new Map<string, { region: string; destinations: { code: string; city: string }[] }[]>()

    for (const [country, regionDefs] of Object.entries(SUBREGION_MAP)) {
      // Build a lookup of airports that exist in the catalog for this display country
      const catalogDests = new Map<string, { code: string; city: string }>()
      for (const item of _catalog) {
        if (item.displayCountry === country) {
          catalogDests.set(item.destinationAirportCode, {
            code: item.destinationAirportCode,
            city: item.destinationCityName,
          })
        }
      }

      const regionGroups: { region: string; destinations: { code: string; city: string }[] }[] = []

      for (const { region, airports } of regionDefs) {
        // Keep spec order; skip airports not in data
        const destinations = airports
          .filter(code => catalogDests.has(code))
          .map(code => catalogDests.get(code)!)

        if (destinations.length > 0) {
          regionGroups.push({ region, destinations })
        }
      }

      if (regionGroups.length > 0) {
        result.set(country, regionGroups)
      }
    }

    return result
  })

  // ── Featured sets ──────────────────────────────────────────────────────

  const latestRouteCatalogItems = computed(() =>
    _catalog.filter(r => r.latestMonth === globalLatestMonth)
  )

  const popularRoutes = computed(() =>
    [...latestRouteCatalogItems.value]
      .sort((a, b) => b.passengerCount - a.passengerCount)
      .slice(0, 12)
  )

  const highLoadFactorRoutes = computed(() =>
    [...latestRouteCatalogItems.value]
      .filter(r => r.flightCount >= 20)
      .sort((a, b) => b.loadFactor - a.loadFactor)
      .slice(0, 10)
  )

  const competitiveRoutes = computed(() =>
    [...latestRouteCatalogItems.value]
      .filter(r => r.activeAirlines.length >= 2)
      .sort((a, b) => b.passengerCount - a.passengerCount)
      .slice(0, 10)
  )

  const exclusiveRoutes = computed(() =>
    [...latestRouteCatalogItems.value]
      .filter(r => r.activeAirlines.length === 1)
      .sort((a, b) => b.passengerCount - a.passengerCount)
      .slice(0, 10)
  )

  const newCurrentRoutes = computed(() =>
    latestRouteCatalogItems.value
      .filter(r => r.isNewRoute)
      .sort((a, b) => b.passengerCount - a.passengerCount)
  )

  const newRouteCatalogItems = computed(() =>
    latestRouteCatalogItems.value
      .filter(r => r.isNewRoute)
      .sort((a, b) => b.passengerCount - a.passengerCount)
  )

  // ── Search + filter ────────────────────────────────────────────────────

  function searchRoutes(
    query: string,
    filters: { origin?: string; country?: string; region?: string; destination?: string },
  ): RouteCatalogItem[] {
    const q = query.trim().toUpperCase()
    const { origin = '', country = '', region = '', destination = '' } = filters

    return _catalog.filter(item => {
      // Origin filter
      if (origin && item.originAirportCode !== origin) return false
      // Country filter (use displayCountry so "歐洲" matches all EU airports)
      if (country && item.displayCountry !== country) return false
      // Region filter
      if (region && item.destinationRegion !== region) return false
      // Destination filter
      if (destination && item.destinationAirportCode !== destination) return false
      // Text query: match across route codes, city, country, display country, region
      if (q) {
        const haystack = [
          item.routeCode,
          item.originAirportCode,
          item.destinationAirportCode,
          item.destinationCityName,
          item.destinationCountry,
          item.displayCountry,
          item.destinationRegion ?? '',
        ].join('|').toUpperCase()
        if (!haystack.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.passengerCount - a.passengerCount)
  }

  function searchSuggestions(query: string): RouteSearchSuggestion[] {
    const q = query.trim().toUpperCase()
    if (q.length === 0) return []

    const suggestions: RouteSearchSuggestion[] = []
    const seen = new Set<string>()

    const add = (item: RouteSearchSuggestion) => {
      const key = `${item.type}:${item.routeCode ?? item.query}:${item.label}`
      if (seen.has(key)) return
      seen.add(key)
      suggestions.push(item)
    }

    const matches = (item: RouteCatalogItem) => [
      item.routeCode,
      item.originAirportCode,
      item.destinationAirportCode,
      item.destinationCityName,
      item.destinationCountry,
      item.displayCountry,
      item.destinationRegion ?? '',
    ].join('|').toUpperCase().includes(q)

    const matchedRoutes = _catalog
      .filter(matches)
      .sort((a, b) => {
        const latestScore = Number(b.latestMonth === globalLatestMonth) - Number(a.latestMonth === globalLatestMonth)
        if (latestScore !== 0) return latestScore
        return b.passengerCount - a.passengerCount
      })

    for (const item of matchedRoutes.slice(0, 5)) {
      add({
        type: 'route',
        label: `${item.originAirportCode} → ${item.destinationAirportCode}`,
        subLabel: `${item.destinationCityName}・${item.displayCountry}${item.destinationRegion ? `・${item.destinationRegion}` : ''}`,
        query: item.routeCode,
        routeCode: item.routeCode,
      })
    }

    for (const item of matchedRoutes) {
      if (suggestions.length >= 8) break
      if (item.destinationAirportCode.toUpperCase().includes(q)) {
        add({
          type: 'airport',
          label: `${item.destinationAirportCode} ${item.destinationCityName}`,
          subLabel: `${item.displayCountry}${item.destinationRegion ? `・${item.destinationRegion}` : ''}`,
          query: item.destinationAirportCode,
        })
      }
      if (suggestions.length >= 8) break
      if (item.destinationCityName.toUpperCase().includes(q)) {
        add({
          type: 'city',
          label: item.destinationCityName,
          subLabel: `${item.displayCountry}${item.destinationRegion ? `・${item.destinationRegion}` : ''}`,
          query: item.destinationCityName,
        })
      }
      if (suggestions.length >= 8) break
      if (item.displayCountry.toUpperCase().includes(q) || item.destinationCountry.toUpperCase().includes(q)) {
        add({
          type: 'country',
          label: item.displayCountry,
          subLabel: item.displayCountry === '歐洲' ? '含英國、法國、荷蘭、德國等航點' : '國家 / 地區',
          query: item.displayCountry,
        })
      }
      if (suggestions.length >= 8) break
      if (item.destinationRegion?.toUpperCase().includes(q)) {
        add({
          type: 'region',
          label: item.destinationRegion,
          subLabel: `${item.displayCountry} 次區域`,
          query: item.destinationRegion,
        })
      }
    }

    return suggestions.slice(0, 8)
  }

  return {
    globalLatestMonth,
    allRouteCatalogItems,
    latestRouteCatalogItems,
    availableOrigins,
    availableCountries,
    destinationsByCountry,
    destinationsByCountryAndRegion,
    popularRoutes,
    highLoadFactorRoutes,
    newRouteCatalogItems,
    competitiveRoutes,
    exclusiveRoutes,
    newCurrentRoutes,
    searchRoutes,
    searchSuggestions,
    getDestinationRegion,
  }
})
