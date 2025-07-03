import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLng } from '@/types'

interface MapBounds {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
}

// Hook to get real-time map bounds from Leaflet instance
export const useRealMapBounds = (): MapBounds | null => {
  const map = useMap()
  const [bounds, setBounds] = useState<MapBounds | null>(null)

  useEffect(() => {
    if (!map) return

    const updateBounds = () => {
      const leafletBounds = map.getBounds()
      const newBounds = {
        min_lat: leafletBounds.getSouth(),
        max_lat: leafletBounds.getNorth(),
        min_lon: leafletBounds.getWest(),
        max_lon: leafletBounds.getEast()
      }
      
      console.log('useRealMapBounds: Updated bounds:', newBounds)
      setBounds(newBounds)
    }

    // Initial bounds
    updateBounds()

    // Listen for map events
    map.on('moveend', updateBounds)
    map.on('zoomend', updateBounds)
    map.on('resize', updateBounds)

    return () => {
      map.off('moveend', updateBounds)
      map.off('zoomend', updateBounds)
      map.off('resize', updateBounds)
    }
  }, [map])

  return bounds
}

// Hook to get map center and zoom from Leaflet instance
export const useMapState = (): { center: LatLng; zoom: number } | null => {
  const map = useMap()
  const [state, setState] = useState<{ center: LatLng; zoom: number } | null>(null)

  useEffect(() => {
    if (!map) return

    const updateState = () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      const newState = {
        center: { lat: center.lat, lng: center.lng },
        zoom
      }
      
      console.log('useMapState: Updated state:', newState)
      setState(newState)
    }

    // Initial state
    updateState()

    // Listen for map events
    map.on('moveend', updateState)
    map.on('zoomend', updateState)

    return () => {
      map.off('moveend', updateState)
      map.off('zoomend', updateState)
    }
  }, [map])

  return state
}