import type * as d3 from 'd3'

interface RouteCoords {
  coordinates: {
    origin: [number, number]
    destination: [number, number]
  }
}

export const getArcPath = (route: RouteCoords, projection: d3.GeoProjection): string => {
  const start = projection(route.coordinates.origin)
  const end = projection(route.coordinates.destination)
  if (!start || !end) return ''

  const [x1, y1] = start
  const [x2, y2] = end
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 2) return `M ${x1} ${y1} L ${x2} ${y2}`

  // 二次貝茲曲線：控制點取在方向向量的左側垂線上，
  // 並依方向翻轉，讓弧線固定朝畫面上方（地圖北側）彎曲。
  const curve = Math.min(130, Math.max(28, dist * 0.22))
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const nx = -dy / dist
  const ny = dx / dist
  const mult = ny > 0 ? -1 : 1

  return `M ${x1} ${y1} Q ${mx + nx * curve * mult} ${my + ny * curve * mult} ${x2} ${y2}`
}
