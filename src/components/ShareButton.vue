<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  url: string
  title: string
  accent?: string
  text?: string
}>()

const copied = ref(false)
let copiedTimer: number | undefined
const shareText = computed(() => props.text ?? props.title)
const clipboardText = computed(() =>
  [props.title, shareText.value, props.url]
    .filter((line, index, lines) => line && lines.indexOf(line) === index)
    .join('\n')
)

async function copyUrl() {
  await navigator.clipboard.writeText(clipboardText.value)
  copied.value = true

  if (copiedTimer) window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => {
    copied.value = false
    copiedTimer = undefined
  }, 1600)
}

async function share() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.title,
        text: shareText.value,
        url: props.url,
      })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  await copyUrl()
}
</script>

<template>
  <button
    type="button"
    class="share-button"
    :style="{ '--share-accent': accent }"
    :aria-label="copied ? '已複製分享連結' : '分享目前頁面'"
    @click="share"
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" class="share-button-icon">
      <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 1.17 2.37l-7.1 4.07a3 3 0 1 0 0 3.12l7.1 4.07A3 3 0 1 0 17 16.1a3 3 0 0 0-.84.12l-7.08-4.06a3.16 3.16 0 0 0 0-.32l7.08-4.06A3 3 0 0 0 18 8Z" />
    </svg>
    <span>{{ copied ? '已複製' : '分享' }}</span>
  </button>
</template>
