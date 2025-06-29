import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMapStore } from '../mapStore'
import type { Summit, Park, LatLng } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('MapStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMapStore.setState({
      mapCenter: { lat: 37.514444, lng: 137.712222 },
      zoom: 6,
      currentLocation: null,
      summits: [],
      parks: [],
      isLoading: false,
      selectedReference: null,
    })
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    const state = useMapStore.getState()
    
    expect(state.mapCenter).toEqual({ lat: 37.514444, lng: 137.712222 })
    expect(state.zoom).toBe(6)
    expect(state.currentLocation).toBeNull()
    expect(state.summits).toEqual([])
    expect(state.parks).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.selectedReference).toBeNull()
  })

  it('should update map center', () => {
    const { setMapCenter } = useMapStore.getState()
    const newCenter: LatLng = { lat: 35.6762, lng: 139.6503 }
    
    setMapCenter(newCenter)
    
    const state = useMapStore.getState()
    expect(state.mapCenter).toEqual(newCenter)
  })

  it('should update zoom level', () => {
    const { setZoom } = useMapStore.getState()
    const newZoom = 12
    
    setZoom(newZoom)
    
    const state = useMapStore.getState()
    expect(state.zoom).toBe(newZoom)
  })

  it('should update current location', () => {
    const { setCurrentLocation } = useMapStore.getState()
    const location: LatLng = { lat: 35.6762, lng: 139.6503 }
    
    setCurrentLocation(location)
    
    const state = useMapStore.getState()
    expect(state.currentLocation).toEqual(location)
  })

  it('should set summits', () => {
    const { setSummits } = useMapStore.getState()
    const summits: Summit[] = [
      {
        summitCode: 'JA/ST-001',
        summitName: 'Test Summit',
        latitude: 35.6762,
        longitude: 139.6503,
        altM: 1000,
        points: 10,
        bonusPoints: 0,
        activationCount: 0,
        maidenhead: 'PM95sq',
      },
    ]
    
    setSummits(summits)
    
    const state = useMapStore.getState()
    expect(state.summits).toEqual(summits)
  })

  it('should set parks', () => {
    const { setParks } = useMapStore.getState()
    const parks: Park[] = [
      {
        potaCode: 'JP-0001',
        parkNameJ: 'テスト公園',
        latitude: 35.6762,
        longitude: 139.6503,
      },
    ]
    
    setParks(parks)
    
    const state = useMapStore.getState()
    expect(state.parks).toEqual(parks)
  })

  it('should add summits to existing ones', () => {
    const { setSummits, addSummits } = useMapStore.getState()
    const initialSummits: Summit[] = [
      {
        summitCode: 'JA/ST-001',
        summitName: 'Test Summit 1',
        latitude: 35.6762,
        longitude: 139.6503,
        altM: 1000,
        points: 10,
        bonusPoints: 0,
        activationCount: 0,
        maidenhead: 'PM95sq',
      },
    ]
    const additionalSummits: Summit[] = [
      {
        summitCode: 'JA/ST-002',
        summitName: 'Test Summit 2',
        latitude: 35.7762,
        longitude: 139.7503,
        altM: 1200,
        points: 12,
        bonusPoints: 0,
        activationCount: 0,
        maidenhead: 'PM95sr',
      },
    ]
    
    setSummits(initialSummits)
    addSummits(additionalSummits)
    
    const state = useMapStore.getState()
    expect(state.summits).toHaveLength(2)
    expect(state.summits).toEqual([...initialSummits, ...additionalSummits])
  })

  it('should clear markers', () => {
    const { setSummits, setParks, clearMarkers } = useMapStore.getState()
    
    // Set some data first
    setSummits([{
      summitCode: 'JA/ST-001',
      summitName: 'Test Summit',
      latitude: 35.6762,
      longitude: 139.6503,
      altM: 1000,
      points: 10,
      bonusPoints: 0,
      activationCount: 0,
      maidenhead: 'PM95sq',
    }])
    setParks([{
      potaCode: 'JP-0001',
      parkNameJ: 'テスト公園',
      latitude: 35.6762,
      longitude: 139.6503,
    }])
    
    clearMarkers()
    
    const state = useMapStore.getState()
    expect(state.summits).toEqual([])
    expect(state.parks).toEqual([])
  })

  it('should update preferences', () => {
    const { updatePreferences } = useMapStore.getState()
    const updates = {
      sota_ref: false,
      pota_ref: true,
      zoom_threshold: 15,
    }
    
    updatePreferences(updates)
    
    const state = useMapStore.getState()
    expect(state.preferences.sota_ref).toBe(false)
    expect(state.preferences.pota_ref).toBe(true)
    expect(state.preferences.zoom_threshold).toBe(15)
  })

  it('should set loading state', () => {
    const { setLoading } = useMapStore.getState()
    
    setLoading(true)
    expect(useMapStore.getState().isLoading).toBe(true)
    
    setLoading(false)
    expect(useMapStore.getState().isLoading).toBe(false)
  })

  it('should set selected reference', () => {
    const { setSelectedReference } = useMapStore.getState()
    const summit: Summit = {
      summitCode: 'JA/ST-001',
      summitName: 'Test Summit',
      latitude: 35.6762,
      longitude: 139.6503,
      altM: 1000,
      points: 10,
      bonusPoints: 0,
      activationCount: 0,
      maidenhead: 'PM95sq',
    }
    
    setSelectedReference(summit)
    
    const state = useMapStore.getState()
    expect(state.selectedReference).toEqual(summit)
  })
})