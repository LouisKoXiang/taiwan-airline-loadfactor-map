import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SITE_BASE = 'https://taiwanairlinedata.com'
const DIST_DIR = 'dist'
const OG_IMAGE = `${SITE_BASE}/og-image.svg`

const pages = [
  {
    path: '/routes',
    title: '台灣航空載客率航點地圖｜航空公司航線視覺化',
    description:
      '以互動式地圖探索台灣航空載客率與航點表現，查看台灣出發航線的載客人數、飛行架次，以及不同航空公司的航點排名。',
  },
  {
    path: '/airlines/china-airlines',
    title: '華航載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢華航載客率與中華航空每月航線表現，整理台灣航空載客率、載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '華航載客率, 中華航空載客率, 中華航空航線, 華航航點, 航空股載客率, 民航局載客率',
  },
  {
    path: '/airlines/eva-air',
    title: '長榮航空載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢長榮航空載客率與長榮每月航線表現，整理台灣航空載客率、載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '長榮航空載客率, 長榮載客率, 長榮航空航線, 長榮航點, 航空股載客率, 民航局載客率',
  },
  {
    path: '/airlines/starlux',
    title: '星宇航空載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢星宇航空載客率與星宇每月航線表現，整理台灣航空載客率、載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '星宇航空載客率, 星宇載客率, 星宇航空航線, 星宇航點, 航空股載客率, 民航局載客率',
  },
  {
    path: '/airlines/tigerair-taiwan',
    title: '台灣虎航載客率分析｜台灣航空載客率每月航線表現',
    description:
      '查詢台灣虎航載客率與虎航每月航線表現，整理台灣航空載客率、載客人數、飛行架次、座位數、航點變化與去年同期比較。',
    keywords:
      '台灣虎航載客率, 虎航載客率, 台灣虎航航線, 虎航航點, 低成本航空載客率, 民航局載客率',
  },
]

function escapeAttr(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function pageUrl(path) {
  return `${SITE_BASE}${path}`
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

const template = await readFile(join(DIST_DIR, 'index.html'), 'utf8')

for (const page of pages) {
  const outputPath = join(DIST_DIR, page.path, 'index.html')
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, replaceMeta(template, page))
}
