import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LatLng, Summit, Park, Preferences } from '@/types'

interface MapState {
  // Map position and zoom
  mapCenter: LatLng
  zoom: number
  
  // Current GPS location
  currentLocation: LatLng | null
  
  // Markers and data
  summits: Summit[]
  parks: Park[]
  
  // Preferences (from original cookie-based system)
  preferences: Preferences
  
  // UI state
  isLoading: boolean
  selectedReference: Summit | Park | null
}

interface MapActions {
  // Map control
  setMapCenter: (center: LatLng) => void
  setZoom: (zoom: number) => void
  
  // Location
  setCurrentLocation: (location: LatLng | null) => void
  
  // Data
  setSummits: (summits: Summit[]) => void
  setParks: (parks: Park[]) => void
  addSummits: (summits: Summit[]) => void
  addParks: (parks: Park[]) => void
  clearMarkers: () => void
  
  // Preferences
  updatePreferences: (updates: Partial<Preferences>) => void
  
  // UI
  setLoading: (loading: boolean) => void
  setSelectedReference: (ref: Summit | Park | null) => void
}

type MapStore = MapState & MapActions

// Default preferences matching original implementation
const defaultPreferences: Preferences = {
  popup_permanent: true,
  display_mapcode: false,
  link_googlemap: false,
  by_call: false,
  sota_ref: true,
  pota_ref: true,
  jaff_ref: true,
  display_area: false,
  aprs_track: true,
  pilgrim: false,
  show_potalog: false,
  show_potaactlog: true,
  zoom_threshold: 12,
  spot_period: 6,
  pota_hunter_uuid: null,
  pota_activator_uuid: null,
  enable_emulation: false,
  pemu_call: '',
  pemu_areacode: '',
  pemu_century: '',
  pemu_sota: '',
  pemu_pota: '',
  pemu_jaff: '',
  pemu_mesg1: 'CQ CQ CQ DE $CALL SOTA $SOTA +',
  pemu_mesg2: 'CQ CQ CQ DE $CALL POTA $POTA +',
  pemu_mesg3: 'CQ CQ CQ DE $CALL JAFF $JAFF +',
  pemu_mesg4: 'p 1#CQ CQ CQ DE $CALL SOTA $SOTA+',
  pemu_wpm: '40',
  pemu_host: 'actpaddle.local',
  include_areacode: true,
  paddle_reverse: false,
  to_paddle: true,
  to_key: false,
  enable_wifi: false,
  enable_serial: true,
  my_callsign: '',
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      // Initial state
      mapCenter: { lat: 37.514444, lng: 137.712222 }, // Japan center
      zoom: 6,
      currentLocation: null,
      summits: [],
      parks: [],
      preferences: defaultPreferences,
      isLoading: false,
      selectedReference: null,

      // Actions
      setMapCenter: (center) => set({ mapCenter: center }),
      setZoom: (zoom) => set({ zoom }),
      
      setCurrentLocation: (location) => set({ currentLocation: location }),
      
      setSummits: (summits) => set({ summits }),
      setParks: (parks) => set({ parks }),
      addSummits: (summits) => set((state) => ({ 
        summits: [...state.summits, ...summits] 
      })),
      addParks: (parks) => set((state) => ({ 
        parks: [...state.parks, ...parks] 
      })),
      clearMarkers: () => set({ summits: [], parks: [] }),
      
      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setSelectedReference: (ref) => set({ selectedReference: ref }),
    }),
    {
      name: 'myact-map-store', // localStorage key
      partialize: (state) => ({
        preferences: state.preferences,
        mapCenter: state.mapCenter,
        zoom: state.zoom,
      }), // Only persist these fields
    }
  )
)