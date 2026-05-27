import type { Ref } from 'vue'
import WheelGestures from 'wheel-gestures'
import type { WheelEventState } from 'wheel-gestures'
import type { EmblaCarouselType } from '~/composables/carousel/EmblaCarousel'

export interface UseWheelGesturesOptions {
  /** Which axis to react to. Default: 'x' */
  axis?: 'x' | 'y'
}

/**
 * Bridges the `wheel-gestures` library to our Embla-based carousel.
 *
 * Trackpad swipes produce `wheel` events with deltaX/deltaY — not mouse or touch events.
 * This composable listens to those wheel events via the `wheel-gestures` library,
 * which normalizes deltas, detects momentum, and tracks gesture lifecycle.
 *
 * It then converts those wheel gestures into synthetic mouse events (mousedown/mousemove/mouseup)
 * and dispatches them on the carousel container. Embla's existing DragHandler picks these up
 * as if the user were dragging with a mouse.
 */
export function useWheelGestures(
  rootRef: Ref<HTMLElement | null>,
  getEmbla: () => EmblaCarouselType | null,
  options: UseWheelGesturesOptions = {}
) {
  const { axis = 'x' } = options
  let cleanup = () => {}

  function init() {
    const embla = getEmbla()
    const root = rootRef.value
    if (!embla || !root) return

    const engine = embla.internalEngine()
    const containerNode = embla.containerNode()
    const targetNode = root

    const wheelGestures = WheelGestures({
      preventWheelAction: axis,
      reverseSign: [true, true, false]
    })

    let isStarted = false
    let startEvent: MouseEvent
    let overBoundaryAccumulation = 0
    let scrollBoundaryThreshold = 0
    let blockedWaitUntilGestureEnd = false

    function updateBoundaryThreshold() {
      const rect = containerNode.getBoundingClientRect()
      scrollBoundaryThreshold = (axis === 'x' ? rect.width : rect.height) / 2
    }

    updateBoundaryThreshold()

    const unobserveTargetNode = wheelGestures.observe(targetNode)
    const offWheel = wheelGestures.on('wheel', handleWheel)

    // Re-calculate on resize
    embla.on('resize', updateBoundaryThreshold)

    function wheelGestureStarted(state: WheelEventState) {
      startEvent = new MouseEvent('mousedown', state.event)
      containerNode.dispatchEvent(startEvent)

      isStarted = true
      overBoundaryAccumulation = 0
      addNativeMouseEventListeners()
      targetNode.classList.add('is-wheel-dragging')
    }

    function wheelGestureEnded(state: WheelEventState) {
      isStarted = false
      containerNode.dispatchEvent(createRelativeMouseEvent('mouseup', state))
      removeNativeMouseEventListeners()
      targetNode.classList.remove('is-wheel-dragging')
    }

    function addNativeMouseEventListeners() {
      document.documentElement.addEventListener('mousemove', preventNativeMouseHandler, true)
      document.documentElement.addEventListener('mouseup', preventNativeMouseHandler, true)
      document.documentElement.addEventListener('mousedown', preventNativeMouseHandler, true)
    }

    function removeNativeMouseEventListeners() {
      document.documentElement.removeEventListener('mousemove', preventNativeMouseHandler, true)
      document.documentElement.removeEventListener('mouseup', preventNativeMouseHandler, true)
      document.documentElement.removeEventListener('mousedown', preventNativeMouseHandler, true)
    }

    function preventNativeMouseHandler(e: MouseEvent) {
      if (isStarted && e.isTrusted) {
        e.stopImmediatePropagation()
      }
    }

    function createRelativeMouseEvent(
      type: 'mousedown' | 'mousemove' | 'mouseup',
      state: WheelEventState
    ) {
      let [moveX, moveY] = state.axisMovement

      const { isAtBoundary } = checkIfAtBoundary(state)

      // Progressive rubber-band damping at boundaries
      if (isAtBoundary) {
        const progressRatio = Math.min(
          overBoundaryAccumulation / scrollBoundaryThreshold,
          1
        )
        const dampingFactor = 0.01 + progressRatio * 0.01
        const counterMoveSign = moveX > 0 ? -1 : 1
        const counterMovement = overBoundaryAccumulation * counterMoveSign
        const dampingMovement = counterMovement * dampingFactor

        moveX += dampingMovement
        moveY += dampingMovement
      }

      // Prevent skipping slides
      if (!engine.options.skipSnaps && !engine.options.dragFree) {
        const rect = containerNode.getBoundingClientRect()
        const maxX = rect.width
        const maxY = rect.height

        moveX = moveX < 0 ? Math.max(moveX, -maxX) : Math.min(moveX, maxX)
        moveY = moveY < 0 ? Math.max(moveY, -maxY) : Math.min(moveY, maxY)
      }

      return new MouseEvent(type, {
        clientX: startEvent.clientX + moveX,
        clientY: startEvent.clientY + moveY,
        screenX: startEvent.screenX + moveX,
        screenY: startEvent.screenY + moveY,
        movementX: moveX,
        movementY: moveY,
        button: 0,
        bubbles: true,
        cancelable: true,
        composed: true
      })
    }

    function checkIfAtBoundary(state: WheelEventState) {
      const {
        axisDelta: [deltaX, deltaY]
      } = state
      const progress = embla.scrollProgress()
      const canScrollNext = progress < 1
      const canScrollPrev = progress > 0
      const primaryAxisDelta = axis === 'x' ? deltaX : deltaY
      const isScrollingNext = primaryAxisDelta < 0
      const isScrollingPrev = primaryAxisDelta > 0
      const isAtBoundary =
        (isScrollingNext && !canScrollNext) ||
        (isScrollingPrev && !canScrollPrev)

      return { isAtBoundary, primaryAxisDelta }
    }

    function isBoundaryThresholdReached(state: WheelEventState) {
      const { isAtBoundary, primaryAxisDelta } = checkIfAtBoundary(state)

      if (isAtBoundary && !state.isMomentum) {
        overBoundaryAccumulation += Math.abs(primaryAxisDelta)

        if (overBoundaryAccumulation > scrollBoundaryThreshold) {
          blockedWaitUntilGestureEnd = true
          wheelGestureEnded(state)
          return true
        }
      } else {
        overBoundaryAccumulation = 0
      }

      return false
    }

    function handleWheel(state: WheelEventState) {
      const {
        axisDelta: [deltaX, deltaY]
      } = state
      const primaryAxisDelta = axis === 'x' ? deltaX : deltaY
      const crossAxisDelta = axis === 'x' ? deltaY : deltaX
      const isRelease =
        state.isMomentum && state.previous && !state.previous.isMomentum
      const isEndingOrRelease =
        (state.isEnding && !state.isMomentum) || isRelease
      const primaryAxisDeltaIsDominant =
        Math.abs(primaryAxisDelta) > Math.abs(crossAxisDelta)

      if (
        primaryAxisDeltaIsDominant &&
        !isStarted &&
        !state.isMomentum &&
        !blockedWaitUntilGestureEnd
      ) {
        wheelGestureStarted(state)
      }

      if (blockedWaitUntilGestureEnd && state.isEnding) {
        blockedWaitUntilGestureEnd = false
      }

      if (!isStarted) return

      if (isBoundaryThresholdReached(state)) return

      if (isEndingOrRelease) {
        wheelGestureEnded(state)
      } else {
        containerNode.dispatchEvent(createRelativeMouseEvent('mousemove', state))
      }
    }

    cleanup = () => {
      unobserveTargetNode()
      offWheel()
      embla.off('resize', updateBoundaryThreshold)
      removeNativeMouseEventListeners()
    }
  }

  function destroy() {
    cleanup()
    cleanup = () => {}
  }

  return { init, destroy }
}
