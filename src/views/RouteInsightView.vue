<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteInsightStore, normalizeRouteCode } from '../stores/routeInsightStore'
import MultiLineTrendChart from '../components/overview/MultiLineTrendChart.vue'
import RouteMonthMatrix from '../components/route/RouteMonthMatrix.vue'
import ShareButton from '../components/ShareButton.vue'

const vueRoute = useRoute()
const router = useRouter()
const store = useRouteInsightStore()

const routeCode = computed(() => {
  const p = vueRoute.params.routeCode
  return normalizeRouteCode(Array.isArray(p) ? p[0] : p)
})

// Redirect lowercase → uppercase URL (e.g. /routes/tpe-nrt → /routes/TPE-NRT)
watch(
  () => vueRoute.params.routeCode,
  (raw) => {
    const rawStr = Array.isArray(raw) ? raw[0] : raw
    const normalized = normalizeRouteCode(rawStr)
    if (rawStr !== normalized) {
      router.replace(`/routes/${normalized}`)
    }
  },
  { immediate: true },
)

const info = computed(() => store.routeBasicInfo(routeCode.value))
const latestStats = computed(() => store.routeInsight(routeCode.value))
const rankings = computed(() => store.routeAirlineRankings(routeCode.value))
const yoy = computed(() => store.routeYoYComparison(routeCode.value))
const series = computed(() => store.routeMonthlySeries(routeCode.value))
const matrix = computed(() => store.routeMonthMatrix(routeCode.value))
const siteBase = 'https://taiwanairlinedata.com'
const shareUrl = computed(() => `${siteBase}/routes/${routeCode.value}`)
const shareTitle = computed(() => {
  if (!info.value) return `${routeCode.value} 航線載客率分析`
  return `${info.value.originAirportCode}-${info.value.destinationAirportCode} ${info.value.destinationCityName}航線載客率分析`
})
const shareText = computed(() => {
  if (!info.value) return shareTitle.value
  return `${shareTitle.value}\n查看 ${info.value.originAirportCode}→${info.value.destinationAirportCode} 飛往${info.value.destinationCityName}的各航司載客率、旅客數與班次比較。`
})
const shareAccent = computed(() => latestStats.value[0]?.color ?? '#2563eb')

// ── Segmented controls ──────────────────────────────────────────────────────
type RankMetric = 'loadFactor' | 'passengerCount' | 'flightCount'
type TrendMetric = 'lf' | 'pax' | 'flights'

const activeRankMetric = ref<RankMetric>('loadFactor')
const activeTrendMetric = ref<TrendMetric>('lf')

const rankOptions: { value: RankMetric; label: string }[] = [
  { value: 'loadFactor', label: '載客率' },
  { value: 'passengerCount', label: '旅客數' },
  { value: 'flightCount', label: '班次' },
]

const trendOptions: { value: TrendMetric; label: string }[] = [
  { value: 'lf', label: '載客率' },
  { value: 'pax', label: '旅客數' },
  { value: 'flights', label: '班次' },
]

const activeRankList = computed(() => {
  const r = rankings.value
  if (activeRankMetric.value === 'loadFactor') return r.byLoadFactor
  if (activeRankMetric.value === 'passengerCount') return r.byPassengers
  return r.byFlights
})

const activeTrendSeries = computed(() => {
  const s = series.value
  if (activeTrendMetric.value === 'lf') return s.lf
  if (activeTrendMetric.value === 'pax') return s.pax
  return s.flights
})

const activeTrendUnit = computed(() => {
  if (activeTrendMetric.value === 'lf') return '%'
  if (activeTrendMetric.value === 'pax') return ' 人'
  return ' 次'
})

const activeTrendFormat = computed(() => {
  if (activeTrendMetric.value === 'lf') return (v: number) => v.toFixed(1)
  return (v: number) => formatNum(v)
})

const activeTrendTitle = computed(() => {
  if (activeTrendMetric.value === 'lf') return '載客率月趨勢'
  if (activeTrendMetric.value === 'pax') return '旅客數月趨勢'
  return '飛行班次月趨勢'
})

// ── Formatters ───────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))
const formatPct = (n: number | null) =>
  n == null ? '' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
const formatPp = (n: number | null) =>
  n == null ? '' : (n >= 0 ? '+' : '') + n.toFixed(1) + ' pp'

// ── Dynamic SEO ──────────────────────────────────────────────────────────────
watch(
  info,
  (i) => {
    if (!i) return
    const origin = i.originAirportCode
    const dest = i.destinationAirportCode
    const city = i.destinationCityName
    const country = i.destinationCountry

    document.title = `${origin}-${dest} 飛往${city}（${country}）載客率｜四大航空航線比較`

    const desc = `查詢 ${origin}→${dest} 航線載客率、旅客數、飛行班次與四大航空公司每月表現比較，資料來源為民航局「國際及兩岸定期航線班機載客率」。`
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)

    const canonical = `https://taiwanairlinedata.com/routes/${origin}-${dest}`
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
  },
  { immediate: true },
)
</script>

<template>
  <main class="ri-page">
    <!-- Empty state -->
    <div v-if="!info" class="ri-not-found">
      <p>找不到航線「{{ routeCode }}」的資料。</p>
      <button class="ri-back-btn" @click="router.back()">← 返回</button>
    </div>

    <template v-else>
      <!-- ── A. Header ── -->
      <header class="ri-header">
        <div class="ri-header-top">
          <button class="ri-back-btn" @click="router.back()">← 返回</button>
          <ShareButton
            :url="shareUrl"
            :title="shareTitle"
            :text="shareText"
            :accent="shareAccent"
          />
        </div>
        <div class="ri-title-block">
          <h1 class="ri-title">
            <span class="ri-airport">{{ info.originAirportCode }}</span>
            <span class="ri-arrow">→</span>
            <span class="ri-airport">{{ info.destinationAirportCode }}</span>
            <span class="ri-dest">飛往{{ info.destinationCityName }}（{{ info.destinationCountry }}）</span>
          </h1>
          <p class="ri-subtitle">
            最新資料：<strong>{{ info.latestMonth }}</strong>
            ・本月有飛：
            <span
              v-for="s in latestStats"
              :key="s.airlineName"
              class="ri-airline-badge"
              :style="{ '--badge-c': s.color }"
            >{{ s.airlineCode }}</span>
            <span v-if="info.activeAirlines.length === 0" class="ri-no-service">（本月無班次）</span>
          </p>
        </div>
      </header>

      <!-- ── B. Latest month summary ── -->
      <section class="ri-section" v-if="latestStats.length > 0">
        <h2 class="ri-section-title">{{ info.latestMonth }} 各航司摘要</h2>
        <div class="ri-stat-grid">
          <div
            v-for="s in latestStats"
            :key="s.airlineName"
            class="ri-stat-card"
            :style="{ '--ri-accent': s.color }"
          >
            <div class="ri-stat-head">
              <span class="ri-stat-code">{{ s.airlineCode }}</span>
              <span class="ri-stat-name">{{ s.airlineName }}</span>
            </div>
            <div class="ri-kpi-row">
              <div class="ri-kpi-hero">
                <span class="ri-kpi-label">載客率</span>
                <strong class="ri-kpi-val">{{ s.loadFactor.toFixed(1) }}<small>%</small></strong>
              </div>
              <div class="ri-kpi-secondary">
                <div class="ri-kpi-sec-item">
                  <strong class="ri-kpi-sec-val">{{ formatNum(s.passengerCount) }}</strong>
                  <span class="ri-kpi-sec-label">旅客</span>
                </div>
                <div class="ri-kpi-sec-item">
                  <strong class="ri-kpi-sec-val">{{ formatNum(s.flightCount) }}</strong>
                  <span class="ri-kpi-sec-label">班次</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── C. Airline comparison (segmented) ── -->
      <section class="ri-section" v-if="latestStats.length > 0">
        <div class="ri-section-head">
          <h2 class="ri-section-title">{{ info.latestMonth }} 航司比較</h2>
          <div class="ri-seg-ctrl">
            <button
              v-for="opt in rankOptions"
              :key="opt.value"
              class="ri-seg-btn"
              :class="{ 'ri-seg-btn--active': activeRankMetric === opt.value }"
              @click="activeRankMetric = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="ri-ranking-list">
          <div
            v-for="r in activeRankList"
            :key="r.airlineName"
            class="ri-ranking-row"
          >
            <span class="ri-rank-num">{{ r.rank }}</span>
            <span class="ri-rank-dot" :style="{ background: r.color }"></span>
            <span class="ri-rank-name">{{ r.airlineName }}</span>
            <span class="ri-rank-bar-wrap">
              <span
                class="ri-rank-bar"
                :style="{
                  background: r.color,
                  width: activeRankList.length > 0
                    ? (activeRankMetric === 'loadFactor'
                        ? (r.loadFactor / (activeRankList[0]?.loadFactor || 1)) * 100
                        : activeRankMetric === 'passengerCount'
                          ? (r.passengerCount / (activeRankList[0]?.passengerCount || 1)) * 100
                          : (r.flightCount / (activeRankList[0]?.flightCount || 1)) * 100
                      ) + '%'
                    : '0%'
                }"
              ></span>
            </span>
            <span class="ri-rank-val">
              <template v-if="activeRankMetric === 'loadFactor'">{{ r.loadFactor.toFixed(1) }}%</template>
              <template v-else-if="activeRankMetric === 'passengerCount'">{{ formatNum(r.passengerCount) }}</template>
              <template v-else>{{ formatNum(r.flightCount) }}</template>
            </span>
          </div>
        </div>
      </section>

      <!-- ── D. Monthly trend (segmented) ── -->
      <section class="ri-section">
        <div class="ri-section-head">
          <h2 class="ri-section-title">月趨勢</h2>
          <div class="ri-seg-ctrl">
            <button
              v-for="opt in trendOptions"
              :key="opt.value"
              class="ri-seg-btn"
              :class="{ 'ri-seg-btn--active': activeTrendMetric === opt.value }"
              @click="activeTrendMetric = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="ri-chart-wrap">
          <MultiLineTrendChart
            :title="activeTrendTitle"
            :unit="activeTrendUnit"
            :format-value="activeTrendFormat"
            :series="activeTrendSeries"
          />
        </div>
      </section>

      <!-- ── E. YoY comparison ── -->
      <section class="ri-section">
        <div class="ri-section-head ri-section-head--compact">
          <h2 class="ri-section-title">
            年度累積同期比較
            <span class="ri-section-sub">{{ yoy[0]?.currentMonth ?? info.latestMonth }} vs {{ yoy[0]?.previousMonth ?? '去年同期' }}</span>
          </h2>
          <span
            class="ri-info"
            tabindex="0"
            aria-label="年度累積同期比較說明"
          >?
            <span class="ri-info-tip">以此航線最新資料月份為截止點，累積當年 1 月至該月的旅客、座位與班次，並與去年同期間比較；載客率為累積載客人數除以累積座位數。</span>
          </span>
        </div>
        <div class="ri-yoy-table-wrap">
          <table class="ri-yoy-table">
            <thead>
              <tr>
                <th>航司</th>
                <th>載客率</th>
                <th>變化</th>
                <th>旅客數</th>
                <th>變化</th>
                <th>班次</th>
                <th>變化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in yoy" :key="row.airlineName">
                <td class="ri-yoy-airline" data-label="航司">
                  <span class="ri-rank-dot" :style="{ background: row.color }"></span>
                  {{ row.airlineCode }}
                </td>
                <!-- status: new-route or stopped → special row -->
                <template v-if="row.status === 'new-route'">
                  <td data-label="載客率">{{ row.currentLoadFactor?.toFixed(1) ?? '—' }}%</td>
                  <td colspan="5" class="ri-yoy-status ri-yoy-status--new" data-label="狀態">去年同期累積無班次（新增航線）</td>
                </template>
                <template v-else-if="row.status === 'stopped'">
                  <td class="ri-yoy-status ri-yoy-status--stopped" colspan="6" data-label="狀態">今年同期累積無班次（去年同期有飛）</td>
                </template>
                <template v-else-if="row.status === 'no-data'">
                  <td colspan="6" class="ri-yoy-status ri-yoy-status--nodata" data-label="狀態">今年與去年同期均無班次</td>
                </template>
                <template v-else>
                  <td data-label="載客率">{{ row.currentLoadFactor?.toFixed(1) ?? '—' }}%</td>
                  <td
                    data-label="載客率變化"
                    :class="['ri-yoy-delta', row.loadFactorPp != null && row.loadFactorPp >= 0 ? 'ri-yoy-delta--up' : 'ri-yoy-delta--down']"
                  >
                    {{ row.loadFactorPp != null ? formatPp(row.loadFactorPp) : '—' }}
                  </td>
                  <td data-label="旅客數">{{ row.currentPassengerCount != null ? formatNum(row.currentPassengerCount) : '—' }}</td>
                  <td
                    data-label="旅客變化"
                    :class="['ri-yoy-delta', row.passengerPct != null && row.passengerPct >= 0 ? 'ri-yoy-delta--up' : 'ri-yoy-delta--down']"
                  >
                    {{ row.passengerPct != null ? formatPct(row.passengerPct) : '—' }}
                  </td>
                  <td data-label="班次">{{ row.currentFlightCount != null ? formatNum(row.currentFlightCount) : '—' }}</td>
                  <td
                    data-label="班次變化"
                    :class="['ri-yoy-delta', row.flightPct != null && row.flightPct >= 0 ? 'ri-yoy-delta--up' : 'ri-yoy-delta--down']"
                  >
                    {{ row.flightPct != null ? formatPct(row.flightPct) : '—' }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── F. Month matrix ── -->
      <section class="ri-section">
        <h2 class="ri-section-title">航司月份服務矩陣</h2>
        <p class="ri-matrix-note">圓點代表該月有班次，顯示範圍為此航線首次出現至最新資料月份。</p>
        <RouteMonthMatrix :data="matrix" />
      </section>
    </template>
  </main>
</template>

<style scoped lang="scss">
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.ri {
  &-page {
    max-width: $bp-xl;
    margin: 0 auto;
    padding: 28px 20px 64px;
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  &-not-found {
    @include flex-center;
    flex-direction: column;
    gap: $gap-lg;
    padding: 80px 0;
    color: var(--ink-400);
  }

  // ── Back button ────────────────────────────────────────────────────────────
  &-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: 1px solid var(--ink-150, #e5e7eb);
    border-radius: $radius-pill;
    color: var(--ink-500);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 4px 12px 4px 10px;
    margin-bottom: 16px;
    transition: border-color 120ms, color 120ms, background 120ms;

    &:hover {
      border-color: var(--ink-300);
      color: var(--ink-700);
      background: var(--ink-50, #f9fafb);
    }
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  &-header {
    margin-bottom: 36px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--ink-100);
  }

  &-header-top {
    @include flex-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .ri-back-btn {
      margin-bottom: 0;
    }

    @include respond-to(sm) {
      align-items: stretch;

      .share-button {
        min-width: 92px;
      }
    }
  }

  &-title-block {
    min-width: 0;
  }

  &-title {
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    font-weight: 900;
    margin: 0 0 10px;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  &-airport {
    font-family: 'SF Mono', 'Consolas', monospace;
    letter-spacing: 0.01em;
    color: var(--ink-800, #1a1a2e);
  }

  &-arrow {
    color: var(--ink-250, #c0c0c8);
    font-weight: 300;
    font-size: 1.3rem;
  }

  &-dest {
    font-size: clamp(1rem, 2.5vw, 1.15rem);
    font-weight: 600;
    color: var(--ink-500);
    letter-spacing: 0;
  }

  &-subtitle {
    font-size: 0.85rem;
    color: var(--ink-400);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    strong { color: var(--ink-600); }
  }

  // Airline badges in subtitle — show airline brand color
  &-airline-badge {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--badge-c, var(--ink-300)) 10%, #fff);
    color: var(--badge-c, var(--ink-600));
    border: 1.5px solid color-mix(in srgb, var(--badge-c, var(--ink-200)) 28%, #fff);
    padding: 2px 7px;
    border-radius: $radius-pill;
  }

  &-no-service {
    color: var(--ink-300);
    font-style: italic;
  }

  // ── Sections ────────────────────────────────────────────────────────────────
  &-section {
    margin-bottom: 44px;
  }

  &-section-head {
    @include flex-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--ink-100);

    &--compact {
      justify-content: flex-start;
      gap: 10px;
    }
  }

  &-section-title {
    font-size: 0.95rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 16px;
    color: var(--ink-500);
    padding-bottom: 12px;
    border-bottom: 2px solid var(--ink-100);

    .ri-section-head & {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
  }

  &-section-sub {
    font-size: 0.82rem;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink-400);
    margin-left: 6px;
  }

  &-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--ink-150, #e5e7eb);
    border-radius: 50%;
    background: #fff;
    color: var(--ink-400);
    font-size: 0.78rem;
    font-weight: 900;
    cursor: help;

    &:hover,
    &:focus-visible {
      color: var(--blue-600, #2563eb);
      border-color: color-mix(in srgb, var(--blue-500, #3b82f6) 35%, #fff);
      outline: none;

      .ri-info-tip {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }
    }
  }

  &-info-tip {
    position: absolute;
    z-index: 20;
    top: calc(100% + 8px);
    right: 0;
    width: min(330px, 82vw);
    padding: 10px 12px;
    border: 1px solid var(--ink-100);
    border-radius: 12px;
    background: #fff;
    color: var(--ink-500);
    box-shadow: 0 16px 36px rgba(24, 74, 120, 0.16);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.55;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 140ms, transform 140ms;
  }

  // ── Segmented control ───────────────────────────────────────────────────────
  &-seg-ctrl {
    display: flex;
    gap: 2px;
    background: var(--ink-150, #e5e7eb);
    border-radius: 8px;
    padding: 2px;
  }

  &-seg-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 6px;
    color: var(--ink-400);
    transition: background 120ms, color 120ms, box-shadow 120ms;

    &--active {
      background: #fff;
      color: var(--ink-700);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    &:not(&--active):hover { color: var(--ink-600); }
  }

  // ── Stat cards ──────────────────────────────────────────────────────────────
  &-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: $gap-md;
  }

  &-stat-card {
    padding: 14px 16px;
    border: 1px solid var(--ink-100);
    border-radius: $radius-lg;
    background: #fff;
    border-top: 3px solid var(--ri-accent, var(--ink-300));
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  &-stat-head {
    @include flex-between;
    margin-bottom: 12px;
    align-items: center;
  }

  &-stat-code {
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ri-accent, var(--ink-400));
  }

  &-stat-name {
    font-size: 0.72rem;
    color: var(--ink-400);
    font-weight: 500;
  }

  // Hero LF + secondary row in stat card
  &-kpi-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &-kpi-hero {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ink-100);
  }

  &-kpi-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-400);
  }

  &-kpi-val {
    font-size: 1.7rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--ri-accent, var(--ink-700));

    small {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--ink-400);
    }
  }

  &-kpi-secondary {
    display: flex;
    gap: 10px;
  }

  &-kpi-sec-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
  }

  &-kpi-sec-val {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-600);
  }

  &-kpi-sec-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-300);
  }

  // ── Rankings ────────────────────────────────────────────────────────────────
  &-ranking-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &-ranking-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--ink-50, #f9fafb);
    border-radius: $radius-md;
    border: 1px solid var(--ink-100);
    transition: background 100ms;

    &:hover { background: var(--ink-100); }
  }

  &-rank-num {
    font-size: 0.7rem;
    font-weight: 900;
    color: var(--ink-250, #c8c8d0);
    width: 16px;
    flex-shrink: 0;
    text-align: center;
  }

  &-rank-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  &-rank-name {
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 76px;
    color: var(--ink-700);
  }

  &-rank-bar-wrap {
    flex: 1;
    height: 12px;
    background: var(--ink-100);
    border-radius: 6px;
    overflow: hidden;
  }

  &-rank-bar {
    display: block;
    height: 100%;
    border-radius: 6px;
    opacity: 0.8;
    transition: width 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  &-rank-val {
    font-size: 0.875rem;
    font-weight: 800;
    min-width: 72px;
    text-align: right;
    color: var(--ink-700);
  }

  // ── Trend chart ─────────────────────────────────────────────────────────────
  &-chart-wrap {
    padding: 16px 18px;
    border: 1px solid var(--ink-100);
    border-radius: $radius-lg;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  // ── YoY table ───────────────────────────────────────────────────────────────
  &-yoy-table-wrap {
    overflow-x: auto;
    border-radius: $radius-lg;
    border: 1px solid var(--ink-100);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  &-yoy-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    th {
      background: var(--ink-50, #f9fafb);
      padding: 9px 14px;
      text-align: right;
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-400);
      border-bottom: 1px solid var(--ink-100);
      white-space: nowrap;
      &:first-child { text-align: left; }
    }

    td {
      padding: 9px 14px;
      text-align: right;
      border-bottom: 1px solid var(--ink-100);
      white-space: nowrap;
    }

    // Zebra striping
    tbody tr:nth-child(even) td {
      background: var(--ink-50, #f9fafb);
    }

    tr:last-child td { border-bottom: none; }
  }

  &-yoy-airline {
    text-align: left !important;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  &-yoy-delta {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    &--up { color: #16a34a; }
    &--down { color: #dc2626; }
  }

  &-yoy-status {
    font-size: 0.8rem;
    font-style: italic;
    text-align: left !important;

    &--new { color: #2563eb; }
    &--stopped { color: var(--ink-400); }
    &--nodata { color: var(--ink-300); }
  }

  @media (max-width: 640px) {
    &-yoy-table-wrap {
      overflow-x: hidden;
      border: 0;
      box-shadow: none;
      border-radius: 0;
      background: transparent;
    }

    &-yoy-table,
    &-yoy-table thead,
    &-yoy-table tbody,
    &-yoy-table tr,
    &-yoy-table th,
    &-yoy-table td {
      display: block;
    }

    &-yoy-table {
      border-collapse: separate;
      border-spacing: 0;
      background: transparent;

      thead {
        display: none;
      }

      tbody {
        display: grid;
        gap: 10px;
      }

      tr {
        overflow: hidden;
        border: 1px solid var(--ink-100);
        border-radius: $radius-md;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      td {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 42px;
        padding: 9px 12px;
        border-bottom: 1px solid var(--ink-50);
        text-align: right;
        white-space: normal;

        &::before {
          content: attr(data-label);
          color: var(--ink-400);
          font-size: 0.74rem;
          font-weight: 800;
          text-align: left;
          white-space: nowrap;
        }
      }

      tbody tr:nth-child(even) td {
        background: transparent;
      }

      td:last-child {
        border-bottom: 0;
      }
    }

    &-yoy-airline {
      justify-content: flex-end;
      background: var(--ink-50, #f9fafb) !important;
      font-weight: 900;

      &::before {
        margin-right: auto;
      }
    }

    &-yoy-status {
      justify-content: space-between;
      text-align: right !important;
      line-height: 1.5;
    }
  }

  // ── Matrix ──────────────────────────────────────────────────────────────────
  &-matrix-note {
    font-size: 0.8rem;
    color: var(--ink-400);
    margin: -8px 0 12px;
    line-height: 1.5;
  }
}
</style>
