<script setup lang="ts">
import { computed } from 'vue'
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'

const store = useAirlineGrowthStore()
const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

const noChanges = computed(() =>
  store.routeChanges.newRoutes.length === 0 &&
  store.routeChanges.suspendedRoutes.length === 0 &&
  store.routeChanges.increasedRoutes.length === 0 &&
  store.routeChanges.decreasedRoutes.length === 0,
)

function percentText(value: number | undefined) {
  if (value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function flightDiffText(value: number) {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : ''}${formatNum(value)}`
}
</script>

<template>
  <div class="changes-tab">
    <!-- 無去年同月資料 -->
    <div v-if="!store.hasPreviousYearData" class="yoy-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <p>{{ store.yoySummary.summaryText }}</p>
      <small>匯入去年同月資料後可比較航線異動。</small>
    </div>

    <!-- 無異動 -->
    <div v-else-if="noChanges" class="changes-none">
      <p>與 {{ store.previousYearMonth }} 相比，航線無異動。</p>
    </div>

    <template v-else>
      <div class="changes-summary-grid">
        <div class="changes-summary-card">
          <span>新增航點</span>
          <strong>{{ store.routeChanges.newRoutes.length }}</strong>
        </div>
        <div class="changes-summary-card">
          <span>停飛 / 暫停</span>
          <strong>{{ store.routeChanges.suspendedRoutes.length }}</strong>
        </div>
        <div class="changes-summary-card">
          <span>增班航點</span>
          <strong>{{ store.routeChanges.increasedRoutes.length }}</strong>
        </div>
        <div class="changes-summary-card">
          <span>減班航點</span>
          <strong>{{ store.routeChanges.decreasedRoutes.length }}</strong>
        </div>
      </div>

      <!-- 新增航線 -->
      <section class="changes-section">
        <h3 class="changes-section-title changes-section-title--added">
          新增航點
          <span class="changes-count">{{ store.routeChanges.newRoutes.length }} 條</span>
        </h3>
        <p v-if="store.routeChanges.newRoutes.length === 0" class="changes-empty-line">本月沒有新增航點。</p>
        <div v-else class="changes-list">
          <div
            v-for="r in store.routeChanges.newRoutes"
            :key="`added-${r.originAirportCode}-${r.destinationAirportCode}`"
            class="change-item change-item--added"
          >
            <div class="change-item-route">
              <span class="code-cell">{{ r.originAirportCode }}</span>
              <span class="change-arrow">→</span>
              <span class="code-cell">{{ r.destinationAirportCode }}</span>
              <span class="change-city">{{ r.destinationCityName }}</span>
              <span class="country-cell">{{ r.destinationCountry }}</span>
            </div>
            <div class="change-item-stats">
              <span>
                <span class="lf-badge" :class="(r.currentLoadFactor ?? 0) >= 90 ? 'lf-high' : (r.currentLoadFactor ?? 0) >= 80 ? 'lf-mid' : 'lf-low'">
                  {{ r.currentLoadFactor?.toFixed(1) ?? '—' }}%
                </span>
              </span>
              <span>{{ formatNum(r.currentPassengerCount) }} 人</span>
              <span>今年 {{ formatNum(r.currentFlightCount) }} 次</span>
              <span>去年 0 次</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 停飛航線 -->
      <section class="changes-section">
        <h3 class="changes-section-title changes-section-title--removed">
          停飛 / 暫停航點
          <span class="changes-count">{{ store.routeChanges.suspendedRoutes.length }} 條</span>
        </h3>
        <p v-if="store.routeChanges.suspendedRoutes.length === 0" class="changes-empty-line">本月沒有停飛或暫停航點。</p>
        <div v-else class="changes-list">
          <div
            v-for="r in store.routeChanges.suspendedRoutes"
            :key="`removed-${r.originAirportCode}-${r.destinationAirportCode}`"
            class="change-item change-item--removed"
          >
            <div class="change-item-route">
              <span class="code-cell">{{ r.originAirportCode }}</span>
              <span class="change-arrow">→</span>
              <span class="code-cell">{{ r.destinationAirportCode }}</span>
              <span class="change-city">{{ r.destinationCityName }}</span>
              <span class="country-cell">{{ r.destinationCountry }}</span>
            </div>
            <div class="change-item-stats">
              <span class="change-prev-label">去年同月：</span>
              <span>{{ r.previousLoadFactor?.toFixed(1) ?? '—' }}%</span>
              <span>{{ formatNum(r.previousPassengerCount) }} 人</span>
              <span>{{ formatNum(r.previousFlightCount) }} 次</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 增班航線 -->
      <section class="changes-section">
        <h3 class="changes-section-title changes-section-title--increased">
          增班航點
          <span class="changes-count">{{ store.routeChanges.increasedRoutes.length }} 條</span>
        </h3>
        <p v-if="store.routeChanges.increasedRoutes.length === 0" class="changes-empty-line">本月沒有明顯增班航點。</p>
        <div v-else class="changes-list">
          <div
            v-for="r in store.routeChanges.increasedRoutes"
            :key="`increased-${r.originAirportCode}-${r.destinationAirportCode}`"
            class="change-item change-item--increased"
          >
            <div class="change-item-route">
              <span class="code-cell">{{ r.originAirportCode }}</span>
              <span class="change-arrow">→</span>
              <span class="code-cell">{{ r.destinationAirportCode }}</span>
              <span class="change-city">{{ r.destinationCityName }}</span>
              <span class="country-cell">{{ r.destinationCountry }}</span>
            </div>
            <div class="change-item-stats">
              <span>今年 {{ formatNum(r.currentFlightCount) }} 次</span>
              <span>去年 {{ formatNum(r.previousFlightCount) }} 次</span>
              <span class="yoy-diff yoy-diff--pos">{{ flightDiffText(r.flightDiff) }} 次</span>
              <span>{{ percentText(r.flightChangePercent) }}</span>
              <span>{{ r.currentLoadFactor?.toFixed(1) ?? '—' }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 減班航線 -->
      <section class="changes-section">
        <h3 class="changes-section-title changes-section-title--decreased">
          減班航點
          <span class="changes-count">{{ store.routeChanges.decreasedRoutes.length }} 條</span>
        </h3>
        <p v-if="store.routeChanges.decreasedRoutes.length === 0" class="changes-empty-line">本月沒有明顯減班航點。</p>
        <div v-else class="changes-list">
          <div
            v-for="r in store.routeChanges.decreasedRoutes"
            :key="`decreased-${r.originAirportCode}-${r.destinationAirportCode}`"
            class="change-item change-item--decreased"
          >
            <div class="change-item-route">
              <span class="code-cell">{{ r.originAirportCode }}</span>
              <span class="change-arrow">→</span>
              <span class="code-cell">{{ r.destinationAirportCode }}</span>
              <span class="change-city">{{ r.destinationCityName }}</span>
              <span class="country-cell">{{ r.destinationCountry }}</span>
            </div>
            <div class="change-item-stats">
              <span>今年 {{ formatNum(r.currentFlightCount) }} 次</span>
              <span>去年 {{ formatNum(r.previousFlightCount) }} 次</span>
              <span class="yoy-diff yoy-diff--neg">{{ flightDiffText(r.flightDiff) }} 次</span>
              <span>{{ percentText(r.flightChangePercent) }}</span>
              <span>{{ r.currentLoadFactor?.toFixed(1) ?? '—' }}%</span>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
