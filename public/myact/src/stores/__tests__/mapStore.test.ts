import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMapStore } from '../mapStore'
import type { Summit, Park, LatLng, OperationAlert } from '@/types'
import type { PopupInfo } from '../mapStore'

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
      // Reset new state added in Tasks 9-10
      popupInfo: null,
      eventState: {
        isProgrammaticMove: false,
        lastExternalUpdate: null
      },
      mapFullyInitialized: false,
      alerts: [],
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

  // ===== Task 9-10 で追加された機能のテスト =====

  describe('Popup Management (Task 9)', () => {
    it('should set unique popup with summit data', async () => {
      const { setUniquePopup } = useMapStore.getState()
      const popupInfo: PopupInfo = {
        position: { lat: 35.6762, lng: 139.6503 },
        summit: {
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
        isGPS: false
      }

      setUniquePopup(popupInfo)

      // Wait for the setTimeout in setUniquePopup to complete
      await new Promise(resolve => setTimeout(resolve, 20))

      const state = useMapStore.getState()
      expect(state.popupInfo).toBeDefined()
      expect(state.popupInfo?.summit?.summitCode).toBe('JA/ST-001')
    })

    it('should clear popup', () => {
      const { setUniquePopup, clearPopup } = useMapStore.getState()
      
      // Set popup first
      setUniquePopup({
        position: { lat: 35.6762, lng: 139.6503 },
        isGPS: true
      })

      clearPopup()

      const state = useMapStore.getState()
      expect(state.popupInfo).toBeNull()
    })
  })

  describe('Event Loop Management (Task 9)', () => {
    it('should start programmatic move', () => {
      const { startProgrammaticMove } = useMapStore.getState()
      const center: LatLng = { lat: 35.6762, lng: 139.6503 }
      const zoom = 15

      startProgrammaticMove(center, zoom)

      const state = useMapStore.getState()
      expect(state.eventState.isProgrammaticMove).toBe(true)
      expect(state.eventState.lastExternalUpdate).toBeDefined()
      expect(state.eventState.lastExternalUpdate?.center).toEqual(center)
      expect(state.eventState.lastExternalUpdate?.zoom).toBe(zoom)
    })

    it('should identify user interaction correctly', () => {
      const { isUserInteraction, startProgrammaticMove } = useMapStore.getState()

      // Initially should allow user interaction
      expect(isUserInteraction()).toBe(true)

      // During programmatic move should reject user interaction
      startProgrammaticMove({ lat: 35.6762, lng: 139.6503 }, 15)
      expect(isUserInteraction()).toBe(false)
    })

    it('should debounce state updates', () => {
      const { debounceStateUpdate } = useMapStore.getState()
      let callCount = 0
      
      const updateFn = () => {
        callCount++
      }

      // Call multiple times quickly
      debounceStateUpdate(updateFn)
      debounceStateUpdate(updateFn)
      debounceStateUpdate(updateFn)

      // Should only call once after debounce
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callCount).toBe(1)
          resolve()
        }, 250)
      })
    })
  })

  describe('Alert Management (Task 9)', () => {
    it('should add alert', () => {
      const { addAlert } = useMapStore.getState()
      const alertData = {
        title: 'Test Alert',
        reference: 'JA/ST-001',
        program: 'SOTA' as const,
        operationDate: '2024-01-01T10:00:00Z',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Test operation',
        callsign: 'JA1XYZ'
      }

      addAlert(alertData)

      const state = useMapStore.getState()
      expect(state.alerts).toHaveLength(1)
      expect(state.alerts[0].reference).toBe('JA/ST-001')
      expect(state.alerts[0].id).toBeDefined()
      expect(state.alerts[0].createdAt).toBeDefined()
    })

    it('should update alert', () => {
      const { addAlert, updateAlert } = useMapStore.getState()
      
      // Add alert first
      addAlert({
        title: 'Update Test Alert',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: '2024-01-01T10:00:00Z',
        reference: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Test operation'
      })

      const alertId = useMapStore.getState().alerts[0].id
      
      // Update alert
      updateAlert(alertId, {
        frequency: '21.230',
        mode: 'CW'
      })

      const state = useMapStore.getState()
      expect(state.alerts[0].frequency).toBe('21.230')
      expect(state.alerts[0].mode).toBe('CW')
      expect(state.alerts[0].reference).toBe('JA/ST-001') // Unchanged
    })

    it('should delete alert', () => {
      const { addAlert, deleteAlert } = useMapStore.getState()
      
      // Add alert first
      addAlert({
        title: 'Update Test Alert',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: '2024-01-01T10:00:00Z',
        reference: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Test operation'
      })

      const alertId = useMapStore.getState().alerts[0].id
      
      // Delete alert
      deleteAlert(alertId)

      const state = useMapStore.getState()
      expect(state.alerts).toHaveLength(0)
    })

    it('should get upcoming alerts', () => {
      const { addAlert, getUpcomingAlerts } = useMapStore.getState()
      const now = new Date()
      const future1 = new Date(now.getTime() + 1000 * 60 * 60) // 1 hour from now
      const future2 = new Date(now.getTime() + 1000 * 60 * 60 * 48) // 48 hours from now
      const future3 = new Date(now.getTime() + 1000 * 60 * 60 * 100) // 100 hours from now

      addAlert({
        title: 'Future Alert 1',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: future1.toISOString(),
        reference: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Near future'
      })

      addAlert({
        title: 'Future Alert 2',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: future2.toISOString(),
        reference: 'JA/ST-002',
        frequency: '21.230',
        mode: 'CW',
        comment: 'Medium future'
      })

      addAlert({
        title: 'Future Alert 3',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: future3.toISOString(),
        reference: 'JA/ST-003',
        frequency: '28.230',
        mode: 'FM',
        comment: 'Far future'
      })

      const upcomingAlerts = getUpcomingAlerts(72) // 72 hours
      expect(upcomingAlerts).toHaveLength(2) // Should get first two
      expect(upcomingAlerts[0].reference).toBe('JA/ST-001') // Sorted by date
      expect(upcomingAlerts[1].reference).toBe('JA/ST-002')
    })

    it('should get past alerts', () => {
      const { addAlert, getPastAlerts } = useMapStore.getState()
      const now = new Date()
      const past1 = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago
      const past2 = new Date(now.getTime() - 1000 * 60 * 60 * 12) // 12 hours ago
      const past3 = new Date(now.getTime() - 1000 * 60 * 60 * 48) // 48 hours ago

      addAlert({
        title: 'Past Alert 1',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: past1.toISOString(),
        reference: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Recent past'
      })

      addAlert({
        title: 'Past Alert 2',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: past2.toISOString(),
        reference: 'JA/ST-002',
        frequency: '21.230',
        mode: 'CW',
        comment: 'Medium past'
      })

      addAlert({
        title: 'Past Alert 3',
        program: 'SOTA' as const,
        callsign: 'JA1XYZ',
        operationDate: past3.toISOString(),
        reference: 'JA/ST-003',
        frequency: '28.230',
        mode: 'FM',
        comment: 'Old past'
      })

      const pastAlerts = getPastAlerts(24) // 24 hours
      expect(pastAlerts).toHaveLength(2) // Should get first two
      expect(pastAlerts[0].reference).toBe('JA/ST-001') // Sorted by date (desc)
      expect(pastAlerts[1].reference).toBe('JA/ST-002')
    })
  })

  describe('Map Initialization State', () => {
    it('should set map initialization state', () => {
      const { setMapFullyInitialized } = useMapStore.getState()

      setMapFullyInitialized(true)

      const state = useMapStore.getState()
      expect(state.mapFullyInitialized).toBe(true)
    })
  })

  describe('Marker Click Handling (Task 10)', () => {
    // Note: These tests focus on the store's ability to handle the actions
    // The actual implementation details (API calls, etc.) are tested separately
    
    it('should have handleSummitClick action', () => {
      const { handleSummitClick } = useMapStore.getState()
      expect(typeof handleSummitClick).toBe('function')
    })

    it('should have handleParkClick action', () => {
      const { handleParkClick } = useMapStore.getState()
      expect(typeof handleParkClick).toBe('function')
    })

    it('should have handleQTHClick action', () => {
      const { handleQTHClick } = useMapStore.getState()
      expect(typeof handleQTHClick).toBe('function')
    })
  })
})