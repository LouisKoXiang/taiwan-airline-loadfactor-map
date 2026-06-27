export interface MonthlyAirlineRouteStat {
  month: string
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  destinationCountry: string
  airlineName: string
  airlineCode?: string
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
  inboundPassengerCount?: number
  outboundPassengerCount?: number
}

export interface AirlineMonthlySummary {
  month: string
  airlineName: string
  routeCount: number
  flightCount: number
  seatCount: number
  passengerCount: number
  avgLoadFactor: number
  momLoadFactorGrowth?: number
  yoyLoadFactorGrowth?: number
}

export interface AirlineRoutePerformance {
  month: string
  airlineName: string
  originAirportCode: string
  destinationAirportCode: string
  destinationCityName: string
  destinationCountry: string
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
  inboundPassengerCount?: number
  outboundPassengerCount?: number
}

export type SortKey = 'loadFactor' | 'passengerCount' | 'flightCount' | 'seatCount'
export type SortDir = 'desc' | 'asc'

export const FOUR_AIRLINES = ['中華航空', '長榮航空', '星宇航空', '台灣虎航'] as const
export type AirlineName = (typeof FOUR_AIRLINES)[number]

// 航司主題色的唯一來源是 src/styles/_variables.scss。
// 這裡透過 CSS 自訂屬性（--airline-*）讀取，fallback 值須與 SCSS 保持一致。
function airlineAccent(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || fallback
}

export const AIRLINE_META: Record<AirlineName, { code: string; readonly accent: string }> = {
  中華航空: { code: 'CI', get accent() { return airlineAccent('--airline-ci', '#161e4d') } },
  長榮航空: { code: 'BR', get accent() { return airlineAccent('--airline-br', '#00a650') } },
  星宇航空: { code: 'JX', get accent() { return airlineAccent('--airline-jx', '#9b6a4c') } },
  台灣虎航: { code: 'IT', get accent() { return airlineAccent('--airline-it', '#f7af1f') } },
}

export type AnalysisTab = 'overview' | 'yoy' | 'changes' | 'opportunities' | 'details'

export const AIRLINE_SLUG: Record<AirlineName, string> = {
  '中華航空': 'china-airlines',
  '長榮航空': 'eva-air',
  '星宇航空': 'starlux',
  '台灣虎航': 'tigerair-taiwan',
}

export const SLUG_TO_AIRLINE: Record<string, AirlineName> = {
  'china-airlines': '中華航空',
  'eva-air': '長榮航空',
  'starlux': '星宇航空',
  'tigerair-taiwan': '台灣虎航',
}
