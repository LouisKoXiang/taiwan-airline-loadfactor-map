<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { AIRLINE_META, FOUR_AIRLINES, SLUG_TO_AIRLINE } from './types/airline'
import type { AirlineName } from './types/airline'

const route = useRoute()
const pageContentRef = ref<HTMLElement | null>(null)
const hasScrolled = ref(false)

const quickSwitch = computed(() => {
  if (route.name === 'market-overview') {
    return {
      targetId: 'year-sel',
      label: '切換年份',
      hint: '回到總覽',
    }
  }

  if (String(route.name).startsWith('airline-')) {
    return {
      targetId: 'month-sel',
      label: '切換月份',
      hint: '回到頁首',
    }
  }

  return null
})

const showQuickSwitch = computed(() => Boolean(quickSwitch.value && hasScrolled.value))

const currentAirline = computed<AirlineName | undefined>(() => {
  if (!String(route.name).startsWith('airline-')) return undefined

  if (typeof route.meta.airlineName === 'string' && FOUR_AIRLINES.includes(route.meta.airlineName as AirlineName)) {
    return route.meta.airlineName as AirlineName
  }

  const slug = Array.isArray(route.params.airlineSlug)
    ? route.params.airlineSlug[0]
    : route.params.airlineSlug

  return slug ? SLUG_TO_AIRLINE[slug] : undefined
})

const pageContentStyle = computed(() =>
  currentAirline.value
    ? { '--page-accent': AIRLINE_META[currentAirline.value].accent }
    : {},
)

function handlePageScroll() {
  hasScrolled.value = (pageContentRef.value?.scrollTop ?? 0) > 420
}

async function jumpToSwitcher() {
  const target = quickSwitch.value
  if (!target) return

  pageContentRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  await nextTick()
  window.setTimeout(() => {
    document.getElementById(target.targetId)?.focus({ preventScroll: true })
  }, 420)
}

watch(
  () => route.fullPath,
  () => {
    hasScrolled.value = false
    pageContentRef.value?.scrollTo({ top: 0 })
  },
)
</script>

<template>
  <div class="site-root">
    <NavBar />
    <div
      ref="pageContentRef"
      class="page-content"
      :class="{ 'page-content--airline': currentAirline }"
      :style="pageContentStyle"
      @scroll.passive="handlePageScroll"
    >
      <RouterView />
    </div>
    <button
      v-if="showQuickSwitch && quickSwitch"
      type="button"
      class="quick-switch-btn"
      :aria-label="quickSwitch.label"
      @click="jumpToSwitcher"
    >
      <span class="quick-switch-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 19V5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          <path d="m5.5 11.5 6.5-6.5 6.5 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="quick-switch-copy">
        <span>{{ quickSwitch.hint }}</span>
        <strong>{{ quickSwitch.label }}</strong>
      </span>
    </button>
    <Analytics />
  </div>
</template>
