# 台灣航空視覺化 · Taiwan Aviation Explorer

互動式全球航線視覺化工具，以民航局公開資料呈現從台灣出發的航線規模、載客率與航空公司布局。

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7-f9a03c?logo=d3dotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)

## 頁面功能

### 航運四雄分析 `/`（首頁）
- **航空公司切換** — 中華航空 / 長榮航空 / 星宇航空 / 台灣虎航，逐一分析各自表現
- **KPI 卡片** — 航線數、飛行架次、座位數、載客人數、平均載客率、月增長率（MoM）
- **D3 橫向長條圖** — 各航點載客率、載客人數、飛行架次
- **D3 折線趨勢圖** — 已匯入多月份時顯示月均載客率走勢，單月時顯示空狀態
- **可排序航點明細表** — 含入境/出境人數

### 台灣航點探索地圖 `/routes`
- **全球地圖** — D3 Natural Earth 投影，顯示從 TPE / TSA / KHH / RMQ 出發的所有航線弧線
- **航線選取** — 點擊地圖弧線或左側卡片即可聚焦航線，非相關航線自動淡出
- **多維篩選** — 依出發機場、目的地、航空公司、國家/地區、視角指標（載客人數／載客率／飛行架次）篩選
- **航空公司比拼** — 跨航點彙總各航空公司的規模與載客率排名
- **航點詳情** — 地圖右側浮層顯示飛行架次、座位數、入境/出境旅客比較圖

> `/airline-battle` 為舊網址相容 redirect，自動導向首頁 `/`。

## 資料來源

民航局每月公開 ODS 統計表（36 系列工作表）

| 工作表 | 出發機場 | 資料類型 |
|--------|----------|----------|
| 36-1   | TPE 桃園  | 航點 × 航空公司（含入出境） |
| 36-2   | KHH 高雄  | 同上 |
| 36-3   | TSA 松山  | 同上 |
| 36-4   | RMQ 台中  | 同上 |

解析後分別存於：
- `src/data/realRoutes.json` — 117 條航線（全航空公司，供地圖頁用）
- `src/data/monthlyAirlineRoutes.json` — 供分析頁用的多月份資料（四雄）

### 已匯入資料

目前收錄月份與筆數以 `src/data/*.ods` 及 `src/data/monthlyAirlineRoutes.json` 為準。
ODS 檔案新增後執行 parser 即自動更新，不需手動修改程式碼。

## 資料更新方式

```bash
# 新增或更新單一月份
mise exec -- python scripts/parseOds.py src/data/116年1月_xxxx_xxxx.ods

# 全量重建（重新解析 src/data/ 下所有 ODS）
mise exec -- python scripts/parseOds.py --all
```

> **全量重建**：直接清空並重寫整份 JSON，適合初次建立或需要修正所有月份時使用。
>
> **單檔更新**：只移除同月份舊資料，再寫入新解析結果，不影響其他月份。

## 技術架構

| 層級 | 技術 |
|------|------|
| UI 框架 | Vue 3 (`<script setup>`) + Vue Router 4 |
| 狀態管理 | Pinia |
| 地圖與資料視覺化 | D3 v7、TopoJSON、world-atlas |
| 語言 | TypeScript 5 |
| 建置工具 | Vite 6 |
| Runtime 管理 | mise（`.mise.toml`） |

```
src/
├── composables/
│   └── useArcPath.ts              # 大圓弧線路徑計算
├── router/
│   └── index.ts                   # Vue Router（雜湊路由模式）
├── views/
│   ├── AirlineGrowthView.vue      # 航運四雄分析頁（首頁 /）
│   └── RouteExplorerView.vue      # 航點探索地圖頁（/routes）
├── components/
│   ├── NavBar.vue                 # 全站導覽列
│   ├── airline/
│   │   ├── MetricBarChart.vue     # D3 橫向長條圖（可重用）
│   │   └── TrendChart.vue         # D3 折線趨勢圖
│   ├── RouteMap.vue               # D3 地圖（重建與選取更新分離）
│   ├── RouteFilter.vue            # 篩選列
│   ├── RouteCard.vue              # 航點卡片
│   ├── RouteDetailPanel.vue       # 地圖右側詳情浮層
│   ├── AirlineComparison.vue      # 航司比拼列表
│   ├── AirlineRouteItem.vue       # 單一航司排名列
│   └── PassengerCompareChart.vue
├── stores/
│   ├── routeStore.ts              # 地圖頁 Pinia 狀態
│   └── airlineGrowthStore.ts      # 分析頁 Pinia 狀態
├── utils/
│   ├── routeMetrics.ts
│   └── seo.ts                     # 路由切換時更新 title / meta / OG / Twitter
├── data/
│   ├── realRoutes.json            # 117 條航線（地圖頁）
│   └── monthlyAirlineRoutes.json  # 四雄多月份資料（分析頁）
├── types/
│   ├── route.ts
│   └── airline.ts
scripts/
└── parseOds.py                    # ODS → JSON 解析器（支援多月份追加）
```

## 路由說明

| 路徑 | 說明 |
|------|------|
| `/` | 航運四雄分析（首頁） |
| `/routes` | 台灣航點探索地圖 |
| `/airline-battle` | redirect → `/`（舊網址相容） |

> **History mode 注意事項**
>
> 目前使用 `createWebHashHistory()`，實際網址為 `/#/routes` 格式。
> SEO meta（canonical / og:url）已採 history-mode 格式（`/routes`），為未來切換預留。
>
> 若要切換為 history mode：
> 1. 將 `src/router/index.ts` 中的 `createWebHashHistory()` 改為 `createWebHistory()`
> 2. 靜態部署需設定 fallback（所有路徑導向 `index.html`）：
>    - **Nginx**：`try_files $uri $uri/ /index.html;`
>    - **Netlify**：在 `public/_redirects` 加入 `/* /index.html 200`
>    - **Vercel**：在 `vercel.json` 設定 rewrites
>    - **GitHub Pages**：需搭配 404.html redirect trick 或使用 hash mode

## SEO

- `index.html`：靜態 title / description / og / twitter / JSON-LD（預設首頁內容）
- `src/utils/seo.ts`：路由切換後動態更新所有 meta，canonical / og:url 依路徑產生
- 正式上線前須更新 `SITE_BASE` 與 `og-image.png`（均在 `seo.ts` 集中定義）

## 本地開發

```bash
mise install        # 安裝 .mise.toml 指定的 node / python 版本
npm install
npm run dev         # http://localhost:5173
npm run build       # 型別檢查 + 打包
npm run preview     # 預覽打包結果
```

## 授權

資料版權歸中華民國交通部民用航空局所有，僅供非商業展示用途。
