// ── 網站基礎設定 ───────────────────────────────────────────────
// 若改用自訂網域，請同步更新 SITE_BASE。
// 目前使用 Vue Router history mode，canonical / og:url 均不含 hash。

const SITE_BASE = 'https://taiwan-airline-loadfactor.vercel.app'
const SITE_NAME = '台灣航空載客率分析'
const OG_IMAGE  = `${SITE_BASE}/og-image.svg`
// 若改成社群平台相容性更高的 PNG，請同步更新 index.html。

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
      '台灣航空載客率分析｜中華航空、長榮航空、星宇航空、台灣虎航',
    description:
      '台灣航空載客率查詢與比較工具，整理中華航空、長榮航空、星宇航空、台灣虎航的每月載客率、載客人數、飛行架次與航點表現，使用民航局公開資料製作互動式航空數據視覺化。',
    path: '/',
    image: OG_IMAGE,
    keywords:
      '台灣航空載客率, 台灣航空 載客率, 台灣航空, 航運四雄, 載客率, 中華航空載客率, 長榮航空載客率, 星宇航空載客率, 台灣虎航載客率, 民航局, 航線統計, 航點分析, 航空股, 航空公司比較',
  },
  'route-explorer': {
    title:
      '台灣航空載客率航點地圖｜航空公司航線視覺化',
    description:
      '以互動式地圖探索台灣航空載客率與航點表現，查看台灣出發航線的載客人數、飛行架次，以及不同航空公司的航點排名。',
    path: '/routes',
    image: OG_IMAGE,
  },
}

const DEFAULT_META = PAGE_META['airline-growth']

// ── 頁面完整 URL 產生（集中封裝） ───────────────────────────────
// canonical 與 og:url 採用 history mode 格式（不含 '#'）。

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
