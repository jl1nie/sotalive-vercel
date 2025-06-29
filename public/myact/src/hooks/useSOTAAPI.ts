import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { APIService } from '@/services/api'
import type { LatLng } from '@/types'

// Query keys for cache management
const QUERY_KEYS = {
  geomagnetic: ['geomagnetic'],
  summits: (params: any) => ['summits', params],
  parks: (params: any) => ['parks', params],
  searchInBounds: (params: any) => ['search', 'bounds', params],
  spots: (params: any) => ['spots', params],
  aprs: (params: any) => ['aprs', params],
  potaLog: (logId: string) => ['pota', 'log', logId],
  potaStats: ['pota', 'stats'],
  reference: (name: string) => ['reference', name],
} as const

// Geomagnetic data hook
export const useGeomagneticData = () => {
  return useQuery({
    queryKey: QUERY_KEYS.geomagnetic,
    queryFn: APIService.getGeomagneticData,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

// Summit search hooks
export const useSearchSummits = (params: {
  lat: number
  lon: number
  dist?: number
  log_id?: string
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.summits(params),
    queryFn: () => APIService.searchSummits(params),
    enabled: !!(params.lat && params.lon),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Park search hooks
export const useSearchParks = (params: {
  pota_code?: string
  log_id?: string
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.parks(params),
    queryFn: () => APIService.searchParks(params),
    enabled: !!(params.pota_code || params.log_id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Search in map bounds (for markers)
export const useSearchInBounds = (params: {
  min_lat: number
  min_lon: number
  max_lat: number
  max_lon: number
  min_elev?: number
  min_area?: number
  log_id?: string
}, enabled = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.searchInBounds(params),
    queryFn: () => APIService.searchInBounds(params),
    enabled: enabled && !!(params.min_lat && params.min_lon && params.max_lat && params.max_lon),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Activation spots (real-time data)
export const useActivationSpots = (params: {
  pat_ref?: string
  log_id?: string
  by_call?: boolean
  by_ref?: boolean
  hours_ago?: number
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.spots(params),
    queryFn: () => APIService.getActivationSpots(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  })
}

// APRS tracks
export const useAPRSTracks = (
  params: {
    pat_ref?: string
    hours_ago?: number
  },
  options: { enabled?: boolean; refetchInterval?: number } = {}
) => {
  const { enabled = true, refetchInterval = 3 * 60 * 1000 } = options
  
  return useQuery({
    queryKey: QUERY_KEYS.aprs(params),
    queryFn: () => APIService.getAPRSTracks(params),
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval, // Auto-refetch interval
  })
}

// Reference search
export const useSearchReference = (name: string, enabled = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.reference(name),
    queryFn: () => APIService.searchReference(name),
    enabled: enabled && !!name.trim(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// POTA Log management hooks
export const usePOTALog = (logId: string, enabled = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.potaLog(logId),
    queryFn: () => APIService.getPOTALog(logId),
    enabled: enabled && !!logId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const usePOTALogStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.potaStats,
    queryFn: APIService.getPOTALogStats,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// POTA Log mutations
export const useUploadPOTALog = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      activatorUuid, 
      hunterUuid, 
      formData 
    }: {
      activatorUuid: string | null
      hunterUuid: string | null
      formData: FormData
    }) => APIService.uploadPOTALog(activatorUuid, hunterUuid, formData),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['pota'] })
    },
  })
}

export const useDeletePOTALog = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (logId: string) => APIService.deletePOTALog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pota'] })
    },
  })
}

export const useSharePOTALog = () => {
  return useMutation({
    mutationFn: ({ 
      activatorUuid, 
      hunterUuid 
    }: {
      activatorUuid: string | null
      hunterUuid: string | null
    }) => APIService.sharePOTALog(activatorUuid, hunterUuid),
  })
}

export const useImportSharedPOTALog = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (shareKey: string) => APIService.importSharedPOTALog(shareKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pota'] })
    },
  })
}

// Utility hook for bounds calculation
export const useMapBounds = (center: LatLng, zoom: number) => {
  // Calculate map bounds based on center and zoom level
  // This is a simplified calculation - you might want to use actual map bounds
  const latDelta = 180 / Math.pow(2, zoom)
  const lngDelta = 360 / Math.pow(2, zoom)
  
  return {
    min_lat: center.lat - latDelta,
    max_lat: center.lat + latDelta,
    min_lon: center.lng - lngDelta,
    max_lon: center.lng + lngDelta,
  }
}