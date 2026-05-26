<script setup lang="ts">
import { provide } from 'vue'
import { useCarousel } from '../../composables/useCarousel'
import type { UseCarouselOptions } from '../../composables/useCarousel'

const props = withDefaults(
  defineProps<{
    options?: UseCarouselOptions
  }>(),
  {
    options: () => ({}),
  },
)

const rootRef = ref<HTMLElement | null>(null)

const carousel = useCarousel(rootRef, props.options)

provide('carousel', carousel)
</script>

<template>
  <div
    ref="rootRef"
    class="new-carousel overflow-hidden"
  >
    <div class="new-carousel__container flex">
      <slot />
    </div>
  </div>
</template>
