import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import EmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
  type EmblaPluginType,
} from './carousel/EmblaCarousel'
import { useWheelGestures } from './useWheelGestures'

export type UseCarouselOptions = EmblaOptionsType & {
  plugins?: EmblaPluginType[]
  wheelGestures?: boolean
}

export function useCarousel(
  rootRef: Ref<HTMLElement | null>,
  options: UseCarouselOptions = {},
) {
  let embla: EmblaCarouselType | null = null
  let wheelGesturesHandler: ReturnType<typeof useWheelGestures> | null = null

  // Reactive state
  const currentIndex = ref(0)
  const previousIndex = ref(0)
  const scrollProgress = ref(0)
  const canScrollNext = ref(false)
  const canScrollPrev = ref(false)
  const slidesInView = ref<number[]>([])
  const scrollSnapList = ref<number[]>([])
  const isInitialized = ref(false)

  function sync() {
    if (!embla) return
    currentIndex.value = embla.selectedScrollSnap()
    previousIndex.value = embla.previousScrollSnap()
    scrollProgress.value = embla.scrollProgress()
    canScrollNext.value = embla.canScrollNext()
    canScrollPrev.value = embla.canScrollPrev()
    slidesInView.value = embla.slidesInView()
    scrollSnapList.value = embla.scrollSnapList()
  }

  function init() {
    if (!rootRef.value) return

    const { plugins: userPlugins, ...carouselOptions } = options
    embla = EmblaCarousel(rootRef.value, carouselOptions, userPlugins)

    embla.on('init', () => {
      isInitialized.value = true
      sync()
    })

    embla.on('select', sync)
    embla.on('scroll', sync)
    embla.on('resize', sync)
    embla.on('settle', sync)
    embla.on('slidesInView', sync)

    // Enable trackpad/wheel swipe if requested
    if (options.wheelGestures) {
      wheelGesturesHandler = useWheelGestures(rootRef, () => embla, {
        axis: options.axis || 'x',
      })
      wheelGesturesHandler.init()
    }
  }

  function destroy() {
    wheelGesturesHandler?.destroy()
    wheelGesturesHandler = null
    if (embla) {
      embla.destroy()
      embla = null
      isInitialized.value = false
    }
  }

  onMounted(init)
  onUnmounted(destroy)

  // Re-initialize when options change
  watch(() => options, () => {
    if (embla) {
      const { plugins: userPlugins, ...carouselOptions } = options
      embla.reInit(carouselOptions, userPlugins)
      sync()
    }
  }, { deep: true })

  return {
    // Reactive state
    currentIndex,
    previousIndex,
    scrollProgress,
    canScrollNext,
    canScrollPrev,
    slidesInView,
    scrollSnapList,
    isInitialized,

    // Actions
    scrollTo(index: number, jump?: boolean) {
      embla?.scrollTo(index, jump)
    },
    scrollNext(jump?: boolean) {
      embla?.scrollNext(jump)
    },
    scrollPrev(jump?: boolean) {
      embla?.scrollPrev(jump)
    },

    // Raw Embla API access (escape hatch)
    api: () => embla,
  }
}
