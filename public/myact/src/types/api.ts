// API response types for SOTA App API v2

export interface GeomagneticResponse {
  aIndex: number
  kIndex: number[]
}

export interface SummitSearchResponse {
  summit_code?: string
  summitCode?: string
  summit_name?: string
  summitName?: string
  summit_name_j?: string
  summitNameJ?: string
  lat?: number
  latitude?: number
  lon?: number
  longitude?: number
  alt?: number
  altM?: number
  points?: number
  bonus_points?: number
  bonusPoints?: number
  count?: number
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
  pota?: string
  wwff?: string
  nameJ?: string
  name_j?: string
  lat?: number
  latitude?: number
  lon?: number
  longitude?: number
  date?: string
  locid?: string[]
  act?: number
  qsos?: number
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

export interface SpotResponse {
  spotTime: string
  activator: string
  reference: string
  frequency: string
  mode: string
  comment: string
  program: 'SOTA' | 'POTA'
}[]

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