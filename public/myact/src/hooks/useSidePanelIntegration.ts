import { useEffect } from 'react'
import { debugLog } from '@/config/debugConfig'

/**
 * Simplified hook for integrating with side panel visibility changes
 * Focuses purely on UI behavior - no state management
 * Handles map resize when panel opens/closes
 */
export const useSidePanelIntegration = (
  mapRef: React.MutableRefObject<L.Map | null>,
  sidePanelVisible?: boolean
) => {
  // Handle side panel visibility changes - invalidate map size while preserving center
  useEffect(() => {
    if (mapRef.current) {
      // Wait for panel animation to complete, then resize map
      const timeout = setTimeout(() => {
        const map = mapRef.current
        if (map) {
          // Invalidate size while preserving the current center position
          // The 'pan' option keeps the current center position stable
          map.invalidateSize({
            pan: false,    // Don't pan to maintain position
            debounceMoveend: true // Debounce moveend events to avoid conflicts
          })
          
          const center = map.getCenter()
          const zoom = map.getZoom()
          debugLog.leafletMap('Map size invalidated with position preserved:', {
            center: { lat: center.lat, lng: center.lng },
            zoom: zoom,
            sidePanelVisible
          })
        }
      }, 350) // Slightly longer than the 300ms panel animation
      
      return () => clearTimeout(timeout)
    }
  }, [sidePanelVisible, mapRef])
}