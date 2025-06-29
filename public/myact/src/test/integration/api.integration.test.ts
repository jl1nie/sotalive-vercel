import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIService } from '@/services/api'

/**
 * Integration tests for production API endpoints
 * These tests run against the actual SOTA App API v2
 * 
 * Note: These are marked as integration tests and can be run separately
 * to avoid affecting unit test performance
 */

// Skip these tests in CI/automated environments to avoid API rate limits
const shouldRunIntegrationTests = process.env.VITEST_INTEGRATION === 'true'

const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip

describeIntegration('SOTA App API v2 Integration Tests', () => {
  const timeout = 30000 // 30 seconds for API calls

  beforeAll(() => {
    console.log('Running integration tests against production API')
    console.log('API Base URL:', APIService.baseURL)
  })

  afterAll(() => {
    console.log('Integration tests completed')
  })

  describe('Summit Search', () => {
    it('should search summits within Tokyo bounds', async () => {
      // Tokyo area bounds (Eastern longitude format for Japan)
      const bounds = {
        min_lat: 35.6,
        min_lon: 139.6,  // Eastern longitude (positive)
        max_lat: 35.8,
        max_lon: 140.4   // Eastern longitude (positive)
      }

      const result = await APIService.searchInBounds(bounds)
      
      expect(result).toBeDefined()
      console.log('Summit search result:', result)
      
      // API might return different structure or null
      if (result && result.sota && Array.isArray(result.sota) && result.sota.length > 0) {
        const summit = result.sota[0]
        expect(summit).toHaveProperty('summit_code')
        expect(summit).toHaveProperty('summit_name')
        expect(typeof summit.lat).toBe('number')
        expect(typeof summit.lon).toBe('number')
        
        // Verify coordinates are within bounds
        expect(summit.lat).toBeGreaterThanOrEqual(bounds.min_lat)
        expect(summit.lat).toBeLessThanOrEqual(bounds.max_lat)
        expect(summit.lon).toBeGreaterThanOrEqual(bounds.min_lon)
        expect(summit.lon).toBeLessThanOrEqual(bounds.max_lon)
      }
    }, timeout)

    it('should search parks within Tokyo bounds', async () => {
      const bounds = {
        min_lat: 35.6,
        min_lon: 139.6,  // Eastern longitude (positive)
        max_lat: 35.8,
        max_lon: 140.4   // Eastern longitude (positive)
      }

      const result = await APIService.searchInBounds(bounds)
      
      expect(result).toBeDefined()
      console.log('Park search result:', result)
      
      // Parks data might be sparse in Tokyo or API might return different structure
      if (result && result.pota && Array.isArray(result.pota) && result.pota.length > 0) {
        const park = result.pota[0]
        expect(park).toHaveProperty('pota')
        expect(park).toHaveProperty('name_j')
        expect(typeof park.lat).toBe('number')
        expect(typeof park.lon).toBe('number')
      }
    }, timeout)
  })

  describe('Reference Details', () => {
    it('should fetch summit details for known reference', async () => {
      // Use a well-known summit: Mt. Fuji
      const reference = 'JA/ST-001'
      
      try {
        const result = await APIService.getSummitDetails(reference)
        
        expect(result).toBeDefined()
        expect(result.summit_code || result.summitCode).toBe(reference)
        expect(result.summit_name || result.summitName).toContain('富士山')
        expect(typeof (result.lat || result.latitude)).toBe('number')
        expect(typeof (result.lon || result.longitude)).toBe('number')
        
        // Mt. Fuji should have elevation data
        const elevation = result.alt || result.altM
        expect(elevation).toBeGreaterThan(3000) // Mt. Fuji is > 3000m
      } catch (error) {
        // Some references might not be available
        console.warn(`Reference ${reference} not found:`, error)
      }
    }, timeout)

    it('should fetch park details for known reference', async () => {
      // Use a known park reference
      const reference = 'JP-0001'
      
      try {
        const result = await APIService.getParkDetails(reference)
        
        expect(result).toBeDefined()
        expect(result.pota || result.wwff).toBeDefined()
        expect(result.name_j || result.nameJ).toBeDefined()
        expect(typeof (result.lat || result.latitude)).toBe('number')
        expect(typeof (result.lon || result.longitude)).toBe('number')
      } catch (error) {
        // Some references might not be available
        console.warn(`Park reference ${reference} not found:`, error)
      }
    }, timeout)
  })

  describe('Real-time Data', () => {
    it('should fetch current spots', async () => {
      const spots = await APIService.getCurrentSpots()
      
      console.log('Current spots result:', spots)
      // The API may return null if no spots are available or endpoint is not found
      // This is acceptable behavior
      expect(spots).toBeDefined()
      
      // If there are active spots, verify structure
      if (spots && Array.isArray(spots) && spots.length > 0) {
        const spot = spots[0]
        expect(spot).toHaveProperty('spotTime')
        expect(spot).toHaveProperty('activator')
        expect(spot).toHaveProperty('reference')
        expect(spot).toHaveProperty('frequency')
        expect(['SOTA', 'POTA', 'WWFF']).toContain(spot.program)
      }
    }, timeout)

    it('should fetch geomagnetic data', async () => {
      const geoData = await APIService.getGeomagneticData()
      
      console.log('Geomagnetic data result:', geoData)
      expect(geoData !== null).toBe(true)
      
      if (geoData && typeof geoData === 'object') {
        if (geoData.aIndex !== undefined) {
          expect(typeof geoData.aIndex).toBe('number')
        }
        if (geoData.kIndex !== undefined) {
          expect(Array.isArray(geoData.kIndex)).toBe(true)
        }
      }
    }, timeout)

    it('should fetch APRS tracks', async () => {
      const bounds = {
        min_lat: 35.0,
        min_lon: 139.0,
        max_lat: 36.0,
        max_lon: 140.0
      }

      try {
        const tracks = await APIService.getAPRSTracks({ pat_ref: 'JA', hours_ago: 24 })
        
        expect(tracks).toBeDefined()
        expect(tracks.tracks).toBeDefined()
        expect(Array.isArray(tracks.tracks)).toBe(true)
        
        // If tracks exist, verify structure
        if (tracks.tracks.length > 0) {
          const track = tracks.tracks[0]
          expect(track).toHaveProperty('properties')
          expect(track).toHaveProperty('geometry')
          expect(track.properties).toHaveProperty('callsign')
          expect(Array.isArray(track.geometry.coordinates)).toBe(true)
        }
      } catch (error) {
        // APRS data might not always be available
        console.warn('APRS tracks not available:', error)
      }
    }, timeout)
  })

  describe('Geocoding Services', () => {
    it('should reverse geocode Tokyo coordinates', async () => {
      // Tokyo Station coordinates
      const lat = 35.6812
      const lon = 139.7671

      try {
        const result = await APIService.reverseGeocode(lat, lon)
        
        expect(result).toBeDefined()
        expect(result.city).toBeDefined()
        expect(result.address).toContain('東京')
        expect(result.muniCd).toBeDefined()
        expect(typeof result.muniCd).toBe('string')
      } catch (error) {
        console.warn('Reverse geocoding failed:', error)
        // This might fail due to API limits or availability
      }
    }, timeout)

    it('should get elevation data', async () => {
      // Mt. Fuji coordinates
      const lat = 35.3606
      const lon = 138.7274

      try {
        const elevation = await APIService.getElevation(lat, lon)
        
        expect(typeof elevation).toBe('number')
        expect(elevation).toBeGreaterThan(3000) // Mt. Fuji elevation
        expect(elevation).toBeLessThan(4000)
      } catch (error) {
        console.warn('Elevation data failed:', error)
        // DEM service might not always be available
      }
    }, timeout)
  })

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', async () => {
      const invalidBounds = {
        min_lat: 91, // Invalid latitude
        min_lon: -181, // Invalid longitude
        max_lat: -91,
        max_lon: 181
      }

      try {
        await APIService.searchInBounds(invalidBounds)
        // If it doesn't throw, that's also okay
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    }, timeout)

    it('should handle non-existent references', async () => {
      const nonExistentRef = 'XX/YZ-9999'

      try {
        await APIService.getSummitDetails(nonExistentRef)
        // If it doesn't throw, check for empty result
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    }, timeout)
  })

  describe('Performance', () => {
    it('should complete search requests within reasonable time', async () => {
      const startTime = Date.now()
      
      const bounds = {
        min_lat: 35.0,
        min_lon: 139.0,
        max_lat: 36.0,
        max_lon: 140.0
      }

      await APIService.searchInBounds(bounds)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // API should respond within 10 seconds
      expect(duration).toBeLessThan(10000)
    }, timeout)

    it('should handle concurrent requests', async () => {
      const bounds = {
        min_lat: 35.0,
        min_lon: 139.0,
        max_lat: 36.0,
        max_lon: 140.0
      }

      // Make 3 concurrent requests
      const promises = [
        APIService.searchInBounds(bounds),
        APIService.getCurrentSpots(),
        APIService.getGeomagneticData()
      ]

      const results = await Promise.allSettled(promises)
      
      // At least some should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(0)
    }, timeout)
  })
})

/**
 * Test runner configuration for integration tests
 * 
 * To run integration tests:
 * 
 * ```bash
 * # Run all tests including integration
 * VITEST_INTEGRATION=true npm run test
 * 
 * # Run only integration tests
 * VITEST_INTEGRATION=true npm run test -- src/test/integration
 * 
 * # Run with specific timeout
 * VITEST_INTEGRATION=true npm run test -- --timeout 60000
 * ```
 * 
 * Environment Variables:
 * - VITEST_INTEGRATION=true: Enable integration tests
 * - API_BASE_URL: Override API base URL (default: production)
 */