import { track } from '@vercel/analytics'

type AnalyticsValue = string | number | boolean | null

function sendEvent(name: string, properties: Record<string, AnalyticsValue>) {
  track(name, {
    source: 'web',
    ...properties,
  })
}

export function trackAirlineSelect(airlineName: string, month: string, fromPath: string) {
  sendEvent('select_airline', {
    airline: airlineName,
    month,
    fromPath,
  })
}

export function trackMonthSelect(month: string, airlineName: string, path: string) {
  sendEvent('select_month', {
    month,
    airline: airlineName,
    path,
  })
}

export function trackAnalysisTab(tab: string, airlineName: string, month: string, path: string) {
  sendEvent('select_analysis_tab', {
    tab,
    airline: airlineName,
    month,
    path,
  })
}
