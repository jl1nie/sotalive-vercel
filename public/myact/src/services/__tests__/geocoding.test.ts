import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GSIGeocodingService, DEMService, GeocodingService } from '../geocoding'

// Mock fetch
window.fetch = vi.fn()

describe('GSIGeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reverse geocode successfully', async () => {
    const mockResponse = {
      results: [
        {
          muniCd: '13101001',
          lv01Nm: '千代田区',
        },
      ],
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await GSIGeocodingService.reverseGeocode(35.6762, 139.6503)

    expect(fetch).toHaveBeenCalledWith(
      'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.6762&lon=139.6503'
    )
    expect(result).toEqual({
      prefecture: '13',
      municipality: '千代田区',
      jccCode: null,
      jcgCode: null,
      wardCode: null,
      hamlogCode: null,
      jccText: '',
      jcgText: '',
      maidenhead: expect.stringMatching(/^[A-Z]{2}\d{2}[A-Z]{2}$/),
      elevation: undefined,
      hsrc: 'GSI',
      areacode: undefined,
      errors: 'OK',
    })
  })

  it('should handle no results', async () => {
    const mockResponse = {
      results: [],
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await GSIGeocodingService.reverseGeocode(35.6762, 139.6503)

    expect(result?.errors).toBe('NO_RESULT')
  })

  it('should handle API errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await GSIGeocodingService.reverseGeocode(35.6762, 139.6503)

    expect(result).toBeNull()
  })

  it('should calculate Maidenhead locator correctly', async () => {
    const mockResponse = {
      results: [
        {
          muniCd: '13101001',
          lv01Nm: '千代田区',
        },
      ],
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await GSIGeocodingService.reverseGeocode(35.6762, 139.6503)

    // Tokyo should be in PM95 square
    expect(result?.maidenhead).toMatch(/^PM95/)
  })
})

describe('DEMService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get elevation successfully', async () => {
    const mockResponse = {
      elevation: 42.5,
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await DEMService.getElevation(35.6762, 139.6503)

    expect(fetch).toHaveBeenCalledWith(
      'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=139.6503&lat=35.6762&outtype=JSON'
    )
    expect(result).toBe(43) // Rounded
  })

  it('should handle elevation errors', async () => {
    const mockResponse = {
      elevation: 'e', // Error indicator
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await DEMService.getElevation(35.6762, 139.6503)

    expect(result).toBeNull()
  })

  it('should handle API errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await DEMService.getElevation(35.6762, 139.6503)

    expect(result).toBeNull()
  })
})

describe('GeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should combine geocoding and elevation data', async () => {
    const mockGeoResponse = {
      results: [
        {
          muniCd: '13101001',
          lv01Nm: '千代田区',
        },
      ],
    }

    const mockElevResponse = {
      elevation: 42.5,
    }

    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockElevResponse,
      })

    const result = await GeocodingService.reverseGeocode(
      { lat: 35.6762, lng: 139.6503 },
      true
    )

    expect(result?.municipality).toBe('千代田区')
    expect(result?.elevation).toBe(43)
  })

  it('should skip elevation when not requested', async () => {
    const mockGeoResponse = {
      results: [
        {
          muniCd: '13101001',
          lv01Nm: '千代田区',
        },
      ],
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeoResponse,
    })

    const result = await GeocodingService.reverseGeocode(
      { lat: 35.6762, lng: 139.6503 },
      false
    )

    expect(result?.municipality).toBe('千代田区')
    expect(result?.elevation).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1) // Only geocoding call
  })

  it('should detect positions outside Japan', async () => {
    const mockGeoResponse = {
      results: [
        {
          muniCd: '13101001',
          lv01Nm: '千代田区',
        },
      ],
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeoResponse,
    })

    // Coordinates outside Japan
    const result = await GeocodingService.reverseGeocode(
      { lat: 51.5074, lng: -0.1278 }, // London
      false
    )

    expect(result?.errors).toBe('OUTSIDE_JA')
  })

  it('should handle geocoding failures gracefully', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await GeocodingService.reverseGeocode(
      { lat: 35.6762, lng: 139.6503 },
      false
    )

    expect(result).toBeNull()
  })
})