import { useMapStore } from '@/stores/mapStore'
import type { Summit, Park, Preferences } from '@/types'

interface MapDataHookResult {
  summits: Summit[]
  parks: Park[]
  preferences: Preferences
}

/**
 * Simplified useMapData hook - Pure accessor to Zustand store data
 * 
 * Note: Data loading is now handled by MapDataLoader component to eliminate 
 * dual data flow management. This hook provides a convenient interface to 
 * access the current map data state without redundant API calls or processing.
 * 
 * @returns Current map data from Zustand store
 */
export const useMapData = (): MapDataHookResult => {
  const { summits, parks, preferences } = useMapStore()

  return {
    summits,
    parks,
    preferences
  }
}