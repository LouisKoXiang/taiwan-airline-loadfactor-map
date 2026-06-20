<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
</script>

<template>
  <div class="site-root">
    <NavBar />
    <div class="page-content">
      <RouterView />
    </div>
    <Analytics />
  </div>
</template>
