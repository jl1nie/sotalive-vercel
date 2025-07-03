import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { APIService } from '@/services/api'
import type { LatLng } from '@/types'

// Query keys for cache management
const QUERY_KEYS = {
  geomagnetic: ['geomagnetic'],
  summits: (params: Record<string, string | number>) => ['summits', params],
  parks: (params: Record<string, string>) => ['parks', params],
  searchInBounds: (params: Record<string, string | number>) => ['search', 'bounds', params],
  spots: (params: Record<string, string | number | boolean>) => ['spots', params],
  aprs: (params: Record<string, string | number>) => ['aprs', params],
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
  const DEBUG = false // デバッグログ制御
  if (DEBUG) console.log('useSearchInBounds: Called with params:', params, 'enabled:', enabled)
  
  const queryEnabled = enabled && !!(params.min_lat && params.min_lon && params.max_lat && params.max_lon)
  if (DEBUG) console.log('useSearchInBounds: Query enabled:', queryEnabled)
  
  return useQuery({
    queryKey: QUERY_KEYS.searchInBounds(params),
    queryFn: () => {
      if (DEBUG) console.log('useSearchInBounds: Executing query function')
      return APIService.searchInBounds(params)
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (延長)
    gcTime: 15 * 60 * 1000, // 15 minutes (延長)
  })
}

// Activation spots with Anti-Corruption Layer transformation
export const useActivationSpots = (params: {
  pat_ref?: string
  log_id?: string
  by_call?: boolean
  by_ref?: boolean
  hours_ago?: number
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.spots(params),
    queryFn: async () => {
      const DEBUG = false // デバッグログ制御
      if (DEBUG) console.log('SPOT-API - Fetching activation spots with params:', params)
      const spots = await APIService.getActivationSpots(params)
      if (DEBUG) console.log('SPOT-API - Transformed spots:', spots)
      
      // Add legacy field mappings for compatibility
      const compatibleSpots = spots.map(spot => ({
        ...spot,
        activator_call: spot.activator,
        activatorCall: spot.activator,
        summit_code: spot.program === 'SOTA' ? spot.reference : undefined,
        summitCode: spot.program === 'SOTA' ? spot.reference : undefined,
        park_code: spot.program === 'POTA' ? spot.reference : undefined,
        parkCode: spot.program === 'POTA' ? spot.reference : undefined,
        time_string: spot.spotTime,
        timeString: spot.spotTime,
        time: spot.spotTime,
        comments: spot.comment
      }))
      
      if (DEBUG) console.log('SPOT-API - Compatible spots:', compatibleSpots)
      return { spots: compatibleSpots }
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes (延長)
    gcTime: 10 * 60 * 1000, // 10 minutes (延長)
    refetchInterval: 5 * 60 * 1000, // 5分間隔に延長（重要な変更）
    refetchIntervalInBackground: false, // バックグラウンド更新を無効化
    refetchOnWindowFocus: false, // フォーカス時の更新を無効化
    refetchOnMount: true, // マウント時のみ更新
    retry: 1, // リトライ回数を削減
    retryDelay: 2000 // 固定遅延に変更
  })
}

// Activation alerts
// TODO: 将来API側に hours_ahead パラメータを追加予定
// - 1日先までのアラートのみ取得するよう制限
// - クライアント側の時間フィルタリング処理を削減
export const useActivationAlerts = (params: {
  hours_ago?: number
  hours_ahead?: number // TODO: 将来追加予定
  limit?: number
} = {}) => {
  return useQuery({
    queryKey: ['alerts', 'activation', params],
    queryFn: () => APIService.getActivationAlerts(params),
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes (延長)
    gcTime: 20 * 60 * 1000, // 20 minutes (延長)
    refetchInterval: 10 * 60 * 1000, // 10分間隔に延長（重要な変更）
    refetchIntervalInBackground: false, // バックグラウンド更新を無効化
    refetchOnWindowFocus: false, // フォーカス時の更新を無効化
    refetchOnMount: true, // マウント時のみ更新
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
  // More accurate bounds calculation for web mercator projection
  // Based on typical web map tile calculations
  const latRad = center.lat * Math.PI / 180
  
  // Calculate the extent in degrees based on zoom level
  // At zoom 0, the map shows the entire world (360 degrees longitude, ~170 degrees latitude)
  // Each zoom level halves the visible area
  const baseLatExtent = 85.0511 // Web Mercator max latitude
  const baseLngExtent = 180
  
  const latExtent = baseLatExtent / Math.pow(2, zoom - 1)
  const lngExtent = baseLngExtent / Math.pow(2, zoom - 1)
  
  const bounds = {
    min_lat: Math.max(-85.0511, center.lat - latExtent),
    max_lat: Math.min(85.0511, center.lat + latExtent),
    min_lon: Math.max(-180, center.lng - lngExtent),
    max_lon: Math.min(180, center.lng + lngExtent),
  }
  
  const DEBUG = false // デバッグログ制御
  if (DEBUG) console.log('useMapBounds: Calculated bounds for zoom', zoom, ':', bounds)
  return bounds
}