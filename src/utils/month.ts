// ── 民國月份與 URL slug 轉換工具 ──────────────────────────────────

export function monthSortKey(month: string): number {
  const match = month.match(/(\d+)年(\d+)月/)
  if (!match) return 0
  return Number.parseInt(match[1], 10) * 100 + Number.parseInt(match[2], 10)
}

export function sortMonths(months: Iterable<string>): string[] {
  return [...months].sort((a, b) => monthSortKey(a) - monthSortKey(b))
}

export function monthToSlug(month: string): string {
  const match = month.match(/(\d+)年(\d+)月/)
  if (!match) return ''
  return `${Number.parseInt(match[1], 10)}-${Number.parseInt(match[2], 10)}`
}

export function slugToMonth(slug: string | string[] | undefined): string {
  const raw = Array.isArray(slug) ? slug[0] : slug
  const match = raw?.match(/^(\d+)-(\d{1,2})$/)
  if (!match) return ''
  return `${Number.parseInt(match[1], 10)}年${Number.parseInt(match[2], 10)}月`
}

export function formatMonthForTitle(month: string): string {
  return month.replace(/(\d+)年(\d+)月/, '$1年$2月')
}

export function formatMonthForDisplay(month: string): string {
  return month.replace(/(\d+)年(\d+)月/, '$1 年 $2 月')
}
