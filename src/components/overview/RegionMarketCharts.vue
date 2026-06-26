<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RegionMarketStat, RegionKey } from '../../stores/marketOverviewStore'
import { FOUR_AIRLINES, AIRLINE_META } from '../../types/airline'

const props = defineProps<{
  stats: RegionMarketStat[]
}>()

// ─── 常數 ────────────────────────────────────────────────────────────────────
const REGION_KEYS: RegionKey[] = ['japan', 'usa', 'europe']
const REGION_LABELS: Record<RegionKey, string> = {
  japan:  '日本線',
  usa:    '美國線',
  europe: '歐洲線',
}
const REGION_EMOJI: Record<RegionKey, string> = {
  japan:  '🇯🇵',
  usa:    '🇺🇸',
  europe: '🇪🇺',
}

const fmt = new Intl.NumberFormat('zh-TW')
const activeInfo = ref<RegionKey | null>(null)

const REGION_FILTER_INFO: Partial<Record<RegionKey, { title: string; body: string[] }>> = {
  usa: {
    title: '美國線篩選依據',
    body: [
      '目的地國家為「美國」的航線會歸入美國線。',
      '目前不包含關島、加拿大或其他美洲地區航線。',
    ],
  },
  europe: {
    title: '歐洲線篩選依據',
    body: [
      '目的地國家屬於歐洲市場的航線會歸入歐洲線。',
      '目前資料涵蓋英國、法國、德國、義大利、荷蘭、奧地利、捷克等國家；後續若匯入新月份並出現其他歐洲國家，會依規則納入。',
    ],
  },
}

const activeInfoContent = computed(() =>
  activeInfo.value ? REGION_FILTER_INFO[activeInfo.value] : undefined,
)

function openInfo(regionKey: RegionKey) {
  if (REGION_FILTER_INFO[regionKey]) activeInfo.value = regionKey
}

// ─── 指標切換 ─────────────────────────────────────────────────────────────────
type Metric = 'loadFactor' | 'passengerCount' | 'flightCount'
const metric = ref<Metric>('passengerCount')

const METRICS: { key: Metric; label: string }[] = [
  { key: 'passengerCount', label: '載客人數' },
  { key: 'loadFactor',     label: '載客率' },
  { key: 'flightCount',    label: '飛行架次' },
]

// ─── 資料整理 ─────────────────────────────────────────────────────────────────
const statMap = computed(() => {
  const m = new Map<string, RegionMarketStat>()
  for (const s of props.stats) m.set(`${s.regionKey}|${s.airline}`, s)
  return m
})

// 每個區域 × 航空的指標值
function getValue(rk: RegionKey, airline: string, m: Metric): number | null {
  const s = statMap.value.get(`${rk}|${airline}`)
  if (!s) return null
  return s[m]
}

// 全域最大值（跨三個區域，統一 scale 方便比較）
const globalMax = computed(() => {
  let max = 0
  for (const rk of REGION_KEYS) {
    for (const airline of FOUR_AIRLINES) {
      const v = getValue(rk, airline, metric.value)
      if (v !== null && v > max) max = v
    }
  }
  if (metric.value === 'loadFactor') return 100
  if (max === 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / mag) * mag
})

// 每張卡片的 row 資料
const regionCards = computed(() =>
  REGION_KEYS.map((rk) => {
    const rows = FOUR_AIRLINES.map((airline) => {
      const v = getValue(rk, airline, metric.value)
      return {
        airline,
        color: AIRLINE_META[airline].accent,
        value: v,
        pct: v !== null ? Math.min(100, (v / globalMax.value) * 100) : 0,
        label: v !== null ? formatValue(v) : null,
      }
    }).sort((a, b) => {
      if (a.value === null && b.value === null) return 0
      if (a.value === null) return 1
      if (b.value === null) return -1
      return b.value - a.value
    })
    const hasAny = rows.some((r) => r.value !== null)
    return { rk, label: REGION_LABELS[rk], emoji: REGION_EMOJI[rk], rows, hasAny }
  }),
)

function formatValue(v: number): string {
  if (metric.value === 'loadFactor') return v.toFixed(1) + '%'
  if (v >= 10_000) return fmt.format(Math.round(v / 10000)) + ' 萬'
  return fmt.format(v)
}

const hasData = computed(() => props.stats.length > 0)
</script>

<template>
  <div class="rc-root">
    <!-- 無資料 -->
    <div v-if="!hasData" class="rc-empty">
      <p>目前年度無區域航線資料</p>
    </div>

    <template v-else>
      <!-- 指標切換 -->
      <div class="rc-toggle-row">
        <span class="field-label">比較指標</span>
        <div class="trend-mode-toggle">
          <button
            v-for="m in METRICS"
            :key="m.key"
            class="trend-mode-btn"
            :class="{ active: metric === m.key }"
            @click="metric = m.key"
          >{{ m.label }}</button>
        </div>
      </div>

      <!-- 三張卡片 -->
      <div class="rc-cards">
        <div
          v-for="card in regionCards"
          :key="card.rk"
          class="rc-card overview-card"
        >
          <!-- 卡片標題 -->
          <div class="rc-card-header">
            <span class="rc-emoji">{{ card.emoji }}</span>
            <span class="rc-card-title">{{ card.label }}</span>
            <button
              v-if="REGION_FILTER_INFO[card.rk]"
              type="button"
              class="rc-info-btn"
              :aria-label="`${card.label}篩選依據`"
              @click="openInfo(card.rk)"
            >?</button>
          </div>

          <!-- 無資料 -->
          <div v-if="!card.hasAny" class="rc-no-data">此區域本年度無資料</div>

          <!-- 橫條圖 rows -->
          <div v-else class="rc-bars">
            <div
              v-for="row in card.rows"
              :key="row.airline"
              class="rc-bar-row"
            >
              <!-- 航空名稱 + 色點 -->
              <div class="rc-bar-label">
                <span class="rc-dot" :style="{ background: row.color }"></span>
                <span class="rc-airline-name">{{ row.airline }}</span>
              </div>
              <!-- 橫條軌道 -->
              <div class="rc-track">
                <div
                  v-if="row.value !== null"
                  class="rc-fill"
                  :style="{ width: row.pct + '%', background: row.color }"
                ></div>
                <div v-else class="rc-fill rc-fill--empty"></div>
              </div>
              <!-- 數值 -->
              <span v-if="row.label !== null" class="rc-val">{{ row.label }}</span>
              <span v-else class="rc-val rc-val--na">—</span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeInfoContent"
        class="rc-dialog-backdrop"
        role="presentation"
        @click.self="activeInfo = null"
      >
        <section class="rc-dialog" role="dialog" aria-modal="true" :aria-label="activeInfoContent.title">
          <div class="rc-dialog-header">
            <h3>{{ activeInfoContent.title }}</h3>
            <button type="button" class="rc-dialog-close" aria-label="關閉" @click="activeInfo = null">×</button>
          </div>
          <div class="rc-dialog-body">
            <p v-for="line in activeInfoContent.body" :key="line">{{ line }}</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rc-root {
  display: grid;
  gap: 14px;
}

/* 無資料 */
.rc-empty {
  padding: 32px 16px;
  border: 1px dashed var(--ink-100);
  border-radius: 12px;
  text-align: center;
  color: var(--ink-400);
  font-size: 0.9rem;
}

/* 指標切換列 */
.rc-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* 三欄卡片 */
.rc-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

/* 單張卡片 */
.rc-card {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
}

.rc-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rc-emoji {
  font-size: 1.25rem;
  line-height: 1;
}
.rc-card-title {
  color: var(--ink-800);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.rc-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border: 1px solid var(--ink-100);
  border-radius: 50%;
  background: var(--blue-50);
  color: var(--ink-400);
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  transition: border-color 140ms, color 140ms, background 140ms;
}
.rc-info-btn:hover {
  border-color: var(--blue-300);
  background: #fff;
  color: var(--blue-600);
}

.rc-no-data {
  color: var(--ink-300);
  font-size: 0.82rem;
  padding: 8px 0;
}

/* 橫條圖 */
.rc-bars {
  display: grid;
  gap: 10px;
}

.rc-bar-row {
  display: grid;
  grid-template-columns: 88px 1fr 56px;
  align-items: center;
  gap: 8px;
}

.rc-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.rc-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.rc-airline-name {
  color: var(--ink-700);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rc-track {
  height: 10px;
  border-radius: 999px;
  background: var(--ink-50);
  overflow: hidden;
}
.rc-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 320ms ease;
}
.rc-fill--empty {
  width: 12px;
  background: var(--ink-100);
  opacity: 0.5;
}

.rc-val {
  text-align: right;
  color: var(--ink-700);
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}
.rc-val--na {
  color: var(--ink-300);
  font-weight: 400;
}

/* 說明 Dialog */
.rc-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(14 28 36 / 0.32);
}

.rc-dialog {
  width: min(420px, 100%);
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(14 28 36 / 0.18);
  padding: 18px 20px 20px;
}

.rc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rc-dialog-header h3 {
  margin: 0;
  color: var(--ink-800);
  font-size: 1rem;
  font-weight: 900;
}

.rc-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ink-100);
  border-radius: 50%;
  background: #fff;
  color: var(--ink-400);
  font-size: 1.2rem;
  line-height: 1;
}

.rc-dialog-body {
  display: grid;
  gap: 8px;
}

.rc-dialog-body p {
  color: var(--ink-500, var(--ink-400));
  font-size: 0.86rem;
  line-height: 1.7;
}

/* RWD */
@media (max-width: 760px) {
  .rc-cards {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .rc-bar-row {
    grid-template-columns: 72px 1fr 48px;
    gap: 6px;
  }
  .rc-airline-name {
    font-size: 0.72rem;
  }
  .rc-val {
    font-size: 0.72rem;
  }
}
</style>
