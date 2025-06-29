import { vi } from 'vitest'
import type { Summit, Park, Spot } from '@/types'

// Mock API responses
export const mockSummit: Summit = {
  summitCode: 'JA/ST-001',
  summitName: 'Test Summit',
  summitNameJ: 'テストサミット',
  latitude: 35.6762,
  longitude: 139.6503,
  altM: 1000,
  points: 10,
  bonusPoints: 0,
  activationCount: 5,
  activationDate: '2024-01-01',
  activationCall: 'JA1TEST',
  cityJ: 'テスト市',
  maidenhead: 'PM95sq',
}

export const mockPark: Park = {
  potaCode: 'JP-0001',
  wwffCode: 'JAFF-001',
  parkNameJ: 'テスト国立公園',
  latitude: 35.6762,
  longitude: 139.6503,
  date: '2024-01-01',
  locid: ['test-loc-1'],
  act: 1,
  qsos: 50,
  activations: 3,
  attempts: 5,
}

export const mockSpot: Spot = {
  spotTime: '2024-01-01T10:00:00Z',
  activator: 'JA1TEST',
  reference: 'JA/ST-001',
  frequency: '14.230',
  mode: 'SSB',
  comment: 'QRV from test summit',
  program: 'SOTA',
}

export const mockGeocodingResult = {
  prefecture: '13',
  municipality: 'テスト区',
  jccCode: '1301',
  jcgCode: null,
  wardCode: null,
  hamlogCode: null,
  jccText: 'Tokyo',
  jcgText: '',
  maidenhead: 'PM95sq',
  elevation: 100,
  hsrc: 'GSI',
  areacode: ['13101'],
  errors: 'OK',
}

// Mock API service
export const mockAPIService = {
  getGeomagneticData: vi.fn().mockResolvedValue({
    kIndex: 2,
    aIndex: 10,
    timestamp: '2024-01-01T00:00:00Z',
  }),

  searchSummits: vi.fn().mockResolvedValue([mockSummit]),

  searchParks: vi.fn().mockResolvedValue([mockPark]),

  searchInBounds: vi.fn().mockResolvedValue({
    sota: [mockSummit],
    pota: [mockPark],
  }),

  getActivationSpots: vi.fn().mockResolvedValue([mockSpot]),

  getAPRSTracks: vi.fn().mockResolvedValue([]),

  searchReference: vi.fn().mockResolvedValue({
    summit: mockSummit,
    park: mockPark,
  }),

  getPOTALog: vi.fn().mockResolvedValue([]),

  getPOTALogStats: vi.fn().mockResolvedValue({
    totalLogs: 0,
    totalSize: 0,
    activeLogs: 0,
  }),

  uploadPOTALog: vi.fn().mockResolvedValue({ success: true }),

  deletePOTALog: vi.fn().mockResolvedValue({ success: true }),

  sharePOTALog: vi.fn().mockResolvedValue({ shareKey: 'test-share-key' }),

  importSharedPOTALog: vi.fn().mockResolvedValue({ success: true }),
}

// Mock geocoding service
export const mockGeocodingService = {
  reverseGeocode: vi.fn().mockResolvedValue(mockGeocodingResult),
  getElevation: vi.fn().mockResolvedValue(100),
  getMapCode: vi.fn().mockResolvedValue('123 456 789*12'),
}

// Mock the API modules
vi.mock('@/services/api', () => ({
  APIService: mockAPIService,
}))

vi.mock('@/services/geocoding', () => ({
  GeocodingService: mockGeocodingService,
  GSIGeocodingService: {
    reverseGeocode: mockGeocodingService.reverseGeocode,
  },
  DEMService: {
    getElevation: mockGeocodingService.getElevation,
  },
}))

export { mockAPIService as APIService, mockGeocodingService as GeocodingService }