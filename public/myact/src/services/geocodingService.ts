/**
 * 統合GISサービス: リバースジオコーディング、標高取得、地理情報処理
 * useReverseGeocoder.ts と geocoding.ts の重複機能を統合
 */

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
  prefecture?: string
  municipality?: string
  address?: string
  muniCode?: string
  jccCode?: string
  jccText?: string
  wardCode?: string | null
  jcgCode?: string | null
  jcgText?: string
  hamlogCode?: string
  maidenhead?: string | null
  elevation?: string
  hsrc?: string
  mapcode?: string
  areacode?: string
}

export interface ElevationResult {
  elevation: string
  hsrc: string
  errors: 'OK' | 'OUTSIDE_JA' | 'ERROR'
}

interface CacheEntry<T> {
  promise: Promise<T>
  timestamp: number
}

/**
 * 統合GISサービス - サーバーサイド対応のstaticメソッド実装
 * React Hook機能をサービス層に移動し、キャッシュ機能も統合
 */
export class GeocodingService {
  private static reverseCache = new Map<string, CacheEntry<ReverseGeocodeResult>>()
  private static elevationCache = new Map<string, CacheEntry<ElevationResult>>()
  private static readonly DEFAULT_CACHE_SIZE = 16

  /**
   * キャッシュ管理（LRU方式）
   */
  private static manageCache<T>(cache: Map<string, T>, key: string, value: T, maxSize = this.DEFAULT_CACHE_SIZE) {
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }
    cache.set(key, value)
  }

  /**
   * Mapcode 取得
   */
  static async getMapcode(lat: number, lng: number): Promise<string | null> {
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
  }

  /**
   * 標高取得（GSI DEM API）
   */
  static async getElevation(lat: number, lng: number): Promise<ElevationResult> {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    // キャッシュチェック
    if (this.elevationCache.has(cacheKey)) {
      return this.elevationCache.get(cacheKey)!.promise
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

    this.manageCache(this.elevationCache, cacheKey, {
      promise: elevationPromise,
      timestamp: Date.now()
    })
    return elevationPromise
  }

  /**
   * GSI リバースジオコーディング
   */
  static async reverseGeocodeGSI(
    lat: number, 
    lng: number, 
    includeElevation: boolean = true
  ): Promise<ReverseGeocodeResult> {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    try {
      // 並列処理：標高取得
      const elevationPromise = includeElevation 
        ? this.getElevation(lat, lng) 
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
        jccCode: muniResult.jcc,
        jccText: muniResult.jccText || '',
        jcgCode: muniResult.jcg,
        jcgText: muniResult.jcgText || '',
        hamlogCode: muniResult.hamlogCode || '',
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
  }

  /**
   * Yahoo! リバースジオコーディング
   */
  static async reverseGeocodeYahoo(
    lat: number, 
    lng: number, 
    includeElevation: boolean = true
  ): Promise<ReverseGeocodeResult> {
    const cacheKey = `?lat=${lat}&lon=${lng}`
    
    try {
      // 並列処理：標高取得
      const elevationPromise = includeElevation
        ? this.getElevation(lat, lng) 
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

      return result
    } catch (error) {
      console.error('Yahoo reverse geocoding error:', error)
      return {
        errors: 'ERROR',
        maidenhead: null
      }
    }
  }

  /**
   * メインリバースジオコーディング関数
   */
  static async reverseGeocode(
    lat: number,
    lng: number,
    options: {
      includeElevation?: boolean
      useYahoo?: boolean
      includeMapcode?: boolean
    } = {}
  ): Promise<ReverseGeocodeResult> {
    const { 
      includeElevation = true, 
      useYahoo = false,
      includeMapcode = false
    } = options
    
    const cacheKey = `${lat}-${lng}-${includeElevation}-${useYahoo}`
    
    // キャッシュチェック
    const cached = this.reverseCache.get(cacheKey)
    if (cached) {
      return cached.promise
    }

    const geocodePromise = useYahoo 
      ? this.reverseGeocodeYahoo(lat, lng, includeElevation)
      : this.reverseGeocodeGSI(lat, lng, includeElevation)

    // キャッシュに保存
    this.manageCache(this.reverseCache, cacheKey, {
      promise: geocodePromise,
      timestamp: Date.now()
    })

    const result = await geocodePromise

    // Mapcode取得（オプション）
    if (includeMapcode && result.errors === 'OK') {
      try {
        result.mapcode = await this.getMapcode(lat, lng) || undefined
      } catch (error) {
        console.error('Failed to get mapcode:', error)
      }
    }

    return result
  }

  /**
   * Maidenhead locator計算
   */
  static calculateMaidenhead(lat: number, lng: number): string {
    const adjustedLng = lng + 180
    const adjustedLat = lat + 90

    const field1 = String.fromCharCode(65 + Math.floor(adjustedLng / 20))
    const field2 = String.fromCharCode(65 + Math.floor(adjustedLat / 10))
    const square1 = Math.floor((adjustedLng % 20) / 2)
    const square2 = Math.floor(adjustedLat % 10)
    const subsquare1 = String.fromCharCode(65 + Math.floor(((adjustedLng % 2) * 12)))
    const subsquare2 = String.fromCharCode(65 + Math.floor(((adjustedLat % 1) * 24)))

    return `${field1}${field2}${square1}${square2}${subsquare1}${subsquare2}`
  }

  /**
   * 日本国内チェック
   */
  static isInJapan(lat: number, lng: number): boolean {
    return lat >= 24 && lat <= 46 && lng >= 123 && lng <= 146
  }

  /**
   * キャッシュクリア
   */
  static clearCache(): void {
    this.reverseCache.clear()
    this.elevationCache.clear()
  }

  /**
   * キャッシュ統計情報
   */
  static getCacheStats(): { reverseCache: number, elevationCache: number } {
    return {
      reverseCache: this.reverseCache.size,
      elevationCache: this.elevationCache.size
    }
  }
}

// 後方互換性のためのエイリアス
export const GSIGeocodingService = GeocodingService
export const DEMService = GeocodingService