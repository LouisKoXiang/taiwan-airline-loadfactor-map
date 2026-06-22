<script setup lang="ts">
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import type { AnalysisTab } from '../../types/airline'
import { trackAnalysisTab } from '../../utils/analytics'
import { useRoute } from 'vue-router'

const store = useAirlineGrowthStore()
const route = useRoute()

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: 'overview', label: '總覽' },
  { key: 'yoy', label: '同期比較' },
  { key: 'changes', label: '航點異動' },
  { key: 'opportunities', label: '增班潛力' },
  { key: 'details', label: '明細' },
]

function selectTab(tab: AnalysisTab) {
  trackAnalysisTab(tab, store.selectedAirline, store.activeMonth, route.fullPath)
  store.setActiveTab(tab)
}
</script>

<template>
  <div class="analysis-tabs" role="tablist" aria-label="分析維度">
    <button
      v-for="tab in TABS"
      :key="tab.key"
      role="tab"
      type="button"
      :aria-selected="store.activeTab === tab.key"
      class="analysis-tab"
      :class="{ active: store.activeTab === tab.key }"
      @click="selectTab(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
