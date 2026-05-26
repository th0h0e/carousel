<script setup lang="ts">
import { inject } from 'vue'
import type { useCarousel } from '../../composables/useCarousel'

type CarouselApi = ReturnType<typeof useCarousel>

const _carousel = inject<CarouselApi>('carousel')
</script>

<template>
  <div class="new-carousel__slide min-w-0 shrink-0">
    <slot />
  </div>
</template>
