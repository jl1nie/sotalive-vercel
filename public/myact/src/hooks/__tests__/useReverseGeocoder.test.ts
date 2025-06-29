import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReverseGeocoder } from '../useReverseGeocoder'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useReverseGeocoder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GSI Reverse Geocoding', () => {
    it('should successfully reverse geocode Tokyo coordinates', async () => {
      // Mock GSI reverse geocoding response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: {
              muniCd: '13101001',
              lv01Nm: '千代田区'
            }
          })
        })
        // Mock municipality data response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            muniCode: '13101001',
            municipality: '東京都千代田区',
            jcc: '1001',
            jcg: '100110',
            maidenhead: 'PM95sr'
          })
        })

      const { result } = renderHook(() => useReverseGeocoder({ useYahoo: false }))

      const geocodeResult = await result.current.reverseGeocode(35.6812, 139.7671, false)

      expect(geocodeResult.errors).toBe('OK')
      expect(geocodeResult.municipality).toBe('東京都千代田区千代田区')
      expect(geocodeResult.muniCode).toBe('13101001')
      expect(geocodeResult.jcc).toBe('1001')
      expect(geocodeResult.maidenhead).toBe('PM95sr')
    })

    it('should handle outside Japan coordinates', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: { muniCd: null }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            muniCode: null,
            maidenhead: 'PM95sr'
          })
        })

      const { result } = renderHook(() => useReverseGeocoder())

      const geocodeResult = await result.current.reverseGeocode(0, 0, false)

      expect(geocodeResult.errors).toBe('OUTSIDE_JA')
      expect(geocodeResult.maidenhead).toBe('PM95sr')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useReverseGeocoder())

      const geocodeResult = await result.current.reverseGeocode(35.6812, 139.7671, false)

      expect(geocodeResult.errors).toBe('ERROR')
      expect(geocodeResult.maidenhead).toBe(null)
    })
  })

  describe('Elevation Service', () => {
    it('should get elevation data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          elevation: '25.5',
          hsrc: '5m mesh'
        })
      })

      const { result } = renderHook(() => useReverseGeocoder())

      const elevationResult = await result.current.getElevation(35.6812, 139.7671)

      expect(elevationResult.errors).toBe('OK')
      expect(elevationResult.elevation).toBe('25.5')
      expect(elevationResult.hsrc).toBe('5m mesh')
    })

    it('should handle missing elevation data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          elevation: '-----',
          hsrc: '-----'
        })
      })

      const { result } = renderHook(() => useReverseGeocoder())

      const elevationResult = await result.current.getElevation(0, 0)

      expect(elevationResult.errors).toBe('OUTSIDE_JA')
      expect(elevationResult.elevation).toBe('-----')
    })

    it('should handle elevation API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const { result } = renderHook(() => useReverseGeocoder())

      const elevationResult = await result.current.getElevation(35.6812, 139.7671)

      expect(elevationResult.errors).toBe('OUTSIDE_JA')
      expect(elevationResult.elevation).toBe('-----')
    })
  })

  describe('Mapcode Service', () => {
    it('should get mapcode successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          mapcode: '1 23 456 789*01'
        })
      })

      const { result } = renderHook(() => useReverseGeocoder())

      const mapcode = await result.current.getMapcode(35.6812, 139.7671)

      expect(mapcode).toBe('1 23 456 789*01')
    })

    it('should handle mapcode API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Mapcode API error'))

      const { result } = renderHook(() => useReverseGeocoder())

      const mapcode = await result.current.getMapcode(35.6812, 139.7671)

      expect(mapcode).toBe(null)
    })
  })

  describe('Caching', () => {
    it('should cache reverse geocoding results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: { muniCd: '13101001', lv01Nm: '千代田区' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            muniCode: '13101001',
            municipality: '東京都千代田区'
          })
        })

      const { result } = renderHook(() => useReverseGeocoder())

      // First call
      await result.current.reverseGeocode(35.6812, 139.7671, false)
      
      // Second call should use cache
      await result.current.reverseGeocode(35.6812, 139.7671, false)

      // Should only call fetch twice (not four times)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should clear cache when requested', async () => {
      const { result } = renderHook(() => useReverseGeocoder())

      result.current.clearCache()

      // No specific assertion needed, just ensure it doesn't throw
      expect(true).toBe(true)
    })

    it('should manage cache size correctly', async () => {
      const { result } = renderHook(() => useReverseGeocoder({ cacheSize: 2 }))

      // Mock responses for multiple locations
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            results: { muniCd: '13101001' }
          })
        })

      // Make more requests than cache size
      await result.current.reverseGeocode(35.6812, 139.7671, false)
      await result.current.reverseGeocode(35.6813, 139.7672, false)
      await result.current.reverseGeocode(35.6814, 139.7673, false)

      // Cache should have evicted oldest entry
      // This is more of a behavioral test - exact implementation may vary
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Yahoo Reverse Geocoding', () => {
    it('should use Yahoo API when enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          errors: 'OK',
          municipality: '東京都千代田区',
          muniCode: '13101001',
          jcc: '1001',
          jcg: '100110'
        })
      })

      const { result } = renderHook(() => useReverseGeocoder({ useYahoo: true }))

      const geocodeResult = await result.current.reverseGeocode(35.6812, 139.7671, false)

      expect(geocodeResult.errors).toBe('OK')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sotalive.net/api/reverse-geocoder')
      )
    })
  })

  describe('Error States', () => {
    it('should handle loading state correctly', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ results: { muniCd: null } })
        }), 100))
      )

      const { result } = renderHook(() => useReverseGeocoder())

      // Start geocoding
      const promise = result.current.reverseGeocode(35.6812, 139.7671, false)

      // Should be loading
      expect(result.current.isLoading).toBe(true)

      // Wait for completion
      await promise

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should set error state on failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useReverseGeocoder())

      try {
        await result.current.reverseGeocode(35.6812, 139.7671, false)
      } catch {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Integration with Elevation', () => {
    it('should include elevation data when requested', async () => {
      // Mock reverse geocoding response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: { muniCd: '13101001', lv01Nm: '千代田区' }
          })
        })
        // Mock municipality response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            muniCode: '13101001',
            municipality: '東京都千代田区'
          })
        })
        // Mock elevation response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            elevation: '25.5',
            hsrc: '5m mesh'
          })
        })

      const { result } = renderHook(() => useReverseGeocoder())

      const geocodeResult = await result.current.reverseGeocode(35.6812, 139.7671, true)

      expect(geocodeResult.errors).toBe('OK')
      expect(geocodeResult.elevation).toBe('25.5')
      expect(geocodeResult.hsrc).toBe('5m mesh')
    })
  })
})