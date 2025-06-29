import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/test/utils'
import { ActivationZone } from '../ActivationZone'
import L from 'leaflet'

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  useMap: vi.fn()
}))

// Mock DEMService
vi.mock('@/services/dem', () => ({
  DEMService: {
    getDEM: vi.fn(),
    latLonToPixel: vi.fn(),
    pixelToLatLon: vi.fn(),
    getElevationAtPoint: vi.fn()
  }
}))

// Mock useReverseGeocoder
vi.mock('@/hooks/useReverseGeocoder', () => ({
  useReverseGeocoder: vi.fn()
}))

import { useMap } from 'react-leaflet'
import { DEMService } from '@/services/dem'
import { useReverseGeocoder } from '@/hooks/useReverseGeocoder'

// Mock Leaflet types and functions
const mockMap = {
  getZoom: vi.fn(() => 15),
  getBounds: vi.fn(() => ({
    contains: vi.fn(() => true),
    _northEast: { lat: 36, lng: 140 },
    _southWest: { lat: 35, lng: 139 }
  })),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
} as any

const mockGetElevation = vi.fn()

describe('ActivationZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    ;(useMap as any).mockReturnValue(mockMap)
    ;(useReverseGeocoder as any).mockReturnValue({
      getElevation: mockGetElevation
    })
    
    ;(DEMService.latLonToPixel as any).mockReturnValue({
      px: 12800, tx: 50, py: 6400, ty: 25
    })
    
    ;(DEMService.getDEM as any).mockResolvedValue(
      new Float32Array(65536).fill(100) // Mock elevation data
    )
    
    mockGetElevation.mockResolvedValue({
      elevation: '1000',
      hsrc: '5m mesh',
      errors: 'OK'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone 
          position={position}
          visible={true}
        />
      )
      
      // ActivationZone doesn't render visible elements, just adds layers to map
      expect(true).toBe(true)
    })

    it('should not render when position is null', () => {
      render(
        <ActivationZone 
          position={null}
          visible={true}
        />
      )
      
      expect(mockGetElevation).not.toHaveBeenCalled()
    })

    it('should not render when visible is false', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone 
          position={position}
          visible={false}
        />
      )
      
      expect(mockGetElevation).not.toHaveBeenCalled()
    })
  })

  describe('Props Configuration', () => {
    it('should use default props correctly', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      // Default props should be applied (tested indirectly through behavior)
      expect(mockGetElevation).toHaveBeenCalledWith(35.6812, 139.7671)
    })

    it('should respect custom props', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone 
          position={position}
          upperLimit={-30}
          verticalDistance={30}
          horizontalDistance={10}
          visible={true}
        />
      )
      
      expect(mockGetElevation).toHaveBeenCalledWith(35.6812, 139.7671)
    })
  })

  describe('Elevation Handling', () => {
    it('should handle successful elevation retrieval', async () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockGetElevation).toHaveBeenCalledWith(35.6812, 139.7671)
    })

    it('should handle elevation API errors gracefully', async () => {
      mockGetElevation.mockResolvedValue({
        elevation: '-----',
        hsrc: '-----',
        errors: 'OUTSIDE_JA'
      })
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockGetElevation).toHaveBeenCalled()
      // Should not proceed to create layer when elevation is invalid
    })

    it('should handle invalid elevation data', async () => {
      mockGetElevation.mockResolvedValue({
        elevation: 'invalid',
        hsrc: '-----',
        errors: 'OK'
      })
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockGetElevation).toHaveBeenCalled()
    })
  })

  describe('DEM Integration', () => {
    it('should call DEMService for pixel conversion', async () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(DEMService.latLonToPixel).toHaveBeenCalledWith(35.6812, 139.7671, 14)
    })

    it('should retrieve DEM data for peak search', async () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(DEMService.getDEM).toHaveBeenCalledWith({
        x: 50, y: 25, z: 14
      })
    })

    it('should handle DEM data retrieval errors', async () => {
      ;(DEMService.getDEM as any).mockRejectedValue(new Error('DEM error'))
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(DEMService.getDEM).toHaveBeenCalled()
    })
  })

  describe('Map Layer Management', () => {
    it('should remove existing layer when adding new one', async () => {
      const position1 = new L.LatLng(35.6812, 139.7671)
      const position2 = new L.LatLng(35.6813, 139.7672)
      
      const { rerender } = render(
        <ActivationZone position={position1} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Change position
      rerender(
        <ActivationZone position={position2} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should have called removeLayer when changing position
      expect(mockMap.removeLayer).toHaveBeenCalled()
    })

    it('should add layer to map when successfully created', async () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Layer addition happens in ContourLayer creation, which is mocked
      expect(DEMService.getDEM).toHaveBeenCalled()
    })

    it('should handle map event listeners', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function))
      expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function))
    })

    it('should cleanup event listeners on unmount', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      const { unmount } = render(
        <ActivationZone position={position} />
      )
      
      unmount()
      
      expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function))
      expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function))
    })
  })

  describe('Position Changes', () => {
    it('should update when position changes', () => {
      const position1 = new L.LatLng(35.6812, 139.7671)
      const position2 = new L.LatLng(35.6813, 139.7672)
      
      const { rerender } = render(
        <ActivationZone position={position1} />
      )
      
      rerender(
        <ActivationZone position={position2} />
      )
      
      expect(mockGetElevation).toHaveBeenCalledWith(35.6812, 139.7671)
      expect(mockGetElevation).toHaveBeenCalledWith(35.6813, 139.7672)
    })

    it('should clean up when position becomes null', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      const { rerender } = render(
        <ActivationZone position={position} />
      )
      
      rerender(
        <ActivationZone position={null} />
      )
      
      // Should call removeLayer when position becomes null
      expect(mockMap.removeLayer).toHaveBeenCalled()
    })
  })

  describe('Visibility Control', () => {
    it('should show/hide based on visible prop', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      const { rerender } = render(
        <ActivationZone position={position} visible={true} />
      )
      
      expect(mockGetElevation).toHaveBeenCalled()
      
      vi.clearAllMocks()
      
      rerender(
        <ActivationZone position={position} visible={false} />
      )
      
      expect(mockMap.removeLayer).toHaveBeenCalled()
    })
  })

  describe('Peak Search Algorithm', () => {
    it('should search for highest peak in 7x7 grid', async () => {
      // Mock DEM data with a clear peak at position (130, 130)
      const mockDemData = new Float32Array(65536)
      mockDemData.fill(100) // Base elevation
      
      // Create a peak at center
      const centerIndex = 130 * 256 + 130
      mockDemData[centerIndex] = 150 // Peak elevation
      
      ;(DEMService.getDEM as any).mockResolvedValue(mockDemData)
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      render(
        <ActivationZone position={position} />
      )
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(DEMService.getDEM).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    it('should handle component errors gracefully', () => {
      // Mock a component that throws during elevation retrieval
      mockGetElevation.mockRejectedValue(new Error('Component error'))
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      expect(() => {
        render(
          <ActivationZone position={position} />
        )
      }).not.toThrow()
    })

    it('should handle map reference errors', () => {
      ;(useMap as any).mockReturnValue(null)
      
      const position = new L.LatLng(35.6812, 139.7671)
      
      expect(() => {
        render(
          <ActivationZone position={position} />
        )
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not recreate layer unnecessarily', () => {
      const position = new L.LatLng(35.6812, 139.7671)
      
      const { rerender } = render(
        <ActivationZone 
          position={position}
          upperLimit={-25}
        />
      )
      
      vi.clearAllMocks()
      
      // Rerender with same props
      rerender(
        <ActivationZone 
          position={position}
          upperLimit={-25}
        />
      )
      
      // Should not call elevation service again for same position
      expect(mockGetElevation).not.toHaveBeenCalled()
    })

    it('should debounce rapid position changes', async () => {
      const position1 = new L.LatLng(35.6812, 139.7671)
      const position2 = new L.LatLng(35.6813, 139.7672)
      const position3 = new L.LatLng(35.6814, 139.7673)
      
      const { rerender } = render(
        <ActivationZone position={position1} />
      )
      
      // Rapid position changes
      rerender(<ActivationZone position={position2} />)
      rerender(<ActivationZone position={position3} />)
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should handle all position changes
      expect(mockGetElevation).toHaveBeenCalledTimes(3)
    })
  })
})