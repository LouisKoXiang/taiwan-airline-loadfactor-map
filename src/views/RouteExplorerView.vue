<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useRouteCatalogStore, type RouteSearchSuggestion } from '../stores/routeCatalogStore'
import { AIRLINE_META } from '../types/airline'

const store = useRouteCatalogStore()
const router = useRouter()
const route = useRoute()

// ── Filter state ──────────────────────────────────────────────────────────
const query = ref('')
const selectedOrigin = ref('')
const selectedCountry = ref('')
const selectedRegion = ref('')
const selectedDestination = ref('')
const quickQueries = ['TPE-NRT', '東京', '九州', '西岸', '西歐']
const showSuggestions = ref(false)
const isApplyingRouteQuery = ref(false)
const sectionInfo = {
  popular: '依最新資料月份的累積旅客數排序。',
  competitive: '最新資料月份有兩家以上四大國籍航空同時營運的航線。',
  exclusive: '最新資料月份僅一家四大國籍航空營運的航線。',
  new: '最新資料月份有班次、去年同月沒有班次的航線；不把歷史月份的舊新增航線混入。',
}
const COUNTRY_QUERY_MAP: Record<string, string> = {
  JP: '日本',
  JAPAN: '日本',
  US: '美國',
  USA: '美國',
  UNITED_STATES: '美國',
  EU: '歐洲',
  EUROPE: '歐洲',
}

function queryStringValue(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function normalizeCountryQuery(value: string): string {
  const key = value.trim().toUpperCase().replace(/[-\s]+/g, '_')
  return COUNTRY_QUERY_MAP[key] ?? value
}

function applyRouteQuery() {
  const country = normalizeCountryQuery(queryStringValue(route.query.country))
  const region = queryStringValue(route.query.region)
  const origin = queryStringValue(route.query.origin)
  const destination = queryStringValue(route.query.destination)
  const q = queryStringValue(route.query.q)

  isApplyingRouteQuery.value = true
  query.value = q
  selectedOrigin.value = origin
  selectedCountry.value = country
  selectedRegion.value = region
  selectedDestination.value = destination
  window.setTimeout(() => {
    isApplyingRouteQuery.value = false
  }, 0)
}

watch(
  () => route.query,
  applyRouteQuery,
  { immediate: true },
)

// Reset cascade: country → clear region + destination; region → clear destination
watch(selectedCountry, () => {
  if (isApplyingRouteQuery.value) return
  selectedRegion.value = ''
  selectedDestination.value = ''
})
watch(selectedRegion, () => {
  if (isApplyingRouteQuery.value) return
  selectedDestination.value = ''
})

// ── Filter option computeds ───────────────────────────────────────────────

/** Region groups for the selected country (empty if no sub-region defined) */
const regionsForCountry = computed(() => {
  if (!selectedCountry.value) return []
  return store.destinationsByCountryAndRegion.get(selectedCountry.value) ?? []
})

/** Whether to show the airport chips row */
const showDestinationFilter = computed(() => {
  // Has regions: show airports only after a region is picked
  if (regionsForCountry.value.length > 0) return selectedRegion.value !== ''
  // No regions: show airports directly when country is picked
  return selectedCountry.value !== ''
})

/** Airport list for the airport chips row */
const destinationsForFilter = computed((): { code: string; city: string }[] => {
  if (regionsForCountry.value.length > 0 && selectedRegion.value) {
    return regionsForCountry.value
      .find(rg => rg.region === selectedRegion.value)
      ?.destinations ?? []
  }
  if (selectedCountry.value && regionsForCountry.value.length === 0) {
    return store.destinationsByCountry.get(selectedCountry.value) ?? []
  }
  return []
})

// ── Search results ────────────────────────────────────────────────────────
const results = computed(() =>
  store.searchRoutes(query.value, {
    origin: selectedOrigin.value,
    country: selectedCountry.value,
    region: selectedRegion.value,
    destination: selectedDestination.value,
  })
)

const isFiltering = computed(() =>
  query.value.trim() !== '' ||
  selectedOrigin.value !== '' ||
  selectedCountry.value !== '' ||
  selectedRegion.value !== '' ||
  selectedDestination.value !== ''
)

const suggestions = computed(() => store.searchSuggestions(query.value))

// ── Formatters ────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

function airlineColor(code: string): string {
  for (const [, meta] of Object.entries(AIRLINE_META)) {
    if (meta.code === code) return meta.accent
  }
  return '#999'
}

function clearFilters() {
  query.value = ''
  selectedOrigin.value = ''
  selectedCountry.value = ''
  selectedRegion.value = ''
  selectedDestination.value = ''
}

function useQuickQuery(value: string) {
  query.value = value
  selectedOrigin.value = ''
  selectedCountry.value = ''
  selectedRegion.value = ''
  selectedDestination.value = ''
  showSuggestions.value = false
}

function suggestionTypeLabel(type: RouteSearchSuggestion['type']) {
  const map: Record<RouteSearchSuggestion['type'], string> = {
    route: '航線',
    airport: '機場',
    city: '城市',
    country: '地區',
    region: '區域',
  }
  return map[type]
}

function applySuggestion(item: RouteSearchSuggestion) {
  if (item.type === 'route' && item.routeCode) {
    void router.push(`/routes/${item.routeCode}`)
    return
  }
  query.value = item.query
  selectedOrigin.value = ''
  selectedCountry.value = ''
  selectedRegion.value = ''
  selectedDestination.value = ''
  showSuggestions.value = false
}

function submitSearch() {
  const first = suggestions.value[0]
  if (first?.type === 'route' && first.routeCode) {
    void router.push(`/routes/${first.routeCode}`)
  }
}

function hideSuggestionsLater() {
  window.setTimeout(() => {
    showSuggestions.value = false
  }, 140)
}
</script>

<template>
  <div class="rex-page">
    <!-- ── Header ── -->
    <header class="rex-header">
      <div class="rex-hero-copy">
        <span class="rex-kicker">Route Finder</span>
        <h1 class="rex-h1">航線查詢</h1>
        <p class="rex-desc">
          輸入航線、城市、國家或區域，快速進入各航線的載客率、旅客數、飛行班次與航空公司比較。
        </p>
      </div>

      <div class="rex-search-panel">
        <div class="rex-search-wrap">
          <input
            v-model="query"
            class="rex-search"
            type="search"
            placeholder="搜尋 TPE-NRT、東京、日本、關東..."
            aria-label="搜尋航線"
            autocomplete="off"
            @focus="showSuggestions = query.trim().length > 0"
            @input="showSuggestions = query.trim().length > 0"
            @blur="hideSuggestionsLater"
            @keydown.enter.prevent="submitSearch"
          />
          <span class="rex-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <div v-if="showSuggestions && suggestions.length > 0" class="rex-suggestions">
            <button
              v-for="item in suggestions"
              :key="`${item.type}-${item.routeCode ?? item.query}-${item.label}`"
              type="button"
              class="rex-suggestion"
              @mousedown.prevent="applySuggestion(item)"
            >
              <span class="rex-suggestion-type">{{ suggestionTypeLabel(item.type) }}</span>
              <span class="rex-suggestion-main">
                <strong>{{ item.label }}</strong>
                <small>{{ item.subLabel }}</small>
              </span>
              <span v-if="item.type === 'route'" class="rex-suggestion-action">前往</span>
            </button>
          </div>
        </div>
        <div class="rex-quick-search" aria-label="快速搜尋範例">
          <button
            v-for="item in quickQueries"
            :key="item"
            type="button"
            class="rex-quick-chip"
            @click="useQuickQuery(item)"
          >{{ item }}</button>
        </div>
      </div>
    </header>

    <!-- ── Filter bar ── -->
    <div class="rex-filters" aria-label="航線篩選器">
      <!-- Tier 1: Origin -->
      <div class="rex-filter-group">
        <span class="rex-filter-label">出發機場</span>
        <div class="rex-chips">
          <button
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedOrigin === '' }"
            @click="selectedOrigin = ''"
          >全部</button>
          <button
            v-for="o in store.availableOrigins"
            :key="o.code"
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedOrigin === o.code }"
            @click="selectedOrigin = selectedOrigin === o.code ? '' : o.code"
          >{{ o.label }}</button>
        </div>
      </div>

      <!-- Tier 2: Country / 地區 -->
      <div class="rex-filter-group">
        <span class="rex-filter-label">國家 / 地區</span>
        <div class="rex-chips rex-chips--wrap">
          <button
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedCountry === '' }"
            @click="selectedCountry = ''"
          >全部</button>
          <button
            v-for="c in store.availableCountries"
            :key="c.country"
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedCountry === c.country }"
            @click="selectedCountry = selectedCountry === c.country ? '' : c.country"
          >{{ c.country }}</button>
        </div>
      </div>

      <!-- Tier 3: Sub-region (only for countries with defined regions) -->
      <div v-if="selectedCountry && regionsForCountry.length > 0" class="rex-filter-group">
        <span class="rex-filter-label">次區域</span>
        <div class="rex-chips">
          <button
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedRegion === '' }"
            @click="selectedRegion = ''"
          >全部</button>
          <button
            v-for="rg in regionsForCountry"
            :key="rg.region"
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedRegion === rg.region }"
            @click="selectedRegion = selectedRegion === rg.region ? '' : rg.region"
          >{{ rg.region }}</button>
        </div>
      </div>

      <!-- Tier 4: Airport (shown when region selected, or country has no regions) -->
      <div v-if="showDestinationFilter && destinationsForFilter.length > 1" class="rex-filter-group">
        <span class="rex-filter-label">目的地機場</span>
        <div class="rex-chips rex-chips--wrap">
          <button
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedDestination === '' }"
            @click="selectedDestination = ''"
          >全部</button>
          <button
            v-for="d in destinationsForFilter"
            :key="d.code"
            class="rex-chip"
            :class="{ 'rex-chip--active': selectedDestination === d.code }"
            @click="selectedDestination = selectedDestination === d.code ? '' : d.code"
          >{{ d.code }} {{ d.city }}</button>
        </div>
      </div>
    </div>

    <!-- ── Explore sections (non-search state) ── -->
    <div v-if="!isFiltering" class="rex-explore">
      <div class="rex-explore-grid">

        <!-- 熱門航線 -->
        <section class="rex-expl-sec">
          <div class="rex-expl-hd">
            <h2 class="rex-expl-ttl">熱門航線 <span class="rex-info" tabindex="0">?<span>{{ sectionInfo.popular }}</span></span></h2>
            <span class="rex-expl-note">{{ store.globalLatestMonth }} 旅客數最多</span>
          </div>
          <div class="rex-expl-rows">
            <RouterLink
              v-for="(item, idx) in store.popularRoutes.slice(0, 8)"
              :key="item.routeCode"
              :to="`/routes/${item.routeCode}`"
              class="rex-expl-row"
            >
              <span class="rex-expl-rank">{{ idx + 1 }}</span>
              <div class="rex-expl-info">
                <span class="rex-expl-code">{{ item.originAirportCode }} → {{ item.destinationAirportCode }}</span>
                <span class="rex-expl-city">{{ item.destinationCityName }}</span>
              </div>
              <div class="rex-expl-badges">
                <span
                  v-for="code in item.airlineCodes"
                  :key="code"
                  class="rex-expl-badge"
                  :style="{ '--bc': airlineColor(code) }"
                >{{ code }}</span>
              </div>
              <span class="rex-expl-metric">{{ formatNum(item.passengerCount) }}</span>
            </RouterLink>
          </div>
        </section>

        <!-- 競爭航線 -->
        <section class="rex-expl-sec">
          <div class="rex-expl-hd">
            <h2 class="rex-expl-ttl">競爭航線 <span class="rex-info" tabindex="0">?<span>{{ sectionInfo.competitive }}</span></span></h2>
            <span class="rex-expl-note">兩家以上航司同時飛行</span>
          </div>
          <div class="rex-expl-rows">
            <RouterLink
              v-for="(item, idx) in store.competitiveRoutes.slice(0, 8)"
              :key="item.routeCode"
              :to="`/routes/${item.routeCode}`"
              class="rex-expl-row"
            >
              <span class="rex-expl-rank">{{ idx + 1 }}</span>
              <div class="rex-expl-info">
                <span class="rex-expl-code">{{ item.originAirportCode }} → {{ item.destinationAirportCode }}</span>
                <span class="rex-expl-city">{{ item.destinationCityName }}</span>
              </div>
              <div class="rex-expl-badges">
                <span
                  v-for="code in item.airlineCodes"
                  :key="code"
                  class="rex-expl-badge"
                  :style="{ '--bc': airlineColor(code) }"
                >{{ code }}</span>
              </div>
              <span class="rex-expl-metric">{{ item.loadFactor.toFixed(1) }}%</span>
            </RouterLink>
            <p v-if="store.competitiveRoutes.length === 0" class="rex-expl-empty">無資料</p>
          </div>
        </section>

        <!-- 獨佔航線 -->
        <section class="rex-expl-sec">
          <div class="rex-expl-hd">
            <h2 class="rex-expl-ttl">獨佔航線 <span class="rex-info" tabindex="0">?<span>{{ sectionInfo.exclusive }}</span></span></h2>
            <span class="rex-expl-note">目前僅一家航司飛行</span>
          </div>
          <div class="rex-expl-rows">
            <RouterLink
              v-for="(item, idx) in store.exclusiveRoutes.slice(0, 8)"
              :key="item.routeCode"
              :to="`/routes/${item.routeCode}`"
              class="rex-expl-row"
            >
              <span class="rex-expl-rank">{{ idx + 1 }}</span>
              <div class="rex-expl-info">
                <span class="rex-expl-code">{{ item.originAirportCode }} → {{ item.destinationAirportCode }}</span>
                <span class="rex-expl-city">{{ item.destinationCityName }}</span>
              </div>
              <div class="rex-expl-badges">
                <span
                  v-for="code in item.airlineCodes"
                  :key="code"
                  class="rex-expl-badge"
                  :style="{ '--bc': airlineColor(code) }"
                >{{ code }}</span>
              </div>
              <span class="rex-expl-metric">{{ formatNum(item.passengerCount) }}</span>
            </RouterLink>
            <p v-if="store.exclusiveRoutes.length === 0" class="rex-expl-empty">無資料</p>
          </div>
        </section>

        <!-- 新增航線 -->
        <section class="rex-expl-sec">
          <div class="rex-expl-hd">
            <h2 class="rex-expl-ttl">新增航線 <span class="rex-info" tabindex="0">?<span>{{ sectionInfo.new }}</span></span></h2>
            <span class="rex-expl-note">去年同月無班次</span>
          </div>
          <div class="rex-expl-rows">
            <RouterLink
              v-for="(item, idx) in store.newCurrentRoutes.slice(0, 8)"
              :key="item.routeCode"
              :to="`/routes/${item.routeCode}`"
              class="rex-expl-row"
            >
              <span class="rex-expl-rank">{{ idx + 1 }}</span>
              <div class="rex-expl-info">
                <span class="rex-expl-code">{{ item.originAirportCode }} → {{ item.destinationAirportCode }}</span>
                <span class="rex-expl-city">{{ item.destinationCityName }}</span>
              </div>
              <div class="rex-expl-badges">
                <span
                  v-for="code in item.airlineCodes"
                  :key="code"
                  class="rex-expl-badge"
                  :style="{ '--bc': airlineColor(code) }"
                >{{ code }}</span>
              </div>
              <span class="rex-expl-metric rex-expl-metric--new">新增</span>
            </RouterLink>
            <p v-if="store.newCurrentRoutes.length === 0" class="rex-expl-empty">本月無新增航線</p>
          </div>
        </section>

      </div>
    </div>

    <!-- ── Search results ── -->
    <section v-else class="rex-results">
      <div class="rex-results-bar">
        <span class="rex-results-summary">
          共 <strong>{{ results.length }}</strong> 條航線
          ・最新月份 <strong>{{ store.globalLatestMonth }}</strong> 資料
        </span>
        <button class="rex-clear-btn" @click="clearFilters">清除篩選</button>
      </div>

      <div v-if="results.length === 0" class="rex-empty">
        <p>找不到符合條件的航線，請嘗試不同的搜尋詞或篩選條件。</p>
      </div>

      <div class="rex-card-grid">
        <RouterLink
          v-for="item in results"
          :key="item.routeCode"
          :to="`/routes/${item.routeCode}`"
          class="rex-card"
        >
          <div class="rex-card-head">
            <div class="rex-card-route">
              <span class="rex-card-code">{{ item.originAirportCode }}</span>
              <span class="rex-card-arrow">→</span>
              <span class="rex-card-code">{{ item.destinationAirportCode }}</span>
            </div>
            <div class="rex-card-badges">
              <span v-if="item.isNewRoute" class="rex-card-tag rex-card-tag--new">新增</span>
              <span v-if="item.latestMonth !== store.globalLatestMonth" class="rex-card-tag rex-card-tag--old">歷史資料</span>
            </div>
          </div>

          <div class="rex-card-dest">
            {{ item.destinationCityName }}・{{ item.destinationCountry }}
          </div>

          <div class="rex-card-airlines">
            <span
              v-for="code in item.airlineCodes"
              :key="code"
              class="rex-airline-badge"
              :style="{ '--badge-color': airlineColor(code) }"
            >{{ code }}</span>
          </div>

          <div class="rex-card-stats">
            <div class="rex-card-stat-lf">
              <span class="rex-card-lf-val">{{ item.loadFactor.toFixed(1) }}<small>%</small></span>
              <span class="rex-card-lf-label">載客率</span>
            </div>
            <div class="rex-card-stat-secondary">
              <div class="rex-card-stat-row">
                <span class="rex-card-sec-val">{{ formatNum(item.passengerCount) }}</span>
                <span class="rex-card-sec-label">旅客</span>
              </div>
              <div class="rex-card-stat-row">
                <span class="rex-card-sec-val">{{ formatNum(item.flightCount) }}</span>
                <span class="rex-card-sec-label">班次</span>
              </div>
            </div>
          </div>

          <div class="rex-card-footer">
            <span class="rex-card-month" :class="{ 'rex-card-month--old': item.latestMonth !== store.globalLatestMonth }">
              {{ item.latestMonth }}
            </span>
            <span class="rex-card-cta">查看航線 →</span>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

// ── Page shell ────────────────────────────────────────────────────────────────
.rex {
  &-page {
    max-width: $bp-xl;
    margin: 0 auto;
    padding: 28px 20px 64px;

    @include respond-to(sm) {
      padding: 18px 12px 48px;
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  &-header {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
    gap: 26px;
    align-items: end;
    margin-bottom: 18px;

    @include respond-to(lg) {
      grid-template-columns: 1fr;
      gap: 14px;
    }
  }

  &-hero-copy {
    min-width: 0;
  }

  &-kicker {
    display: inline-flex;
    align-items: center;
    margin-bottom: 7px;
    color: var(--blue-600, #2563eb);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &-h1 {
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 800;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  &-desc {
    font-size: 0.9rem;
    color: var(--ink-400);
    margin: 0;
    max-width: 580px;
    line-height: 1.6;
  }

  &-search-panel {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--ink-100);
    border-radius: 18px;
    background:
      linear-gradient(135deg, #fff, color-mix(in srgb, var(--blue-500, #3b82f6) 5%, #fff));
    box-shadow: 0 16px 40px rgba(24, 74, 120, 0.08);
  }

  &-search-wrap {
    position: relative;
    width: 100%;
  }

  &-search {
    width: 100%;
    box-sizing: border-box;
    min-height: 54px;
    padding: 14px 18px 14px 48px;
    border: 1.5px solid color-mix(in srgb, var(--blue-500, #3b82f6) 18%, #fff);
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 700;
    background: #fff;
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.72);

    &:focus {
      border-color: var(--blue-500, #3b82f6);
      box-shadow: 0 0 0 4px rgba(59,130,246,0.13), 0 10px 26px rgba(37,99,235,0.1);
    }

    &::placeholder { color: var(--ink-300); }
  }

  &-search-icon {
    position: absolute;
    left: 17px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--blue-500, #3b82f6);
    pointer-events: none;
    display: flex;
  }

  &-suggestions {
    position: absolute;
    z-index: 30;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--ink-100);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 22px 48px rgba(24, 74, 120, 0.18);
  }

  &-suggestion {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 13px;
    border: 0;
    border-bottom: 1px solid var(--ink-100);
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;

    &:last-child { border-bottom: 0; }

    &:hover,
    &:focus-visible {
      background: var(--blue-50, #eff6ff);
      outline: none;
    }
  }

  &-suggestion-type {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    border-radius: $radius-pill;
    background: var(--ink-50, #f9fafb);
    color: var(--ink-400);
    font-size: 0.68rem;
    font-weight: 900;
  }

  &-suggestion-main {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;

    strong {
      color: var(--ink-800, #1a1a2e);
      font-size: 0.92rem;
      font-weight: 900;
      @include text-truncate;
    }

    small {
      color: var(--ink-400);
      font-size: 0.72rem;
      font-weight: 600;
      @include text-truncate;
    }
  }

  &-suggestion-action {
    color: var(--blue-600, #2563eb);
    font-size: 0.72rem;
    font-weight: 900;
  }

  &-quick-search {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    padding-bottom: 1px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { display: none; }
  }

  &-quick-chip {
    flex: 0 0 auto;
    border: 1px solid color-mix(in srgb, var(--blue-500, #3b82f6) 20%, #fff);
    border-radius: $radius-pill;
    background: #fff;
    color: var(--blue-700, #1d4ed8);
    font-size: 0.76rem;
    font-weight: 800;
    padding: 5px 10px;
    cursor: pointer;
    transition: transform 120ms, border-color 120ms, background 120ms;

    &:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--blue-500, #3b82f6) 44%, #fff);
      background: var(--blue-50, #eff6ff);
    }
  }

  // ── Filter bar ──────────────────────────────────────────────────────────────
  &-filters {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 22px;
    border: 1px solid var(--ink-100);
    border-radius: 18px;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(24, 74, 120, 0.07);
  }

  &-filter-group {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ink-100);
    min-height: 44px;

    &:last-child { border-bottom: none; }

    @include respond-to(sm) {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: start;
      gap: 8px;
      padding: 10px 12px;
    }
  }

  &-filter-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--ink-400);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    min-width: 72px;
    padding-right: 12px;
    flex-shrink: 0;
  }

  &-chips {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    overflow-x: auto;
    padding: 2px 0;
    min-width: 0;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    &--wrap {
      flex-wrap: wrap;

      @include respond-to(sm) {
        flex-wrap: nowrap;
      }
    }
  }

  &-chip {
    flex-shrink: 0;
    padding: 4px 11px;
    border: 1.5px solid var(--ink-150, #e5e7eb);
    border-radius: $radius-pill;
    background: transparent;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-500);
    cursor: pointer;
    transition: border-color 120ms, background 120ms, color 120ms;
    line-height: 1.4;
    min-height: 30px;

    &:hover:not(&--active) {
      border-color: var(--ink-300);
      color: var(--ink-700);
      background: var(--ink-50, #f9fafb);
    }

    &--active {
      border-color: var(--blue-500, #3b82f6);
      background: var(--blue-50, #eff6ff);
      color: var(--blue-700, #1d4ed8);
    }
  }

  // ── Explore sections ─────────────────────────────────────────────────────────
  &-explore-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @include respond-to(md) {
      grid-template-columns: 1fr;
    }
  }

  &-expl-sec {
    border: 1px solid var(--ink-100);
    border-radius: $radius-lg;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  &-expl-hd {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 11px 14px;
    border-bottom: 1px solid var(--ink-100);
    background: var(--ink-50, #f9fafb);
  }

  &-expl-ttl {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-600);
    margin: 0;
  }

  &-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    border: 1px solid var(--ink-150, #e5e7eb);
    border-radius: 50%;
    background: #fff;
    color: var(--ink-400);
    font-size: 0.62rem;
    line-height: 1;
    cursor: help;

    > span {
      position: absolute;
      z-index: 20;
      top: calc(100% + 7px);
      left: 0;
      width: min(250px, 72vw);
      padding: 8px 10px;
      border: 1px solid var(--ink-100);
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 14px 30px rgba(24, 74, 120, 0.15);
      color: var(--ink-500);
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1.5;
      text-transform: none;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-4px);
      transition: opacity 130ms, transform 130ms;
    }

    &:hover,
    &:focus-visible {
      color: var(--blue-600, #2563eb);
      border-color: color-mix(in srgb, var(--blue-500, #3b82f6) 34%, #fff);
      outline: none;

      > span {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }
    }
  }

  &-expl-note {
    font-size: 0.7rem;
    color: var(--ink-400);
    font-weight: 500;
  }

  &-expl-rows {
    display: flex;
    flex-direction: column;
  }

  &-expl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--ink-100);
    text-decoration: none;
    color: inherit;
    transition: background 100ms;

    &:last-child { border-bottom: none; }
    &:hover { background: var(--ink-50, #f9fafb); }
  }

  &-expl-rank {
    font-size: 0.65rem;
    font-weight: 900;
    color: var(--ink-250, #ccc);
    width: 14px;
    flex-shrink: 0;
    text-align: center;
  }

  &-expl-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  &-expl-code {
    font-size: 0.82rem;
    font-weight: 800;
    font-family: 'SF Mono', 'Consolas', monospace;
    color: var(--ink-700);
    letter-spacing: 0.01em;
  }

  &-expl-city {
    font-size: 0.7rem;
    color: var(--ink-400);
    @include text-truncate;
  }

  &-expl-badges {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }

  &-expl-badge {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: $radius-pill;
    background: color-mix(in srgb, var(--bc) 10%, #fff);
    color: var(--bc);
    border: 1px solid color-mix(in srgb, var(--bc) 25%, #fff);
  }

  &-expl-metric {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--ink-600);
    white-space: nowrap;
    text-align: right;
    min-width: 44px;
    flex-shrink: 0;

    &--new {
      font-size: 0.65rem;
      font-weight: 800;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 2px 6px;
      border-radius: $radius-pill;
      min-width: unset;
    }
  }

  &-expl-empty {
    padding: 14px;
    font-size: 0.8rem;
    color: var(--ink-300);
    text-align: center;
  }

  // ── Search results ───────────────────────────────────────────────────────────
  &-results { min-width: 0; }

  &-results-bar {
    @include flex-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  &-results-summary {
    font-size: 0.85rem;
    color: var(--ink-400);
    strong { color: var(--ink-600); }
  }

  &-clear-btn {
    border: 1px solid var(--ink-200);
    background: #fff;
    padding: 3px 10px;
    border-radius: $radius-pill;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-500);
    cursor: pointer;
    transition: border-color 120ms, color 120ms;
    &:hover {
      border-color: var(--ink-400);
      color: var(--ink-700);
    }
  }

  &-empty {
    @include card-padded($card-pad-lg);
    text-align: center;
    color: var(--ink-400);
    font-size: 0.9rem;
    border-style: dashed;
  }

  // ── Route card grid ──────────────────────────────────────────────────────────
  &-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(228px, 1fr));
    gap: 14px;

    @include respond-to(md) {
      grid-template-columns: 1fr;
    }
  }

  &-card {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 14px 16px 12px;
    border: 1px solid var(--ink-100);
    border-radius: $radius-lg;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 150ms, transform 150ms, border-color 150ms;
    will-change: transform;

    &:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.09);
      transform: translateY(-2px);
      border-color: var(--ink-200);
    }
  }

  &-card-head {
    @include flex-between;
    align-items: flex-start;
    gap: 6px;
  }

  &-card-route {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  &-card-code {
    font-family: 'SF Mono', 'Consolas', monospace;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--ink-800, #1a1a2e);
  }

  &-card-arrow {
    color: var(--ink-300);
    font-size: 0.8rem;
    margin: 0 1px;
  }

  &-card-badges {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &-card-tag {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: $radius-pill;
    flex-shrink: 0;

    &--new {
      background: #dbeafe;
      color: #1d4ed8;
    }

    &--old {
      background: #fef3c7;
      color: #92400e;
    }
  }

  &-card-dest {
    font-size: 0.85rem;
    color: var(--ink-500);
    font-weight: 500;
    line-height: 1.2;
  }

  &-card-airlines {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &-airline-badge {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: $radius-pill;
    background: color-mix(in srgb, var(--badge-color) 10%, #fff);
    color: var(--badge-color);
    border: 1.5px solid color-mix(in srgb, var(--badge-color) 28%, #fff);
  }

  &-card-stats {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 10px 0 8px;
    border-top: 1px solid var(--ink-100);
    border-bottom: 1px solid var(--ink-100);
  }

  &-card-stat-lf {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    flex: 0 0 auto;
    padding-right: 12px;
    margin-right: 12px;
    border-right: 1px solid var(--ink-100);
  }

  &-card-stat-secondary {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  &-card-stat-row {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  &-card-lf-val {
    font-size: 1.5rem;
    font-weight: 900;
    line-height: 1;
    color: var(--ink-800, #1a1a2e);
    letter-spacing: -0.02em;

    small { font-size: 0.78rem; font-weight: 700; color: var(--ink-400); }
  }

  &-card-lf-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-400);
  }

  &-card-sec-val {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-600);
  }

  &-card-sec-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-300);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &-card-footer {
    @include flex-between;
    align-items: center;
  }

  &-card-month {
    font-size: 0.72rem;
    color: var(--ink-300);
    letter-spacing: 0.01em;

    &--old {
      color: #d97706;
      font-weight: 600;
    }
  }

  &-card-cta {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--blue-600, #2563eb);
    display: flex;
    align-items: center;
    gap: 3px;
    transition: gap 120ms;

    .rex-card:hover & {
      gap: 5px;
    }
  }
}
</style>
