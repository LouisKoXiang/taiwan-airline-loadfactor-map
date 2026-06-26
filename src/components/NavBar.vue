<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <nav class="app-nav" aria-label="主導覽列">
    <RouterLink to="/" class="nav-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-1-5.5.5L10 6 1.8 4.2a1 1 0 0 0-.8.3L.6 5.1C0 5.7 0 6.6.6 7.1l3.3 2.3-1.5 1.5-1.9-.3c-.4-.1-.8.1-1 .5l-.4.7c-.3.5-.2 1.1.2 1.5l1.5 1.5L3 15l1.5 1.5 1.5 1.5.5 1.5c.4.4 1 .5 1.5.2l.7-.4c.4-.2.6-.6.5-1l-.3-1.9 1.5-1.5 2.3 3.3c.5.6 1.4.6 1.9 0l.5-.5a1 1 0 0 0 .3-.8z"/></svg>
      台灣航空視覺化
    </RouterLink>

    <div class="nav-links">
      <RouterLink to="/" class="nav-link" :class="{ active: route.name === 'market-overview' || String(route.name).startsWith('airline-') }">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        航運四雄分析
      </RouterLink>

      <RouterLink to="/routes" class="nav-link" :class="{ active: route.name === 'route-explorer' }">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        航點探索地圖
      </RouterLink>
    </div>
  </nav>
</template>
