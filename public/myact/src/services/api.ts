// API service for SOTA App API v2

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
    data?: FormData | Record<string, any>
  ): Promise<T | null> {
    try {
      const encodedEndpoint = endpoint.split('/').map(part => encodeURIComponent(part)).join('/')
      const url = `${this._baseURL}${encodedEndpoint}`
      
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
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      if (method === 'DELETE') {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      console.error(`API ${endpoint} request failed:`, error)
      return null
    }
  }

  // Geomagnetic data
  static async getGeomagneticData() {
    return this.request('/propagation/geomag')
  }

  // Summit search
  static async searchSummits(params: {
    lat: number
    lon: number
    dist?: number
    log_id?: string
  }) {
    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      dist: (params.dist || 200).toString(),
      ...(params.log_id && { log_id: params.log_id }),
    })
    return this.request(`/sota/summits/search?${query}`)
  }

  // Park search
  static async searchParks(params: {
    pota_code?: string
    log_id?: string
  }) {
    const query = new URLSearchParams({
      ...(params.pota_code && { pota_code: params.pota_code }),
      ...(params.log_id && { log_id: params.log_id }),
    })
    return this.request(`/pota/parks/search?${query}`)
  }

  // Search summits and parks in bounding box
  static async searchInBounds(params: {
    min_lat: number
    min_lon: number
    max_lat: number
    max_lon: number
    min_elev?: number
    min_area?: number
    log_id?: string
  }) {
    const query = new URLSearchParams({
      min_lat: params.min_lat.toString(),
      min_lon: params.min_lon.toString(),
      max_lat: params.max_lat.toString(),
      max_lon: params.max_lon.toString(),
      min_elev: (params.min_elev || 0).toString(),
      min_area: (params.min_area || 0).toString(),
      ...(params.log_id && { log_id: params.log_id }),
    })
    return this.request(`/search?${query}`)
  }

  // Get activation spots
  static async getActivationSpots(params: {
    pat_ref?: string
    log_id?: string
    by_call?: boolean
    by_ref?: boolean
    hours_ago?: number
  }) {
    const query = new URLSearchParams({
      ...(params.pat_ref && { pat_ref: params.pat_ref }),
      ...(params.log_id && { log_id: params.log_id }),
      ...(params.by_call !== undefined && { by_call: params.by_call ? 'true' : 'null' }),
      ...(params.by_ref !== undefined && { by_ref: params.by_ref ? 'true' : 'null' }),
      hours_ago: (params.hours_ago || 6).toString(),
    })
    return this.request(`/activation/spots?${query}`)
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

  // Reference search
  static async searchReference(name: string) {
    const query = new URLSearchParams({ name })
    return this.request(`/search/brief?${query}`)
  }

  // Additional methods for integration tests
  static async getSummitDetails(reference: string) {
    return this.request(`/summit/${reference}`)
  }

  static async getParkDetails(reference: string) {
    return this.request(`/park/${reference}`)
  }

  static async getCurrentSpots() {
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
}