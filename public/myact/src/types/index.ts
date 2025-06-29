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
  date?: string
  locid?: string[]
  act?: number
  qsos?: number
  activations?: number
  attempts?: number
}

export interface Spot {
  spotTime: string
  activator: string
  reference: string
  frequency: string
  mode: string
  comment: string
  program: 'SOTA' | 'POTA'
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
  data?: any
}