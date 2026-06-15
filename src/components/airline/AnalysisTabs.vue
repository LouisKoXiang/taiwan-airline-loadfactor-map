<script setup lang="ts">
import { useAirlineGrowthStore } from '../../stores/airlineGrowthStore'
import type { AnalysisTab } from '../../types/airline'

const store = useAirlineGrowthStore()

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: 'overview', label: '總覽' },
  { key: 'yoy', label: '同期比較' },
  { key: 'changes', label: '航點異動' },
  { key: 'opportunities', label: '增班潛力' },
  { key: 'details', label: '明細' },
]
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
      @click="store.setActiveTab(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
