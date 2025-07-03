import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIService } from '../api'
import type { 
  SummitSearchResponse, 
  ParkSearchResponse, 
  SearchInBoundsResponse,
  SpotResponse,
  ReferenceSearchResponse,
  ReferenceSearchDetailResponse
} from '@/types/api'

// Mock the global fetch
global.fetch = vi.fn()

describe('APIService Anti-Corruption Layer (Task 12)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Summit API Transformation', () => {
    it('should transform summit search response to internal Summit model', async () => {
      const mockApiResponse: SummitSearchResponse[] = [
        {
          code: 'JA/ST-001',
          name: 'Test Summit',
          nameJ: 'テストサミット',
          lat: 35.6762,
          lon: 139.6503,
          alt: 1000,
          pts: 10,
          count: 5,
          // Legacy/alternative fields
          summit_code: undefined,
          bonus_points: undefined,
          maidenhead: 'PM95sq'
        }
      ]

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchSummits({
        lat: 35.6762,
        lon: 139.6503
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        summitCode: 'JA/ST-001',
        summitName: 'Test Summit',
        summitNameJ: 'テストサミット',
        latitude: 35.6762,
        longitude: 139.6503,
        altM: 1000,
        points: 10,
        bonusPoints: 0,
        activationCount: 5,
        activationDate: undefined,
        activationCall: undefined,
        cityJ: undefined,
        maidenhead: 'PM95sq'
      })
    })

    it('should handle field name variations in summit response', async () => {
      const mockApiResponse: SummitSearchResponse[] = [
        {
          // Use alternative field names
          summit_code: 'JA/ST-002',
          summit_name: 'Legacy Summit',
          summit_name_j: 'レガシーサミット',
          latitude: 36.0,
          longitude: 140.0,
          altM: 1500,
          points: 15,
          bonus_points: 5,
          activationCount: 3,
          activation_date: '2023-12-01',
          activation_call: 'JA1XYZ',
          city_j: '静岡県',
          maidenhead: 'PM96aa',
          // Primary fields (should be ignored in favor of alternatives)
          code: '',
          name: '',
          nameJ: '',
          lat: 0,
          lon: 0,
          alt: 0,
          pts: 0,
          count: 0
        }
      ]

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchSummits({
        lat: 36.0,
        lon: 140.0
      })

      expect(result[0]).toEqual({
        summitCode: 'JA/ST-002',
        summitName: 'Legacy Summit',
        summitNameJ: 'レガシーサミット',
        latitude: 36.0,
        longitude: 140.0,
        altM: 1500,
        points: 15,
        bonusPoints: 5,
        activationCount: 3,
        activationDate: '2023-12-01',
        activationCall: 'JA1XYZ',
        cityJ: '静岡県',
        maidenhead: 'PM96aa'
      })
    })
  })

  describe('Park API Transformation', () => {
    it('should transform park search response to internal Park model', async () => {
      const mockApiResponse: ParkSearchResponse[] = [
        {
          pota: 'JP-0001',
          wwff: 'JAFF-0001',
          name: 'Test Park',
          nameJ: 'テスト公園',
          locid: ['TKY001'],
          area: 1000.5,
          lat: 35.6762,
          lon: 139.6503,
          atmpt: 10,
          act: 5,
          date: '2023-12-01',
          qsos: 50
        }
      ]

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchParks({
        pota_code: 'JP-0001'
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        potaCode: 'JP-0001',
        wwffCode: 'JAFF-0001',
        parkNameJ: 'テスト公園',
        latitude: 35.6762,
        longitude: 139.6503,
        date: '2023-12-01',
        locid: ['TKY001'],
        act: 5,
        qsos: 50,
        activations: 5,
        attempts: 10
      })
    })
  })

  describe('Search In Bounds API Transformation', () => {
    it('should transform bounds search response to internal models', async () => {
      const mockApiResponse: SearchInBoundsResponse = {
        sota: [
          {
            code: 'JA/ST-001',
            name: 'Summit 1',
            nameJ: 'サミット1',
            lat: 35.6762,
            lon: 139.6503,
            alt: 1000,
            pts: 10,
            count: 5
          }
        ],
        pota: [
          {
            pota: 'JP-0001',
            wwff: 'JAFF-0001',
            name: 'Park 1',
            nameJ: 'パーク1',
            locid: ['TKY001'],
            area: 1000.5,
            lat: 35.6762,
            lon: 139.6503,
            atmpt: 10,
            act: 5,
            date: '2023-12-01',
            qsos: 50
          }
        ]
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchInBounds({
        min_lat: 35.0,
        min_lon: 139.0,
        max_lat: 36.0,
        max_lon: 140.0
      })

      expect(result.summits).toHaveLength(1)
      expect(result.parks).toHaveLength(1)
      expect(result.summits[0].summitCode).toBe('JA/ST-001')
      expect(result.parks[0].potaCode).toBe('JP-0001')
    })
  })

  describe('Spot API Transformation', () => {
    it('should transform grouped spot response to flat spot array', async () => {
      const mockApiResponse: SpotResponse = {
        spots: [
          {
            key: 'SOTA',
            values: [
              {
                activator: 'JA1XYZ',
                activatorName: 'Test Operator',
                comment: 'Test comment',
                frequency: '14.230',
                mode: 'SSB',
                program: 'SOTA',
                qsos: 5,
                reference: 'JA/ST-001',
                referenceDetail: 'Test Summit',
                spotId: 12345,
                spotTime: '2023-12-01T10:00:00Z',
                spotter: 'JA1ABC'
              }
            ]
          }
        ]
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.getActivationSpots({
        pat_ref: 'JA'
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        activator: 'JA1XYZ',
        activatorName: 'Test Operator',
        comment: 'Test comment',
        frequency: '14.230',
        mode: 'SSB',
        program: 'SOTA',
        qsos: 5,
        reference: 'JA/ST-001',
        referenceDetail: 'Test Summit',
        spotId: 12345,
        spotTime: '2023-12-01T10:00:00Z',
        spotter: 'JA1ABC'
      })
    })

    it('should handle empty spot groups', async () => {
      const mockApiResponse: SpotResponse = {
        spots: []
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.getActivationSpots({
        pat_ref: 'JA'
      })

      expect(result).toEqual([])
    })
  })

  describe('Reference Search API Transformation', () => {
    it('should transform reference search response to separated summit/park models', async () => {
      const mockApiResponse: ReferenceSearchResponse = {
        candidates: [
          {
            code: 'JA/ST-001',
            name: 'Test Summit',
            lat: 35.6762,
            lon: 139.6503,
            program: 'SOTA'
          },
          {
            code: 'JP-0001',
            name: 'Test Park',
            lat: 35.6762,
            lon: 139.6503,
            program: 'POTA'
          }
        ]
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchReference('Test')

      expect(result.summits).toHaveLength(1)
      expect(result.parks).toHaveLength(1)
      expect(result.summits[0].summitCode).toBe('JA/ST-001')
      expect(result.parks[0].potaCode).toBe('JP-0001')
    })

    it('should handle reference search without program field (pattern matching)', async () => {
      const mockApiResponse: ReferenceSearchResponse = {
        candidates: [
          {
            code: 'JA/FI-009',
            name: 'Genanpo',
            lat: 35.8866,
            lon: 136.4649
            // No program field - should be detected as SOTA by pattern
          },
          {
            code: 'JP-0001/JAFF-0021',
            name: 'Rishiri-Rebun-Sarobetsu',
            lat: 45.194166,
            lon: 141.238826
            // No program field - should be detected as POTA by pattern
          }
        ]
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchReference('Test')

      expect(result.summits).toHaveLength(1)
      expect(result.parks).toHaveLength(1)
      expect(result.summits[0].summitCode).toBe('JA/FI-009')
      expect(result.summits[0].summitName).toBe('Genanpo')
      expect(result.parks[0].potaCode).toBe('JP-0001/JAFF-0021')
      expect(result.parks[0].parkNameJ).toBe('Rishiri-Rebun-Sarobetsu')
    })

    it('should transform detailed reference search response with full data', async () => {
      const mockApiResponse: ReferenceSearchDetailResponse = {
        candidates: [
          {
            code: 'JA/ST-001',
            name: 'Test Summit',
            nameJ: 'テストサミット',
            lat: 35.6762,
            lon: 139.6503,
            program: 'SOTA',
            alt: 1000,
            pts: 10,
            bonusPts: 5,
            count: 3,
            date: '2023-12-01',
            call: 'JA1XYZ',
            city: '静岡県',
            maidenhead: 'PM95sq'
          }
        ]
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchReferenceDetails('JA/ST-001')

      expect(result.summits).toHaveLength(1)
      expect(result.summits[0]).toEqual({
        summitCode: 'JA/ST-001',
        summitName: 'Test Summit',
        summitNameJ: 'テストサミット',
        latitude: 35.6762,
        longitude: 139.6503,
        altM: 1000,
        points: 10,
        bonusPoints: 5,
        activationCount: 3,
        activationDate: '2023-12-01',
        activationCall: 'JA1XYZ',
        cityJ: '静岡県',
        maidenhead: 'PM95sq'
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw on API errors (as expected behavior)', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(APIService.searchSummits({
        lat: 35.6762,
        lon: 139.6503
      })).rejects.toThrow('Network error')
    })

    it('should handle null API responses', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      })

      const result = await APIService.searchInBounds({
        min_lat: 35.0,
        min_lon: 139.0,
        max_lat: 36.0,
        max_lon: 140.0
      })

      expect(result).toEqual({ summits: [], parks: [] })
    })
  })

  describe('Type Safety Validation', () => {
    it('should ensure all returned objects match internal type definitions', async () => {
      const mockApiResponse: SummitSearchResponse[] = [
        {
          code: 'JA/ST-001',
          name: 'Test Summit',
          nameJ: 'テストサミット',
          lat: 35.6762,
          lon: 139.6503,
          alt: 1000,
          pts: 10,
          count: 5
        }
      ]

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      const result = await APIService.searchSummits({
        lat: 35.6762,
        lon: 139.6503
      })

      // Verify all required internal Summit fields are present
      const summit = result[0]
      expect(typeof summit.summitCode).toBe('string')
      expect(typeof summit.summitName).toBe('string')
      expect(typeof summit.latitude).toBe('number')
      expect(typeof summit.longitude).toBe('number')
      expect(typeof summit.altM).toBe('number')
      expect(typeof summit.points).toBe('number')
      expect(typeof summit.bonusPoints).toBe('number')
      expect(typeof summit.activationCount).toBe('number')
      expect(typeof summit.maidenhead).toBe('string')
    })
  })
})