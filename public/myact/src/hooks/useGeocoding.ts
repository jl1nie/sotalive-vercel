import { useQuery } from '@tanstack/react-query'
import { GeocodingService } from '@/services/geocodingService'
import type { LatLng } from '@/types'

interface UseGeocodingOptions {
  includeElevation?: boolean
  enabled?: boolean
}

export const useReverseGeocoding = (
  position: LatLng | null,
  options: UseGeocodingOptions = {}
) => {
  const { includeElevation = true, enabled = true } = options

  return useQuery({
    queryKey: ['geocoding', position?.lat, position?.lng, includeElevation],
    queryFn: () => {
      if (!position) return null
      return GeocodingService.reverseGeocode(position.lat, position.lng, { includeElevation })
    },
    enabled: enabled && !!position,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Hook for getting elevation only
export const useElevation = (position: LatLng | null, enabled = true) => {
  return useQuery({
    queryKey: ['elevation', position?.lat, position?.lng],
    queryFn: async () => {
      if (!position) return null
      return GeocodingService.getElevation(position.lat, position.lng)
    },
    enabled: enabled && !!position,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Hook for MapCode (when available)
export const useMapCode = (position: LatLng | null, enabled = true) => {
  return useQuery({
    queryKey: ['mapcode', position?.lat, position?.lng],
    queryFn: async () => {
      if (!position) return null
      return GeocodingService.getMapcode(position.lat, position.lng)
    },
    enabled: enabled && !!position,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}