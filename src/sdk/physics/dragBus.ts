type CancelCb = () => void

const listeners = new Set<CancelCb>()

/**
 * Pub/sub bus for cancelling in-flight drags.
 *
 *   - useDrag subscribes via onCancel() on mount.
 *   - PinchZoomController calls cancelAll() when a 2-finger pinch starts,
 *     forcing every active drag to release its pointer and restore the
 *     rigid body to Dynamic before the camera starts zooming.
 *
 * Decoupled from cameraStore because not every consumer that needs to
 * cancel drags is camera-related, and not every camera change should
 * cancel drags. A bus keeps the concerns separate.
 */
export const dragBus = {
  onCancel(cb: CancelCb): () => void {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  },
  cancelAll(): void {
    listeners.forEach((cb) => {
      try { cb() } catch {}
    })
  },
}
