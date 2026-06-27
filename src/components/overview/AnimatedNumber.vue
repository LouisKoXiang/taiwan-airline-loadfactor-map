<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}>(), {
  decimals: 0,
  prefix: '',
  suffix: '',
  duration: 900,
})

const fmt = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: props.decimals,
  minimumFractionDigits: props.decimals,
})

const displayValue = ref(0)
let frameId: number | undefined

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const formattedValue = computed(() => `${props.prefix}${fmt.format(displayValue.value)}${props.suffix}`)

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function animateTo(target: number, from = displayValue.value) {
  if (frameId) window.cancelAnimationFrame(frameId)

  if (prefersReducedMotion()) {
    displayValue.value = target
    return
  }

  const startedAt = performance.now()
  const distance = target - from

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / props.duration)
    displayValue.value = from + distance * easeOutCubic(progress)

    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick)
    } else {
      displayValue.value = target
      frameId = undefined
    }
  }

  frameId = window.requestAnimationFrame(tick)
}

onMounted(() => animateTo(props.value, 0))

watch(() => props.value, (next, prev) => {
  animateTo(next, prev ?? displayValue.value)
})

onBeforeUnmount(() => {
  if (frameId) window.cancelAnimationFrame(frameId)
})
</script>

<template>
  <span class="animated-number">{{ formattedValue }}</span>
</template>
