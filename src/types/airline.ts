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

export const AIRLINE_META: Record<AirlineName, { code: string; accent: string }> = {
  中華航空: { code: 'CI', accent: '#1a5dba' },
  長榮航空: { code: 'BR', accent: '#1a7a45' },
  星宇航空: { code: 'JX', accent: '#0e6699' },
  台灣虎航: { code: 'IT', accent: '#d9580a' },
}
