<script setup lang="ts">
interface Props {
  images: string[]
  projectTitle?: string
  projectDescription?: string
  projectResponsibility?: unknown
  alt?: string
}

withDefaults(defineProps<Props>(), {
  projectTitle: 'Project',
  projectDescription: '',
  projectResponsibility: undefined,
  alt: 'Image'
})

const isPopupOpen = ref(false)
</script>

<template>
  <div class="relative h-dvh w-screen">
    <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div class="pointer-events-auto">
        <UModal
          v-model:open="isPopupOpen"
          :title="projectTitle"
          :description="projectDescription"
          :overlay="false"
          :close="false"
        >
          <span
            class="cursor-pointer text-4xl tracking-tight text-pretty text-white uppercase transition-opacity duration-300"
            :class="isPopupOpen ? 'opacity-0' : 'opacity-100'"
            >{{ projectTitle }}</span
          >

          <template #body>
            <div
              v-if="projectResponsibility"
              class="space-y-4 uppercase"
            >
              <div>
                <p class="text-sm">Responsibility</p>
                <p class="text-sm">{{ projectResponsibility }}</p>
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </div>

    <CarouselEmblaRoot v-if="images.length > 0" :options="{ loop: true, align: 'center', wheelGestures: true }">
      <CarouselEmblaSlide v-for="(image, index) in images" :key="index">
        <img
          :src="image"
          :alt="`${alt} ${index + 1}`"
          class="h-dvh w-screen object-cover"
        >
      </CarouselEmblaSlide>
    </CarouselEmblaRoot>
  </div>
</template>
