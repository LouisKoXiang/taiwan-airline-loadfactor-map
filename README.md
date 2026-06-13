# 台灣航點探索地圖 · Taiwan Airline Route Explorer

互動式全球航線視覺化工具，以民航局公開資料呈現從台灣出發的航線規模、載客率與航空公司布局。

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7-f9a03c?logo=d3dotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)

## 功能

- **全球地圖** — D3 Natural Earth 投影，顯示從 TPE / TSA / KHH / RMQ 出發的所有航線弧線
- **航線選取** — 點擊地圖弧線或左側卡片即可聚焦航線，非相關航線自動淡出
- **多維篩選** — 依出發機場、目的地、航空公司、國家/地區、視角指標（載客人數／載客率／飛行架次）篩選
- **航空公司比拼** — 跨航點彙總各航空公司的規模與載客率排名
- **航點詳情** — 地圖右側浮層顯示飛行架次、座位數、入境/出境旅客比較圖
- **地圖互動** — 縮放、拖曳、選取自動飛入視角、一鍵重設視角

## 資料來源

民航局 ODS「115年4月\_1752\_144902.ods」

- 解析表 36-1 ～ 36-4，對應 TPE / KHH / TSA / RMQ
- 資料粒度：航點 × 航空公司（含飛行架次、座位數、載客人數、入境/出境分流）
- 解析後存於 `src/data/realRoutes.json`，共 117 條航線

## 技術架構

| 層級 | 技術 |
|------|------|
| UI 框架 | Vue 3 (`<script setup>`) |
| 狀態管理 | Pinia |
| 地圖與資料視覺化 | D3 v7、TopoJSON、world-atlas |
| 語言 | TypeScript 5 |
| 建置工具 | Vite 6 |

```
src/
├── composables/
│   └── useArcPath.ts        # 大圓弧線路徑計算（永遠向北彎曲）
├── components/
│   ├── RouteMap.vue          # D3 地圖主體（render / updateSelection 分離）
│   ├── RouteFilter.vue       # 篩選列（機場、目的地、航司、國家、視角）
│   ├── RouteCard.vue         # 航點卡片
│   ├── RouteDetailPanel.vue  # 地圖右側詳情浮層
│   ├── AirlineComparison.vue # 航空公司橫向比拼
│   ├── AirlineRouteItem.vue  # 單一航司排名列
│   └── PassengerCompareChart.vue
├── stores/
│   └── routeStore.ts         # Pinia store：篩選、選取、彙總計算
├── data/
│   └── realRoutes.json       # 解析後的航線資料（117 條）
├── types/route.ts
└── utils/routeMetrics.ts
```

## 本地開發

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 型別檢查 + 打包
npm run preview   # 預覽打包結果
```

## 授權

資料版權歸中華民國交通部民用航空局所有，僅供非商業展示用途。
