import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SITE_BASE = 'https://taiwanairlinedata.com'
const DIST_DIR = 'dist'
const DATA_FILE = 'src/data/monthlyAirlineRoutes.json'
const OG_IMAGE = `${SITE_BASE}/og-image.svg`

const AIRLINES = [
  {
    slug: 'china-airlines',
    name: '中華航空',
    shortName: '華航',
    title: '華航載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢華航載客率與中華航空每月航線表現，依據民航局「國際及兩岸定期航線班機載客率」公開資料整理載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '華航載客率, 中華航空載客率, 中華航空航線, 華航航點, 航空股載客率, 民航局載客率',
  },
  {
    slug: 'eva-air',
    name: '長榮航空',
    shortName: '長榮',
    title: '長榮航空載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢長榮航空載客率與長榮每月航線表現，依據民航局「國際及兩岸定期航線班機載客率」公開資料整理載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '長榮航空載客率, 長榮載客率, 長榮航空航線, 長榮航點, 航空股載客率, 民航局載客率',
  },
  {
    slug: 'starlux',
    name: '星宇航空',
    shortName: '星宇',
    title: '星宇航空載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢星宇航空載客率與星宇每月航線表現，依據民航局「國際及兩岸定期航線班機載客率」公開資料整理載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '星宇航空載客率, 星宇載客率, 星宇航空航線, 星宇航點, 航空股載客率, 民航局載客率',
  },
  {
    slug: 'tigerair-taiwan',
    name: '台灣虎航',
    shortName: '虎航',
    title: '台灣虎航載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢台灣虎航載客率與虎航每月航線表現，依據民航局「國際及兩岸定期航線班機載客率」公開資料整理載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '台灣虎航載客率, 虎航載客率, 台灣虎航航線, 虎航航點, 低成本航空載客率, 民航局載客率',
  },
]

const basePages = [
  {
    path: '/routes',
    title: '台灣航空載客率航點地圖｜航空公司航線視覺化',
    description:
      '以互動式地圖探索台灣航空載客率與航點表現，依據民航局「國際及兩岸定期航線班機載客率」公開資料查看台灣出發航線的載客人數、飛行架次與航點排名。',
  },
  ...AIRLINES.map((airline) => ({
    path: `/airlines/${airline.slug}`,
    title: airline.title,
    description: airline.description,
    keywords: airline.keywords,
  })),
]

function escapeAttr(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function monthSortKey(month) {
  const match = month.match(/(\d+)年(\d+)月/)
  if (!match) return 0
  return Number.parseInt(match[1], 10) * 100 + Number.parseInt(match[2], 10)
}

function monthToSlug(month) {
  const match = month.match(/(\d+)年(\d+)月/)
  if (!match) return ''
  return `${Number.parseInt(match[1], 10)}-${Number.parseInt(match[2], 10)}`
}

function formatMonthForTitle(month) {
  return month.replace(/(\d+)年(\d+)月/, '$1年$2月')
}

function pageUrl(path) {
  return path === '/' ? `${SITE_BASE}/` : `${SITE_BASE}${path}`
}

function buildMonthlyPages(records) {
  const months = [...new Set(records.map((r) => r.month))]
    .sort((a, b) => monthSortKey(a) - monthSortKey(b))

  return months.flatMap((month) => {
    const monthSlug = monthToSlug(month)
    const titleMonth = formatMonthForTitle(month)
    if (!monthSlug) return []

    return AIRLINES.map((airline) => ({
      path: `/airlines/${airline.slug}/${monthSlug}`,
      title: `${titleMonth}${airline.name}載客率｜${airline.shortName}航線、航點、載客人數`,
      description:
        `查詢 ${titleMonth}${airline.name}載客率，整理${airline.name}各航線載客率、載客人數、飛行架次、座位數與航點變化，資料來源為民航局「國際及兩岸定期航線班機載客率」公開資料。`,
      keywords: `${titleMonth}${airline.name}載客率, ${airline.keywords}`,
    }))
  })
}

function replaceMeta(html, page) {
  const url = pageUrl(page.path)
  let next = html

  next = next.replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(page.title)}</title>`)
  next = next.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
  )
  if (page.keywords) {
    next = next.replace(
      /<meta name="keywords" content="[^"]*" \/>/,
      `<meta name="keywords" content="${escapeAttr(page.keywords)}" />`,
    )
  }
  next = next.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`,
  )
  next = next.replace(
    /<meta property="og:url"\s+content="[^"]*" \/>/,
    `<meta property="og:url"         content="${url}" />`,
  )
  next = next.replace(
    /<meta property="og:title"\s+content="[^"]*" \/>/,
    `<meta property="og:title"       content="${escapeAttr(page.title)}" />`,
  )
  next = next.replace(
    /<meta property="og:description"\s+content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
  )
  next = next.replace(
    /<meta property="og:image"\s+content="[^"]*" \/>/,
    `<meta property="og:image"       content="${OG_IMAGE}" />`,
  )
  next = next.replace(
    /<meta name="twitter:title"\s+content="[^"]*" \/>/,
    `<meta name="twitter:title"       content="${escapeAttr(page.title)}" />`,
  )
  next = next.replace(
    /<meta name="twitter:description"\s+content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
  )
  next = next.replace(
    /<meta name="twitter:image"\s+content="[^"]*" \/>/,
    `<meta name="twitter:image"       content="${OG_IMAGE}" />`,
  )

  return next
}

function sitemapXml(pages) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { path: '/', priority: '1.0' },
    ...pages.map((page) => ({
      path: page.path,
      priority: page.path.split('/').length > 3 ? '0.7' : '0.8',
    })),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${pageUrl(url.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
}

const template = await readFile(join(DIST_DIR, 'index.html'), 'utf8')
const records = JSON.parse(await readFile(DATA_FILE, 'utf8'))
const pages = [...basePages, ...buildMonthlyPages(records)]

for (const page of pages) {
  const outputPath = join(DIST_DIR, page.path, 'index.html')
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, replaceMeta(template, page))
}

await writeFile(join(DIST_DIR, 'sitemap.xml'), sitemapXml(pages))
