// ── 網站基礎設定（正式上線前統一修改此區） ──────────────────────────
// 切換為正式 domain 時，請同步更新 SITE_BASE。
// 切換為 history mode 時，createWebHashHistory() 改為 createWebHistory() 即可；
// pageUrl() 目前已輸出正式網址格式，不含 hash。

const SITE_BASE = 'https://taiwan-airline-loadfactor-map.example.com'
const SITE_NAME = '台灣航運四雄載客率分析'
const OG_IMAGE  = `${SITE_BASE}/og-image.png`
// 正式上線前請將 og-image.png 換成實際 1200×630 圖片。

// ── 各頁面 SEO 資料（集中維護） ────────────────────────────────────

interface PageMeta {
  title: string
  description: string
  path: string      // Vue Router 路徑，用於產生 canonical / og:url
  image: string
  keywords?: string
}

const PAGE_META: Record<string, PageMeta> = {
  'airline-growth': {
    title:
      '台灣航運四雄載客率分析｜中華航空、長榮航空、星宇航空、台灣虎航',
    description:
      '比較中華航空、長榮航空、星宇航空、台灣虎航的每月載客率、載客人數、飛行架次與航點表現，使用民航局公開資料製作互動式航空數據視覺化。',
    path: '/',
    image: OG_IMAGE,
    keywords:
      '台灣航空, 航運四雄, 載客率, 中華航空, 長榮航空, 星宇航空, 台灣虎航, 民航局, 航線統計, 航點分析, 航空股, 航空公司比較',
  },
  'route-explorer': {
    title:
      '台灣航點探索地圖｜航空公司航線與載客率視覺化',
    description:
      '以互動式地圖探索台灣出發航線，查看各航點載客率、載客人數、飛行架次，以及不同航空公司的航點排名。',
    path: '/routes',
    image: OG_IMAGE,
  },
}

const DEFAULT_META = PAGE_META['airline-growth']

// ── 頁面完整 URL 產生（集中封裝，history/hash 皆可切換） ──────────
// canonical 與 og:url 採用 history mode 格式（不含 '#'），
// 這也是正式部署後的目標網址格式。
// 若專案目前仍停留在 hash router，可改成：
//   return path === '/' ? `${SITE_BASE}/` : `${SITE_BASE}/#${path}`

function pageUrl(path: string): string {
  return path === '/' ? `${SITE_BASE}/` : `${SITE_BASE}${path}`
}

// ── DOM 輔助：確保元素存在後設定屬性 ──────────────────────────────

function setAttr(selector: string, attr: string, value: string) {
  let el = document.querySelector<HTMLElement>(selector)
  if (!el) {
    const tag = selector.startsWith('link') ? 'link' : 'meta'
    el = document.createElement(tag)
    // 讓新建元素能被同一 selector 再次選到
    if (selector.includes('[property=')) {
      el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] ?? '')
    } else if (selector.includes('[name=')) {
      el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] ?? '')
    } else if (selector.includes('[rel=')) {
      el.setAttribute('rel', selector.match(/rel="([^"]+)"/)?.[1] ?? '')
    }
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

// ── 切換路由時更新全部 SEO meta ────────────────────────────────────

export function updatePageMeta(routeName: string | null | undefined) {
  const page: PageMeta = (routeName ? PAGE_META[routeName] : undefined) ?? DEFAULT_META
  const url = pageUrl(page.path)

  document.title = page.title

  // 基本 SEO
  setAttr('meta[name="description"]', 'content', page.description)
  if (page.keywords) {
    setAttr('meta[name="keywords"]', 'content', page.keywords)
  }

  // Canonical
  setAttr('link[rel="canonical"]', 'href', url)

  // Open Graph（完整欄位）
  setAttr('meta[property="og:type"]',        'content', 'website')
  setAttr('meta[property="og:locale"]',      'content', 'zh_TW')
  setAttr('meta[property="og:site_name"]',   'content', SITE_NAME)
  setAttr('meta[property="og:url"]',         'content', url)
  setAttr('meta[property="og:title"]',       'content', page.title)
  setAttr('meta[property="og:description"]', 'content', page.description)
  setAttr('meta[property="og:image"]',       'content', page.image)

  // Twitter Card（完整欄位）
  setAttr('meta[name="twitter:card"]',        'content', 'summary_large_image')
  setAttr('meta[name="twitter:title"]',       'content', page.title)
  setAttr('meta[name="twitter:description"]', 'content', page.description)
  setAttr('meta[name="twitter:image"]',       'content', page.image)
}
