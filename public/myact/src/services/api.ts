// API service for SOTA App API v2
// Anti-Corruption Layer: API → Internal Domain Model conversion

import type { 
  SummitSearchResponse, 
  ParkSearchResponse, 
  SearchInBoundsResponse,
  SpotResponse,
  SpotValue,
  ReferenceSearchResponse,
  ReferenceSearchDetailResponse
} from '../types/api'
import type { Summit, Park, Spot } from '../types'

const SOTA_APP_API_BASE = 'https://sotaapp2.sotalive.net/api/v2'

export class APIService {
  private static _baseURL = SOTA_APP_API_BASE

  // Expose baseURL for tests
  static get baseURL() {
    return this._baseURL
  }

  private static async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: FormData | Record<string, string | number | boolean>
  ): Promise<T | null> {
    const DEBUG = false // デバッグログ制御
    try {
      // Don't encode the endpoint as it contains query parameters
      const url = `${this._baseURL}${endpoint}`
      if (DEBUG) console.log('APIService: Making request to:', url)
      
      const options: RequestInit = {
        method,
        headers: method !== 'POST' && method !== 'PUT' ? undefined : {},
      }

      if (method === 'POST' || method === 'PUT') {
        options.body = data instanceof FormData ? data : JSON.stringify(data)
        if (!(data instanceof FormData)) {
          (options.headers as Record<string, string>)['Content-Type'] = 'application/json'
        }
      }

      const response = await fetch(url, options)
      
      if (DEBUG) console.log('APIService: Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        if (DEBUG) console.error('APIService: Error response:', errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      if (method === 'DELETE') {
        return {} as T
      }

      const responseData = await response.json()
      if (DEBUG) console.log('APIService: Response data:', responseData)
      return responseData
    } catch (error) {
      console.error(`API ${endpoint} request failed:`, error)
      throw error
    }
  }

  // Geomagnetic data
  static async getGeomagneticData() {
    return this.request('/propagation/geomag')
  }

  // Summit search with Anti-Corruption Layer
  static async searchSummits(params: {
    lat: number
    lon: number
    dist?: number
    log_id?: string
  }): Promise<Summit[]> {
    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      dist: (params.dist || 200).toString(),
      ...(params.log_id && { log_id: params.log_id }),
    })
    const response = await this.request<SummitSearchResponse[]>(`/sota/summits/search?${query}`)
    return response ? response.map(this.transformSummitResponse) : []
  }

  // Park search with Anti-Corruption Layer
  static async searchParks(params: {
    pota_code?: string
    log_id?: string
  }): Promise<Park[]> {
    const query = new URLSearchParams({
      ...(params.pota_code && { pota_code: params.pota_code }),
      ...(params.log_id && { log_id: params.log_id }),
    })
    const response = await this.request<ParkSearchResponse[]>(`/pota/parks/search?${query}`)
    return response ? response.map(this.transformParkResponse) : []
  }

  // Search summits and parks in bounding box with Anti-Corruption Layer
  static async searchInBounds(params: {
    min_lat: number
    min_lon: number
    max_lat: number
    max_lon: number
    min_elev?: number
    min_area?: number
    log_id?: string
  }): Promise<{ summits: Summit[], parks: Park[] }> {
    const query = new URLSearchParams({
      min_lat: params.min_lat.toString(),
      min_lon: params.min_lon.toString(),
      max_lat: params.max_lat.toString(),
      max_lon: params.max_lon.toString(),
      min_elev: (params.min_elev || 0).toString(),
      min_area: (params.min_area || 0).toString(),
      ...(params.log_id && { log_id: params.log_id }),
    })
    const response = await this.request<SearchInBoundsResponse>(`/search?${query}`)
    return {
      summits: response?.sota ? response.sota.map(this.transformSummitResponse) : [],
      parks: response?.pota ? response.pota.map(this.transformParkResponse) : []
    }
  }

  // Get activation spots with Anti-Corruption Layer
  static async getActivationSpots(params: {
    pat_ref?: string
    log_id?: string
    by_call?: boolean
    by_ref?: boolean
    hours_ago?: number
  }): Promise<Spot[]> {
    const query = new URLSearchParams({
      ...(params.pat_ref && { pat_ref: params.pat_ref }),
      ...(params.log_id && { log_id: params.log_id }),
      ...(params.by_call !== undefined && { by_call: params.by_call ? 'true' : 'null' }),
      ...(params.by_ref !== undefined && { by_ref: params.by_ref ? 'true' : 'null' }),
      hours_ago: (params.hours_ago || 6).toString(),
    })
    const response = await this.request<SpotResponse>(`/activation/spots?${query}`)
    return response?.spots ? this.transformSpotResponse(response.spots) : []
  }

  // Get activation alerts
  // TODO: 将来 hours_ahead パラメータを追加予定（例: 24時間先まで）
  static async getActivationAlerts(params: {
    hours_ago?: number
    hours_ahead?: number // TODO: 将来実装予定
    limit?: number
  } = {}) {
    const query = new URLSearchParams({
      hours_ago: (params.hours_ago || 24).toString(),
      limit: (params.limit || 100).toString(),
    })
    return this.request(`/activation/alerts?${query}`)
  }

  // Get APRS tracks
  static async getAPRSTracks(params: {
    pat_ref?: string
    hours_ago?: number
  }) {
    const query = new URLSearchParams({
      ...(params.pat_ref && { pat_ref: params.pat_ref }),
      hours_ago: (params.hours_ago || 24).toString(),
    })
    return this.request(`/activation/aprs/track?${query}`)
  }

  // POTA Log management
  static async uploadPOTALog(
    activatorUuid: string | null,
    hunterUuid: string | null,
    formData: FormData
  ) {
    return this.request(`/pota/log/${activatorUuid}/${hunterUuid}`, 'POST', formData)
  }

  static async getPOTALog(logId: string) {
    return this.request(`/pota/log/${logId}`)
  }

  static async deletePOTALog(logId: string) {
    return this.request(`/pota/log/${logId}`, 'DELETE')
  }

  static async sharePOTALog(
    activatorUuid: string | null,
    hunterUuid: string | null
  ) {
    return this.request(`/pota/log-share/${activatorUuid}/${hunterUuid}`)
  }

  static async importSharedPOTALog(shareKey: string) {
    return this.request(`/pota/log-share/${shareKey}`)
  }

  static async getPOTALogStats() {
    return this.request('/pota/log-stat')
  }

  // Reference search with Anti-Corruption Layer
  static async searchReference(name: string): Promise<{ summits: Summit[], parks: Park[] }> {
    const query = new URLSearchParams({ name })
    const response = await this.request<ReferenceSearchResponse>(`/search/brief?${query}`)
    return this.transformReferenceSearchResponse(response)
  }

  // Reference search with full details (for popups)
  static async searchReferenceDetails(name: string): Promise<{ summits: Summit[], parks: Park[] }> {
    const query = new URLSearchParams({ name })
    const response = await this.request<ReferenceSearchDetailResponse>(`/search/full?${query}`)
    return this.transformReferenceDetailResponse(response)
  }

  // Search nearest summit within 200m with Anti-Corruption Layer
  static async searchNearestSummit(lat: number, lon: number, dist: number = 200): Promise<Summit[]> {
    // 座標パラメータの検証
    if (!lat || !lon || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180 ||
        isNaN(lat) || isNaN(lon)) {
      throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`)
    }
    
    if (dist <= 0 || dist > 10000 || isNaN(dist)) {
      throw new Error(`Invalid distance parameter: dist=${dist}`)
    }
    
    const query = new URLSearchParams({
      lat: lat.toFixed(6), // 小数点以下6桁に制限
      lon: lon.toFixed(6), // 小数点以下6桁に制限
      dist: dist.toString()
    })
    const response = await this.request<SummitSearchResponse[]>(`/sota/summits/search?${query}`)
    return response ? response.map(this.transformSummitResponse) : []
  }

  // Additional methods for integration tests
  static async getSummitDetails(reference: string) {
    return this.request(`/summit/${reference}`)
  }

  static async getParkDetails(reference: string) {
    return this.request(`/park/${reference}`)
  }

  static async getCurrentSpots(): Promise<Spot[]> {
    return this.getActivationSpots({ 
      pat_ref: 'JA',  // Pattern for Japan SOTA/POTA
      hours_ago: 6 
    })
  }

  static async reverseGeocode(_lat: number, _lon: number) {
    // This would call external geocoding service
    throw new Error('Reverse geocoding not implemented in integration test')
  }

  static async getElevation(_lat: number, _lon: number) {
    // This would call external DEM service  
    throw new Error('Elevation service not implemented in integration test')
  }

  // === Anti-Corruption Layer: API Response Transformers ===

  /**
   * Transform Summit API response to internal Summit model
   * Handles field name variations and ensures type safety
   */
  private static transformSummitResponse(response: SummitSearchResponse): Summit {
    return {
      summitCode: response.code || response.summit_code || response.summitCode || '',
      summitName: response.name || response.summit_name || response.summitName || '',
      summitNameJ: response.nameJ || response.summit_name_j || response.summitNameJ,
      latitude: response.lat || response.latitude || 0,
      longitude: response.lon || response.longitude || 0,
      altM: response.alt || response.altM || 0,
      points: response.pts || response.points || 0,
      bonusPoints: response.bonus_points || response.bonusPoints || 0,
      activationCount: response.count || response.activationCount || 0,
      activationDate: response.activation_date || response.activationDate,
      activationCall: response.activation_call || response.activationCall,
      cityJ: response.city_j || response.cityJ,
      maidenhead: response.maidenhead || ''
    }
  }

  /**
   * Transform Park API response to internal Park model
   * Handles field name variations and ensures type safety
   */
  private static transformParkResponse(response: ParkSearchResponse): Park {
    return {
      potaCode: response.pota || '',
      wwffCode: response.wwff || undefined,
      parkNameJ: response.nameJ || response.name_j || response.name || '',
      latitude: response.lat || response.latitude || 0,
      longitude: response.lon || response.longitude || 0,
      date: response.date,
      locid: response.locid,
      act: response.act,
      qsos: response.qsos,
      activations: response.activations || response.act || undefined,
      attempts: response.attempts || response.atmpt || undefined
    }
  }

  /**
   * Transform Spot API response to internal Spot models
   * Flattens grouped API response into individual spot records
   */
  private static transformSpotResponse(spotGroups: Array<{ key: string, values: SpotValue[] }>): Spot[] {
    const spots: Spot[] = []
    
    for (const group of spotGroups) {
      for (const value of group.values) {
        spots.push({
          activator: value.activator || '',
          activatorName: value.activatorName,
          comment: value.comment || '',
          frequency: value.frequency || '',
          mode: value.mode || '',
          program: value.program,
          qsos: value.qsos,
          reference: value.reference || '',
          referenceDetail: value.referenceDetail || '',
          spotId: value.spotId,
          spotTime: value.spotTime || '',
          spotter: value.spotter || ''
        })
      }
    }
    
    return spots
  }

  /**
   * Transform Reference Search API response to internal models
   * Separates SOTA summits and POTA parks based on reference code pattern
   */
  private static transformReferenceSearchResponse(response: ReferenceSearchResponse | null): { summits: Summit[], parks: Park[] } {
    if (!response?.candidates) {
      return { summits: [], parks: [] }
    }

    const summits: Summit[] = []
    const parks: Park[] = []

    for (const candidate of response.candidates) {
      // Determine program type based on reference code pattern
      // SOTA references: JA/XX-### format
      // POTA references: JP-### or JAFF-### format
      const isSOTA = /^JA\/[A-Z]{2}-\d+$/.test(candidate.code)
      const isPOTA = /^(JP-\d+|JAFF-\d+)/.test(candidate.code)
      
      if (candidate.program === 'SOTA' || (isSOTA && !candidate.program)) {
        summits.push({
          summitCode: candidate.code,
          summitName: candidate.name,
          latitude: candidate.lat,
          longitude: candidate.lon,
          altM: 0, // Brief search doesn't include altitude
          points: 0, // Brief search doesn't include points
          bonusPoints: 0,
          activationCount: 0,
          maidenhead: ''
        })
      } else if (candidate.program === 'POTA' || (isPOTA && !candidate.program)) {
        parks.push({
          potaCode: candidate.code,
          parkNameJ: candidate.name,
          latitude: candidate.lat,
          longitude: candidate.lon
        })
      }
    }

    return { summits, parks }
  }

  /**
   * Transform Reference Detail Search API response to internal models
   * Includes detailed information from full API response
   */
  private static transformReferenceDetailResponse(response: ReferenceSearchDetailResponse | null): { summits: Summit[], parks: Park[] } {
    if (!response?.candidates) {
      return { summits: [], parks: [] }
    }

    const summits: Summit[] = []
    const parks: Park[] = []

    for (const candidate of response.candidates) {
      if (candidate.program === 'SOTA') {
        summits.push({
          summitCode: candidate.code,
          summitName: candidate.name,
          summitNameJ: candidate.nameJ,
          latitude: candidate.lat,
          longitude: candidate.lon,
          altM: candidate.alt || candidate.altM || 0,
          points: candidate.pts || candidate.points || 0,
          bonusPoints: candidate.bonusPts || candidate.bonusPoints || 0,
          activationCount: candidate.count || candidate.activationCount || 0,
          activationDate: candidate.date || candidate.activationDate,
          activationCall: candidate.call || candidate.activationCall,
          cityJ: candidate.city || candidate.cityJ,
          maidenhead: candidate.maidenhead || ''
        })
      } else if (candidate.program === 'POTA') {
        parks.push({
          potaCode: candidate.potaCode || candidate.code,
          wwffCode: candidate.wwffCode,
          parkNameJ: candidate.parkNameJ || candidate.parkName || candidate.name,
          latitude: candidate.lat,
          longitude: candidate.lon,
          activations: candidate.activations,
          attempts: candidate.attempts,
          qsos: candidate.qsos
        })
      }
    }

    return { summits, parks }
  }

  /**
   * Fetch TopoJSON data for park areas
   * Unified method to replace direct fetch() usage in components
   */
  static async fetchTopoJSON(url: string): Promise<any | null> {
    const DEBUG = false // デバッグログ制御
    try {
      if (DEBUG) console.log('🟢 APIService.fetchTopoJSON: Starting to load', url)
      
      const response = await fetch(url)
      if (DEBUG) console.log('🟢 APIService.fetchTopoJSON: Fetch response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (DEBUG) console.log('🟢 APIService.fetchTopoJSON: JSON parsed, object keys:', Object.keys(data.objects || {}))
      
      return data
    } catch (error) {
      console.error('🔴 APIService.fetchTopoJSON: Failed to load TopoJSON:', error)
      return null
    }
  }

  /**
   * Search for nearest summits within distance
   * Used for summit detail information lookup
   */
  static async searchNearestSummits(latitude: number, longitude: number, distance: number = 200): Promise<any[] | null> {
    try {
      const searchUrl = `${this._baseURL}/sota/summits/search?lat=${latitude}&lon=${longitude}&dist=${distance}`
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const searchResults = await response.json()
      return Array.isArray(searchResults) ? searchResults : []
    } catch (error) {
      console.error('APIService.searchNearestSummits: Failed to search summits:', error)
      return null
    }
  }

  /**
   * Fetch static JSON data (general purpose)
   * Can be used for other JSON resources beyond TopoJSON
   */
  static async fetchStaticJSON<T = any>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('APIService.fetchStaticJSON: Failed to load JSON:', error)
      return null
    }
  }
}