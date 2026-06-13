import type { Route, ViewMetric } from '../types/route'

export const formatNumber = (value: number) => new Intl.NumberFormat('zh-TW').format(Math.round(value))

export const getLoadLevel = (loadFactor: number) => {
  if (loadFactor >= 85) return 'high'
  if (loadFactor >= 75) return 'medium'
  return 'low'
}

export const getLoadColor = (loadFactor: number) => {
  const level = getLoadLevel(loadFactor)
  if (level === 'high') return '#1f8fff'
  if (level === 'medium') return '#4ed4ff'
  return '#9fb3c8'
}

export const getPopularity = (route: Route) => {
  if (route.passengerCount >= 60000 || route.flightCount >= 280) return '超熱門'
  if (route.passengerCount >= 35000 || route.flightCount >= 160) return '熱門'
  return '探索中'
}

export const getMetricValue = (route: Route, metric: ViewMetric) => {
  if (metric === 'loadFactor') return route.loadFactor
  if (metric === 'flightCount') return route.flightCount
  return route.passengerCount
}

export const getMetricLabel = (metric: ViewMetric) => {
  if (metric === 'loadFactor') return '依載客率'
  if (metric === 'flightCount') return '依飛行架次'
  return '依載客人數'
}

export const getRegionClass = (country: string): string => {
  if (['日本', '韓國', '中國', '香港', '澳門'].includes(country)) return 'region-east-asia'
  if (['泰國', '越南', '新加坡', '馬來西亞', '菲律賓', '印尼', '柬埔寨', '緬甸'].includes(country)) return 'region-sea'
  if (['英國', '法國', '德國', '荷蘭', '義大利', '西班牙', '瑞士', '奧地利', '芬蘭', '土耳其', '俄羅斯'].includes(country)) return 'region-europe'
  if (['美國', '加拿大'].includes(country)) return 'region-americas'
  if (['澳洲', '紐西蘭'].includes(country)) return 'region-oceania'
  if (['阿聯酋', '卡達', '印度', '斯里蘭卡', '巴林'].includes(country)) return 'region-mideast'
  return 'region-default'
}
