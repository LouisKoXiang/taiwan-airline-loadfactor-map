export interface AirlineRouteStats {
  rank: number
  airlineName: string
  airlineShortName?: string
  airlineCode?: string
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
  inboundPassengerCount?: number
  outboundPassengerCount?: number
}

export interface Route {
  id: string
  originAirportCode: string
  originCityName: string
  destinationAirportCode: string
  destinationCityName: string
  destinationDisplayName?: string
  destinationCountry: string
  flightCount: number
  seatCount: number
  passengerCount: number
  loadFactor: number
  inboundPassengerCount?: number
  outboundPassengerCount?: number
  dataSourceLabel?: string
  airlineRankings: AirlineRouteStats[]
  coordinates: {
    origin: [number, number]
    destination: [number, number]
  }
}

export type ViewMetric = 'passengers' | 'loadFactor' | 'flightCount'

export interface RouteFilters {
  originAirportCode: string
  searchTerm: string
  airlineName: string
  destinationCountry: string
  viewMetric: ViewMetric
}
