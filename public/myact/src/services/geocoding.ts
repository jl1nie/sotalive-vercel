import type { GeocodingResult, LatLng } from '@/types'

// GSI (Geospatial Information Authority of Japan) reverse geocoding
export class GSIGeocodingService {
  private static readonly BASE_URL = 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress'

  static async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
    try {
      const url = `${this.BASE_URL}?lat=${lat}&lon=${lng}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`GSI API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        
        return {
          prefecture: result.muniCd?.substring(0, 2) || '',
          municipality: result.lv01Nm || '',
          jccCode: null, // GSI doesn't provide JCC directly
          jcgCode: null, // GSI doesn't provide JCG directly
          wardCode: null,
          hamlogCode: null,
          jccText: '',
          jcgText: '',
          maidenhead: this.calculateMaidenhead(lat, lng),
          elevation: undefined, // Will be fetched separately
          hsrc: 'GSI',
          areacode: undefined,
          errors: 'OK'
        }
      } else {
        return {
          prefecture: '',
          municipality: '',
          jccCode: null,
          jcgCode: null,
          wardCode: null,
          hamlogCode: null,
          jccText: '',
          jcgText: '',
          maidenhead: this.calculateMaidenhead(lat, lng),
          hsrc: 'GSI',
          areacode: undefined,
          errors: 'NO_RESULT'
        }
      }
    } catch (error) {
      console.error('GSI geocoding error:', error)
      return null
    }
  }

  // Calculate Maidenhead locator from coordinates
  private static calculateMaidenhead(lat: number, lng: number): string {
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
}

// DEM (Digital Elevation Model) service for elevation data
export class DEMService {
  private static readonly BASE_URL = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php'

  static async getElevation(lat: number, lng: number): Promise<number | null> {
    try {
      const url = `${this.BASE_URL}?lon=${lng}&lat=${lat}&outtype=JSON`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`DEM API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.elevation !== null && data.elevation !== 'e') {
        return Math.round(Number(data.elevation))
      }
      
      return null
    } catch (error) {
      console.error('DEM elevation error:', error)
      return null
    }
  }
}

// Combined geocoding service that uses multiple sources
export class GeocodingService {
  static async reverseGeocode(position: LatLng, includeElevation = true): Promise<GeocodingResult | null> {
    try {
      // Get basic geocoding info from GSI
      const geoResult = await GSIGeocodingService.reverseGeocode(position.lat, position.lng)
      
      if (!geoResult) {
        return null
      }

      // Get elevation data if requested
      if (includeElevation) {
        const elevation = await DEMService.getElevation(position.lat, position.lng)
        if (elevation !== null) {
          geoResult.elevation = elevation
        }
      }

      // Check if position is outside Japan
      if (position.lat < 24 || position.lat > 46 || position.lng < 123 || position.lng > 146) {
        geoResult.errors = 'OUTSIDE_JA'
        return geoResult
      }

      return geoResult
    } catch (error) {
      console.error('Geocoding service error:', error)
      return null
    }
  }

  // Get MapCode (requires external service - placeholder implementation)
  static async getMapCode(_lat: number, _lng: number): Promise<string | null> {
    try {
      // This would need to integrate with a MapCode service
      // For now, return null as this requires a paid service
      return null
    } catch (error) {
      console.error('MapCode error:', error)
      return null
    }
  }
}

// Yahoo Geocoding Service (requires API key - placeholder)
export class YahooGeocodingService {
  private static readonly BASE_URL = 'https://map.yahooapis.jp/geocode/V1/reverseGeoCoder'
  private static readonly API_KEY = '' // Would need to be configured

  static async reverseGeocode(_lat: number, _lng: number): Promise<GeocodingResult | null> {
    if (!this.API_KEY) {
      console.warn('Yahoo API key not configured')
      return null
    }

    try {
      const url = `${this.BASE_URL}?lat=${_lat}&lon=${_lng}&appid=${this.API_KEY}&output=json`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Yahoo API error: ${response.status}`)
      }

      await response.json()
      
      // Process Yahoo API response
      // Implementation would depend on Yahoo API response format
      
      return null // Placeholder
    } catch (error) {
      console.error('Yahoo geocoding error:', error)
      return null
    }
  }
}