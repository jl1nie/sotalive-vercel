// Core types for MyACT application

export interface LatLng {
  lat: number
  lng: number
  alt?: number
}

export interface Summit {
  summitCode: string
  summitName: string
  summitNameJ?: string
  latitude: number
  longitude: number
  altM: number
  points: number
  bonusPoints: number
  activationCount: number
  activationDate?: string
  activationCall?: string
  cityJ?: string
  maidenhead: string
}

export interface Park {
  potaCode: string
  wwffCode?: string
  parkNameJ: string
  latitude: number
  longitude: number
  date?: string | null
  locid?: string[]
  act?: number | null
  qsos?: number | null
  activations?: number
  attempts?: number
}


// API Alert types (from /activation/alerts)
export interface SotaAlert {
  key: string
  values: SotaAlertValue[]
}

export interface SotaAlertValue {
  activator: string
  activator_name: string | null
  alert_id: number
  comment: string | null
  end_time: string | null
  frequencies: string
  location: string
  operator: string
  poster: string | null
  program: string
  reference: string
  reference_detail: string
  start_time: string
  user_id: number
}

export interface Alert {
  alertTime: string
  activator: string
  reference: string
  frequency?: string
  comment?: string
  program: 'SOTA' | 'POTA'
}

export interface OperationAlert {
  id: string
  title: string
  reference: string
  program: 'SOTA' | 'POTA' | 'WWFF'
  operationDate: string
  frequency?: string
  mode?: string
  comment?: string
  callsign: string
  createdAt: string
  // Additional fields from API alerts
  frequencies?: string
  location?: string
  endDate?: string
}

export interface Spot {
  activator: string
  activatorName?: string | null
  comment: string
  frequency: string
  mode: string
  program: 'SOTA' | 'POTA'
  qsos?: number | null
  reference: string
  referenceDetail?: string
  spotId?: number
  spotTime: string
  spotter?: string
  // Legacy/alternative field names for compatibility
  activator_call?: string
  activatorCall?: string
  summit_code?: string
  summitCode?: string
  park_code?: string
  parkCode?: string
  time_string?: string
  timeString?: string
  time?: string
  comments?: string
}

export interface Preferences {
  popup_permanent: boolean
  display_mapcode: boolean
  link_googlemap: boolean
  by_call: boolean
  sota_ref: boolean
  pota_ref: boolean
  jaff_ref: boolean
  display_area: boolean
  aprs_track: boolean
  pilgrim: boolean
  show_potalog: boolean
  show_potaactlog: boolean
  zoom_threshold: number
  spot_period: number
  pota_hunter_uuid: string | null
  pota_activator_uuid: string | null
  enable_emulation: boolean
  pemu_call: string
  pemu_areacode: string
  pemu_century: string
  pemu_sota: string
  pemu_pota: string
  pemu_jaff: string
  pemu_mesg1: string
  pemu_mesg2: string
  pemu_mesg3: string
  pemu_mesg4: string
  pemu_wpm: string
  pemu_host: string
  include_areacode: boolean
  paddle_reverse: boolean
  to_paddle: boolean
  to_key: boolean
  enable_wifi: boolean
  enable_serial: boolean
  my_callsign: string
  // Alert/Spot display filter settings
  alert_spot_type_filter: 'all' | 'alerts' | 'spots' | 'active'
  alert_spot_program_filter: 'all' | 'sota' | 'pota'
  alert_spot_sort_mode: 'time-desc' | 'time-asc' | 'type' | 'program'
  alert_spot_region_filter: 'worldwide' | 'japan'
  alert_spot_show_by_call: boolean
}

export interface GeocodingResult {
  prefecture: string
  municipality: string
  jccCode?: string | null
  jcgCode?: string | null
  wardCode?: string | null
  hamlogCode?: string | null
  jccText?: string
  jcgText?: string
  maidenhead: string
  elevation?: number
  hsrc?: string
  areacode?: string[]
  errors: string
}

export interface APRSTrack {
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
}

// Re-export API types
export * from './api'

// DEM related types
export interface DEMTileCoords {
  x: number
  y: number
  z: number
}

export interface PixelCoordinates {
  px: number
  tx: number
  py: number
  ty: number
}

// Reverse geocoding types
export interface LocationInfo {
  lat: number
  lng: number
  municipality?: string
  address?: string
  muniCode?: string
  jcc?: string
  jcg?: string
  maidenhead?: string
  elevation?: string
  hsrc?: string
  mapcode?: string
}

// Reference search types
export interface ReferenceSearchResult {
  code: string
  name: string
  nameJ?: string
  lat: number
  lon: number
  type: 'sota' | 'pota' | 'wwff' | 'coordinate'
  data?: Summit | Park | LatLng | null
}