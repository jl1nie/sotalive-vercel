import { useMapStore } from '@/stores/mapStore'

/**
 * Simplified hook for map event loop prevention
 * Now delegates to centralized mapStore for state management
 * Focuses on UI behavior encapsulation only
 */
export const useMapEventLoop = () => {
  // Access centralized event state and actions from mapStore
  const isProgrammaticMove = useMapStore((state) => state.eventState.isProgrammaticMove)
  const isUserInteraction = useMapStore((state) => state.isUserInteraction)
  const startProgrammaticMove = useMapStore((state) => state.startProgrammaticMove)
  const debounceStateUpdate = useMapStore((state) => state.debounceStateUpdate)

  // Hook now only provides UI behavior - no complex state management
  return {
    isProgrammaticMove,
    isUserInteraction,
    startProgrammaticMove,
    debounceStateUpdate
  }
}