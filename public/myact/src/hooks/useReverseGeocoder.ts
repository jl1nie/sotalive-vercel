import { useState, useCallback, useRef } from 'react'

// API エンドポイント
const ENDPOINTS = {
  GSI_REVERSE: 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress',
  YAHOO_REVERSE: 'https://www.sotalive.net/api/reverse-geocoder/LonLatToAddressMapCode',
  GSI_ELEVATION: 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php',
  MUNI_DATA: 'https://sotaapp2.sotalive.net/api/v2/locator/jcc-jcg',
  MAPCODE: 'https://japanmapcode.com/mapcode'
} as const

// 型定義
export interface ReverseGeocodeResult {
  errors: 'OK' | 'OUTSIDE_JA' | 'ERROR'
  municipality?: string
  address?: string
  muniCode?: string
  jcc?: string
  jcg?: string
  maidenhead?: string | null
  elevation?: string
  hsrc?: string
  mapcode?: string
}

export interface ElevationResult {
  elevation: string
  hsrc: string
  errors: 'OK' | 'OUTSIDE_JA' | 'ERROR'
}

interface UseReverseGeocoderOptions {
  useYahoo?: boolean
  enableElevation?: boolean
  cacheSize?: number
}

interface CacheEntry {
  promise: Promise<ReverseGeocodeResult>
  timestamp: number
}

/**
 * リバースジオコーディング Hook
 * 座標から住所・自治体コード・標高情報を取得
 */
export function useReverseGeocoder(options: UseReverseGeocoderOptions = {}) {
  const {
    useYahoo = false,
    enableElevation = true,
    cacheSize = 16
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // キャッシュ（Map で LRU 実装）
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())
  const elevationCacheRef = useRef<Map<string, Promise<ElevationResult>>>(new Map())

  // キャッシュ管理
  const manageCache = useCallback((cache: Map<string, any>, key: string, value: any) => {
    if (cache.size >= cacheSize) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }
    cache.set(key, value)
  }, [cacheSize])

  // Mapcode 取得
  const getMapcode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(ENDPOINTS.MAPCODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lng, lat })
      })
      
      if (!response.ok) throw new Error('Network response was not ok')
      
      const result = await response.json()
      return result.mapcode
    } catch (error) {
      console.error('Mapcode fetch error:', error)
      return null
    }
  }, [])

  // 標高取得
  const getElevation = useCallback(async (lat: number, lng: number): Promise<ElevationResult> => {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    // キャッシュチェック
    if (elevationCacheRef.current.has(cacheKey)) {
      return elevationCacheRef.current.get(cacheKey)!
    }

    const elevationPromise = (async (): Promise<ElevationResult> => {
      try {
        const url = `${ENDPOINTS.GSI_ELEVATION}${cacheKey}&outtype=JSON`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()
        
        return {
          elevation: result.elevation || '-----',
          hsrc: result.hsrc || '-----',
          errors: result.elevation === '-----' ? 'OUTSIDE_JA' : 'OK'
        }
      } catch (error) {
        console.error('Elevation fetch error:', error)
        return {
          elevation: '-----',
          hsrc: '-----',
          errors: 'OUTSIDE_JA'
        }
      }
    })()

    manageCache(elevationCacheRef.current, cacheKey, elevationPromise)
    return elevationPromise
  }, [manageCache])

  // GSI リバースジオコーディング
  const reverseGeocodeGSI = useCallback(async (
    lat: number, 
    lng: number, 
    includeElevation: boolean
  ): Promise<ReverseGeocodeResult> => {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    try {
      // 並列処理：標高取得
      const elevationPromise = includeElevation 
        ? getElevation(lat, lng) 
        : Promise.resolve(null)

      // 逆ジオコーディング
      const reverseResponse = await fetch(`${ENDPOINTS.GSI_REVERSE}${cacheKey}`)
      const reverseResult = await reverseResponse.json()

      // 自治体コード取得
      const muniCode = reverseResult?.results?.muniCd 
        ? `&muni_code=${reverseResult.results.muniCd}` 
        : ''
      const muniResponse = await fetch(`${ENDPOINTS.MUNI_DATA}${cacheKey}${muniCode}`)
      const muniResult = await muniResponse.json()

      if (!muniResult.muniCode) {
        return {
          errors: 'OUTSIDE_JA',
          maidenhead: muniResult.maidenhead
        }
      }

      // 地名追加
      let municipality = muniResult.municipality || ''
      if (reverseResult?.results?.lv01Nm && reverseResult.results.lv01Nm !== "−") {
        municipality += reverseResult.results.lv01Nm
      }

      const result: ReverseGeocodeResult = {
        errors: 'OK',
        municipality,
        address: reverseResult?.results?.muniCd ? municipality : undefined,
        muniCode: muniResult.muniCode,
        jcc: muniResult.jcc,
        jcg: muniResult.jcg,
        maidenhead: muniResult.maidenhead
      }

      // 標高情報追加
      if (includeElevation) {
        const elevationResult = await elevationPromise
        if (elevationResult) {
          result.elevation = elevationResult.elevation
          result.hsrc = elevationResult.hsrc
          
          if (elevationResult.elevation === '-----') {
            result.errors = 'OUTSIDE_JA'
          }
        }
      }

      return result
    } catch (error) {
      console.error('GSI reverse geocoding error:', error)
      return {
        errors: 'ERROR',
        maidenhead: null
      }
    }
  }, [getElevation])

  // Yahoo! リバースジオコーディング
  const reverseGeocodeYahoo = useCallback(async (
    lat: number, 
    lng: number, 
    includeElevation: boolean
  ): Promise<ReverseGeocodeResult> => {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    try {
      // 並列処理：標高取得
      const elevationPromise = includeElevation && enableElevation
        ? getElevation(lat, lng) 
        : Promise.resolve(null)

      // Yahoo! 逆ジオコーディング
      const response = await fetch(`${ENDPOINTS.YAHOO_REVERSE}${cacheKey}`)
      const result = await response.json()

      if (result.errors !== 'OK') {
        return {
          errors: 'OUTSIDE_JA',
          maidenhead: result.maidenhead
        }
      }

      // 標高情報追加
      if (includeElevation) {
        if (enableElevation) {
          const elevationResult = await elevationPromise
          if (elevationResult) {
            result.elevation = elevationResult.elevation
            result.hsrc = elevationResult.hsrc
            
            if (elevationResult.elevation === '-----') {
              result.errors = 'OUTSIDE_JA'
            }
          }
        } else {
          result.elevation = '-----'
          result.hsrc = '-----'
        }
      }

      return result
    } catch (error) {
      console.error('Yahoo reverse geocoding error:', error)
      return {
        errors: 'ERROR',
        maidenhead: null
      }
    }
  }, [getElevation, enableElevation])

  // メインリバースジオコーディング関数
  const reverseGeocode = useCallback(async (
    lat: number,
    lng: number,
    includeElevation: boolean = true
  ): Promise<ReverseGeocodeResult> => {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    // キャッシュチェック
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      return cached.promise
    }

    setIsLoading(true)
    setError(null)

    const geocodePromise = useYahoo 
      ? reverseGeocodeYahoo(lat, lng, includeElevation)
      : reverseGeocodeGSI(lat, lng, includeElevation)

    // キャッシュに保存
    manageCache(cacheRef.current, cacheKey, {
      promise: geocodePromise,
      timestamp: Date.now()
    })

    try {
      const result = await geocodePromise
      setIsLoading(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [useYahoo, reverseGeocodeGSI, reverseGeocodeYahoo, manageCache])

  // キャッシュクリア
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    elevationCacheRef.current.clear()
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