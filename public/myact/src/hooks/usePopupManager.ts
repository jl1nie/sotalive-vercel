import { useMapStore } from '@/stores/mapStore'

/**
 * Simplified hook for popup management
 * Now delegates to centralized mapStore for state management
 * Focuses on UI behavior encapsulation only
 */
export const usePopupManager = () => {
  // Access centralized popup state and actions from mapStore
  const popupInfo = useMapStore((state) => state.popupInfo)
  const setUniquePopup = useMapStore((state) => state.setUniquePopup)
  const clearPopup = useMapStore((state) => state.clearPopup)

  // Hook now only provides UI behavior - no complex state management
  return {
    popupInfo,
    setUniquePopup,
    clearPopup
  }
}

// Re-export PopupInfo type from store for backward compatibility
export type { PopupInfo } from '@/stores/mapStore'