// API response types for SOTA App API v2

export interface GeomagneticResponse {
  aIndex: number
  kIndex: number[]
}

export interface SummitSearchResponse {
  // Actual API response fields
  code: string
  name: string
  nameJ: string
  alt: number
  lon: number
  lat: number
  pts: number
  count: number
  
  // Legacy/alternative field names
  summit_code?: string
  summitCode?: string
  summit_name?: string
  summitName?: string
  summit_name_j?: string
  summitNameJ?: string
  latitude?: number
  longitude?: number
  altM?: number
  points?: number
  bonus_points?: number
  bonusPoints?: number
  activationCount?: number
  activation_date?: string
  activationDate?: string
  activation_call?: string
  activationCall?: string
  city_j?: string
  cityJ?: string
  maidenhead?: string
}

export interface ParkSearchResponse {
  // Actual API response fields
  pota: string
  wwff: string
  name: string
  nameJ: string
  locid: string[]
  area: number
  lon: number
  lat: number
  atmpt: number | null
  act: number | null
  date: string | null
  qsos: number | null
  
  // Legacy/alternative field names
  name_j?: string
  latitude?: number
  longitude?: number
  activations?: number
  attempts?: number
}

export interface SearchInBoundsResponse {
  sota?: SummitSearchResponse[]
  pota?: ParkSearchResponse[]
}

export interface APRSTracksResponse {
  tracks: {
    properties: {
      ssid: string
      callsign: string
      lastseen: string
      distance: string
      summit: string
      spot_summit?: string
      spot_time?: string
      spot_freq?: string
      spot_mode?: string
      spot_comment?: string
    }
    geometry: {
      coordinates: [number, number][]
    }
  }[]
}

export interface SpotValue {
  activator: string
  activatorName: string | null
  comment: string
  frequency: string
  mode: string
  program: 'SOTA' | 'POTA'
  qsos: number | null
  reference: string
  referenceDetail: string
  spotId: number
  spotTime: string
  spotter: string
}

export interface SpotGroup {
  key: string
  values: SpotValue[]
}

export interface SpotResponse {
  spots: SpotGroup[]
}

export interface POTALog {
  id: string
  filename: string
  uploadDate: string
  records: number
  activatorUuid?: string
  hunterUuid?: string
  type: 'activator' | 'hunter'
  parks: string[]
}

export interface POTALogStats {
  totalLogs: number
  totalRecords: number
  uniqueParks: number
  activatorLogs: number
  hunterLogs: number
  recentUploads: POTALog[]
}

// Reference search response for brief search
export interface ReferenceSearchCandidate {
  code: string
  name: string
  lat: number
  lon: number
  program?: 'SOTA' | 'POTA'
}

// Full reference search response with detailed information (based on actual API response)
export interface ReferenceSearchDetailCandidate {
  code: string
  name: string
  nameJ?: string
  lat: number
  lon: number
  program?: 'SOTA' | 'POTA'
  // SOTA specific fields (actual API field names)
  alt?: number      // altitude in meters
  altM?: number     // alias for altitude
  pts?: number      // points
  points?: number   // alias for points
  bonusPts?: number // bonus points
  bonusPoints?: number // alias for bonus points
  count?: number    // activation count
  activationCount?: number // alias for activation count
  date?: string     // last activation date
  activationDate?: string // alias for activation date
  call?: string     // last activation call
  activationCall?: string // alias for activation call
  city?: string     // city name (Japanese)
  cityJ?: string    // alias for city
  maidenhead?: string
  // POTA specific fields
  potaCode?: string
  wwffCode?: string
  parkName?: string
  parkNameJ?: string
  area?: number
  activations?: number
  attempts?: number
  qsos?: number
}

export interface ReferenceSearchResponse {
  candidates: ReferenceSearchCandidate[]
}

export interface ReferenceSearchDetailResponse {
  candidates: ReferenceSearchDetailCandidate[]
}