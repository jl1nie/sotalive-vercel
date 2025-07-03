import { useState, useCallback } from 'react'
import { GeocodingService } from '@/services/geocodingService'
import type { ReverseGeocodeResult, ElevationResult } from '@/services/geocodingService'

// Re-export types for backward compatibility
export type { ReverseGeocodeResult, ElevationResult }

interface UseReverseGeocoderOptions {
  useYahoo?: boolean
  enableElevation?: boolean
  enableMapcode?: boolean
}

/**
 * リバースジオコーディング Hook - GeocodingServiceのReactラッパー
 * UI状態管理（loading, error）のみを担当し、実際の処理はGeocodingServiceに委譲
 */
export function useReverseGeocoder(options: UseReverseGeocoderOptions = {}) {
  const {
    useYahoo = false,
    enableElevation = true,
    enableMapcode = false
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // メインリバースジオコーディング関数 - GeocodingServiceに委譲
  const reverseGeocode = useCallback(async (
    lat: number,
    lng: number,
    includeElevation: boolean = true
  ): Promise<ReverseGeocodeResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await GeocodingService.reverseGeocode(lat, lng, {
        includeElevation: includeElevation && enableElevation,
        useYahoo,
        includeMapcode: enableMapcode
      })
      
      setIsLoading(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [useYahoo, enableElevation, enableMapcode])

  // 標高取得 - GeocodingServiceに委譲
  const getElevation = useCallback(async (lat: number, lng: number): Promise<ElevationResult> => {
    return GeocodingService.getElevation(lat, lng)
  }, [])

  // Mapcode取得 - GeocodingServiceに委譲
  const getMapcode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    return GeocodingService.getMapcode(lat, lng)
  }, [])

  // キャッシュクリア - GeocodingServiceに委譲
  const clearCache = useCallback(() => {
    GeocodingService.clearCache()
  }, [])

  return {
    reverseGeocode,
    getElevation,
    getMapcode,
    isLoading,
    error,
    clearCache
  }
}