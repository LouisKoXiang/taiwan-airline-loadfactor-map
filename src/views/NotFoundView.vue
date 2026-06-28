<template>
  <main class="not-found-page">
    <section class="not-found-card">
      <span class="not-found-kicker">404</span>
      <h1>找不到這個頁面</h1>
      <p>
        這個網址可能已經移動、拼錯，或目前沒有對應的航線資料。你可以回到總覽，或直接查詢航線。
      </p>

      <div class="not-found-actions">
        <RouterLink to="/" class="not-found-primary">回四大航空總覽</RouterLink>
        <RouterLink to="/routes" class="not-found-secondary">查詢航線</RouterLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.not-found-page {
  display: grid;
  min-height: calc(100vh - 72px);
  place-items: center;
  padding: 32px 20px 72px;
}

.not-found-card {
  width: min(620px, 100%);
  padding: 34px 36px;
  border: 1px solid var(--ink-100);
  border-radius: $radius-xl;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--blue-500, #3b82f6) 8%, #fff), #fff 58%);
  box-shadow: 0 18px 44px rgba(24, 74, 120, 0.1);
  text-align: center;

  @include respond-to(sm) {
    padding: 28px 22px;
  }
}

.not-found-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  min-height: 34px;
  margin-bottom: 14px;
  border-radius: $radius-pill;
  background: var(--blue-600, #2563eb);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  color: var(--ink-900);
  font-size: clamp(1.65rem, 4vw, 2.35rem);
  font-weight: 900;
  letter-spacing: 0;
}

p {
  max-width: 34rem;
  margin: 12px auto 0;
  color: var(--ink-500);
  font-size: 0.95rem;
  font-weight: 650;
  line-height: 1.8;
}

.not-found-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.not-found-primary,
.not-found-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: $radius-pill;
  font-size: 0.9rem;
  font-weight: 900;
  text-decoration: none;
  transition: transform 140ms, border-color 140ms, background 140ms, color 140ms;

  &:hover {
    transform: translateY(-1px);
  }
}

.not-found-primary {
  background: var(--blue-600, #2563eb);
  color: #fff;
}

.not-found-secondary {
  border: 1px solid color-mix(in srgb, var(--blue-500, #3b82f6) 28%, #fff);
  background: #fff;
  color: var(--blue-700, #1d4ed8);
}
</style>
