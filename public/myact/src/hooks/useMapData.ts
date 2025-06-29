import { useEffect, useMemo } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { useSearchInBounds, useMapBounds } from './useSOTAAPI'
import type { Summit, Park } from '@/types'
import type { SearchInBoundsResponse } from '@/types/api'

interface MapDataHookResult {
  isLoading: boolean
  error: any
  summits: Summit[]
  parks: Park[]
}

export const useMapData = (): MapDataHookResult => {
  const { 
    mapCenter, 
    zoom, 
    preferences, 
    setSummits, 
    setParks,
    clearMarkers 
  } = useMapStore()

  // Calculate map bounds for API query
  const bounds = useMapBounds(mapCenter, zoom)

  // Determine elevation and area filters based on zoom level
  const { minElev, minArea } = useMemo(() => {
    if (zoom >= preferences.zoom_threshold) {
      return { minElev: 0, minArea: 0 }
    } else if (zoom > 9) {
      return { minElev: 800, minArea: 1 }
    } else if (zoom > 8) {
      return { minElev: 1000, minArea: 10 }
    } else if (zoom > 6) {
      return { minElev: 1500, minArea: 20 }
    } else {
      return { minElev: 4000, minArea: 30 }
    }
  }, [zoom, preferences.zoom_threshold])

  // Get POTA log ID if needed
  const logId = useMemo(() => {
    if (preferences.show_potalog) {
      return preferences.show_potaactlog 
        ? preferences.pota_activator_uuid 
        : preferences.pota_hunter_uuid
    }
    return undefined
  }, [preferences.show_potalog, preferences.show_potaactlog, preferences.pota_activator_uuid, preferences.pota_hunter_uuid])

  // API query parameters
  const queryParams = useMemo(() => ({
    min_lat: bounds.min_lat,
    min_lon: bounds.min_lon,
    max_lat: bounds.max_lat,
    max_lon: bounds.max_lon,
    min_elev: minElev,
    min_area: minArea,
    log_id: logId || undefined,
  }), [bounds, minElev, minArea, logId])

  // Enable query only if we should show any references
  const queryEnabled = preferences.sota_ref || preferences.pota_ref || preferences.jaff_ref

  // Fetch data from API
  const { data, isLoading, error } = useSearchInBounds(queryParams, queryEnabled)

  // Process and update store when data changes
  useEffect(() => {
    if (data) {
      const summits: Summit[] = []
      const parks: Park[] = []
      const apiData = data as SearchInBoundsResponse

      // Process SOTA summits
      if (preferences.sota_ref && apiData.sota) {
        for (const s of apiData.sota) {
          summits.push({
            summitCode: s.summit_code || s.summitCode || '',
            summitName: s.summit_name || s.summitName || '',
            summitNameJ: s.summit_name_j || s.summitNameJ,
            latitude: s.lat || s.latitude || 0,
            longitude: s.lon || s.longitude || 0,
            altM: s.alt || s.altM || 0,
            points: s.points || 0,
            bonusPoints: s.bonus_points || s.bonusPoints || 0,
            activationCount: s.count || s.activationCount || 0,
            activationDate: s.activation_date || s.activationDate,
            activationCall: s.activation_call || s.activationCall,
            cityJ: s.city_j || s.cityJ,
            maidenhead: s.maidenhead || '',
          })
        }
      }

      // Process POTA/JAFF parks
      if ((preferences.pota_ref || preferences.jaff_ref) && apiData.pota) {
        for (const p of apiData.pota) {
          // Filter based on preferences
          const showPOTA = preferences.pota_ref && p.pota
          const showJAFF = preferences.jaff_ref && p.wwff
          
          if (showPOTA || showJAFF) {
            parks.push({
              potaCode: p.pota || '',
              wwffCode: p.wwff || '',
              parkNameJ: p.nameJ || p.name_j || '',
              latitude: p.lat || p.latitude || 0,
              longitude: p.lon || p.longitude || 0,
              date: p.date,
              locid: p.locid,
              act: p.act,
              qsos: p.qsos,
              activations: p.activations,
              attempts: p.attempts,
            })
          }
        }
      }

      // Update store
      setSummits(summits)
      setParks(parks)
    } else if (!isLoading && !error) {
      // Clear markers if no data and not loading
      clearMarkers()
    }
  }, [data, preferences, setSummits, setParks, clearMarkers, isLoading, error])

  // Clear markers when preferences change to disable all references
  useEffect(() => {
    if (!preferences.sota_ref && !preferences.pota_ref && !preferences.jaff_ref) {
      clearMarkers()
    }
  }, [preferences.sota_ref, preferences.pota_ref, preferences.jaff_ref, clearMarkers])

  return {
    isLoading,
    error,
    summits: useMapStore.getState().summits,
    parks: useMapStore.getState().parks,
  }
}