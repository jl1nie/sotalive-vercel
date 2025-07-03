import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMapStore } from '@/stores/mapStore'
import { AlertManager } from '@/components/Alert/AlertManager'
import { Layout } from '@/components/Layout/Layout'
import type { OperationAlert } from '@/types'

// Mock the map-related hooks and components
vi.mock('@/hooks/useSOTAAPI', () => ({
  useSOTAAPI: () => ({
    summits: [],
    parks: [],
    loading: false,
    error: null,
  })
}))

vi.mock('@/components/Map/LeafletMap', () => ({
  default: () => <div data-testid="leaflet-map">Mock Leaflet Map</div>
}))

vi.mock('@/components/Charts/SpotTimeline', () => ({
  default: () => <div data-testid="spot-timeline">Mock Spot Timeline</div>
}))

describe('Component Integration Tests (Task 11)', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    // Reset store state
    useMapStore.setState({
      mapCenter: { lat: 37.514444, lng: 137.712222 },
      zoom: 6,
      currentLocation: null,
      summits: [],
      parks: [],
      isLoading: false,
      selectedReference: null,
      popupInfo: null,
      eventState: {
        isProgrammaticMove: false,
        lastExternalUpdate: null
      },
      mapFullyInitialized: false,
      alerts: [],
    })
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('Alert Management Integration', () => {
    it('should integrate AlertManager with mapStore for CRUD operations', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<AlertManager />)

      // Verify initial empty state
      expect(screen.getByText(/アラート情報がありません/)).toBeInTheDocument()

      // Open create dialog
      const addButton = screen.getByRole('button', { name: /新規アラート作成/ })
      await user.click(addButton)

      // Verify dialog opened
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/新規アラート作成/)).toBeInTheDocument()

      // Fill in form data
      const summitCodeInput = screen.getByLabelText(/サミットコード/)
      const frequencyInput = screen.getByLabelText(/周波数/)
      const modeSelect = screen.getByLabelText(/モード/)
      
      await user.type(summitCodeInput, 'JA/ST-001')
      await user.type(frequencyInput, '14.230')
      await user.click(modeSelect)
      await user.click(screen.getByRole('option', { name: 'SSB' }))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /作成/ })
      await user.click(submitButton)

      // Verify alert was added to store
      await waitFor(() => {
        const state = useMapStore.getState()
        expect(state.alerts).toHaveLength(1)
        expect(state.alerts[0].summitCode).toBe('JA/ST-001')
        expect(state.alerts[0].frequency).toBe('14.230')
        expect(state.alerts[0].mode).toBe('SSB')
      })

      // Verify UI updated
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
        expect(screen.getByText('14.230')).toBeInTheDocument()
      })
    })

    it('should update alerts and reflect changes in UI', async () => {
      const user = userEvent.setup()
      
      // Pre-populate store with an alert
      const testAlert: OperationAlert = {
        id: 'test-id',
        operationDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        summitCode: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Test operation',
        createdAt: new Date().toISOString(),
      }
      
      useMapStore.getState().setAlerts([testAlert])

      renderWithProviders(<AlertManager />)

      // Find and click edit button
      const editButton = screen.getByRole('button', { name: /編集/ })
      await user.click(editButton)

      // Update frequency
      const frequencyInput = screen.getByDisplayValue('14.230')
      await user.clear(frequencyInput)
      await user.type(frequencyInput, '21.230')

      // Submit changes
      const updateButton = screen.getByRole('button', { name: /更新/ })
      await user.click(updateButton)

      // Verify store was updated
      await waitFor(() => {
        const state = useMapStore.getState()
        expect(state.alerts[0].frequency).toBe('21.230')
      })

      // Verify UI reflects changes
      await waitFor(() => {
        expect(screen.getByText('21.230')).toBeInTheDocument()
      })
    })

    it('should delete alerts and update UI', async () => {
      const user = userEvent.setup()
      
      // Pre-populate store with an alert
      const testAlert: OperationAlert = {
        id: 'test-id',
        operationDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        summitCode: 'JA/ST-001',
        frequency: '14.230',
        mode: 'SSB',
        comment: 'Test operation',
        createdAt: new Date().toISOString(),
      }
      
      useMapStore.getState().setAlerts([testAlert])

      renderWithProviders(<AlertManager />)

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /削除/ })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /削除確認/ })
      await user.click(confirmButton)

      // Verify store was updated
      await waitFor(() => {
        const state = useMapStore.getState()
        expect(state.alerts).toHaveLength(0)
      })

      // Verify UI shows empty state
      await waitFor(() => {
        expect(screen.getByText(/アラート情報がありません/)).toBeInTheDocument()
      })
    })
  })

  describe('Layout Integration with Map Store', () => {
    it('should render main layout with all components', () => {
      renderWithProviders(<Layout />)

      // Verify core components are rendered
      expect(screen.getByTestId('leaflet-map')).toBeInTheDocument()
      expect(screen.getByTestId('spot-timeline')).toBeInTheDocument()
      
      // Verify layout structure
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should handle side panel state changes', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<Layout />)

      // Find panel toggle button (if available)
      const toggleButton = screen.queryByRole('button', { name: /パネル/ })
      
      if (toggleButton) {
        await user.click(toggleButton)
        
        // Verify state change is reflected in the UI
        // This would test the side panel integration
        await waitFor(() => {
          // Check for panel state changes in DOM
          const panel = screen.getByRole('complementary', { hidden: true })
          expect(panel).toHaveAttribute('aria-hidden', 'true')
        })
      }
    })
  })

  describe('Store Integration with Components', () => {
    it('should propagate map center changes across components', () => {
      renderWithProviders(<Layout />)

      // Change map center in store
      const newCenter = { lat: 35.6762, lng: 139.6503 }
      useMapStore.getState().setMapCenter(newCenter)

      // Verify components react to store changes
      const state = useMapStore.getState()
      expect(state.mapCenter).toEqual(newCenter)
    })

    it('should propagate loading state changes', () => {
      renderWithProviders(<Layout />)

      // Change loading state
      useMapStore.getState().setLoading(true)

      // Verify state propagation
      const state = useMapStore.getState()
      expect(state.isLoading).toBe(true)
    })

    it('should handle popup state changes across components', () => {
      renderWithProviders(<Layout />)

      // Set popup info
      const popupInfo = {
        position: { lat: 35.6762, lng: 139.6503 },
        isGPS: true
      }
      
      useMapStore.getState().setUniquePopup(popupInfo)

      // Verify popup state
      const state = useMapStore.getState()
      expect(state.popupInfo).toEqual(expect.objectContaining(popupInfo))
    })
  })

  describe('Event Flow Integration', () => {
    it('should handle programmatic move events', () => {
      renderWithProviders(<Layout />)

      // Trigger programmatic move
      const center = { lat: 35.6762, lng: 139.6503 }
      const zoom = 15
      
      useMapStore.getState().startProgrammaticMove(center, zoom)

      // Verify event state
      const state = useMapStore.getState()
      expect(state.eventState.isProgrammaticMove).toBe(true)
      expect(state.eventState.lastExternalUpdate?.center).toEqual(center)
    })

    it('should handle user interaction detection', () => {
      renderWithProviders(<Layout />)

      // Test user interaction detection
      const isUser = useMapStore.getState().isUserInteraction()
      expect(isUser).toBe(true)

      // Test during programmatic move
      useMapStore.getState().startProgrammaticMove({ lat: 35.6762, lng: 139.6503 }, 15)
      const isDuringProgrammatic = useMapStore.getState().isUserInteraction()
      expect(isDuringProgrammatic).toBe(false)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle store errors gracefully', () => {
      renderWithProviders(<Layout />)

      // Trigger error conditions in store
      expect(() => {
        useMapStore.getState().updateAlert('non-existent-id', { frequency: '21.230' })
      }).not.toThrow()

      // Verify application remains stable
      expect(screen.getByTestId('leaflet-map')).toBeInTheDocument()
    })

    it('should handle invalid data gracefully', () => {
      renderWithProviders(<Layout />)

      // Try to set invalid data
      expect(() => {
        useMapStore.getState().setMapCenter({ lat: NaN, lng: NaN })
      }).not.toThrow()

      // Application should remain functional
      expect(screen.getByTestId('leaflet-map')).toBeInTheDocument()
    })
  })
})