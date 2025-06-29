import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DEMService } from '../dem'

// Mock Image constructor
global.Image = class MockImage {
  public onload: (() => void) | null = null
  public onerror: (() => void) | null = null
  public crossOrigin: string = ''
  public src: string = ''

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
} as any

// Mock HTMLCanvasElement and getContext
const mockGetContext = vi.fn()
const mockDrawImage = vi.fn()
const mockGetImageData = vi.fn()

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockGetContext
})

global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return {
      width: 0,
      height: 0,
      getContext: mockGetContext
    } as any
  }
  return {} as any
})

describe('DEMService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockGetContext.mockReturnValue({
      drawImage: mockDrawImage,
      getImageData: mockGetImageData
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Coordinate Conversion', () => {
    it('should convert latitude/longitude to pixel coordinates', () => {
      const result = DEMService.latLonToPixel(35.6812, 139.7671, 14)
      
      expect(result).toHaveProperty('px')
      expect(result).toHaveProperty('tx')
      expect(result).toHaveProperty('py')
      expect(result).toHaveProperty('ty')
      expect(typeof result.px).toBe('number')
      expect(typeof result.tx).toBe('number')
      expect(typeof result.py).toBe('number')
      expect(typeof result.ty).toBe('number')
    })

    it('should convert pixel coordinates back to latitude/longitude', () => {
      const originalLat = 35.6812
      const originalLon = 139.7671
      const zoom = 14
      
      const pixel = DEMService.latLonToPixel(originalLat, originalLon, zoom)
      const converted = DEMService.pixelToLatLon(pixel.px, pixel.py, zoom)
      
      // Should be close to original coordinates (within small tolerance)
      expect(Math.abs(converted.lat - originalLat)).toBeLessThan(0.001)
      expect(Math.abs(converted.lon - originalLon)).toBeLessThan(0.001)
    })

    it('should handle edge cases for coordinate conversion', () => {
      // Test with extreme coordinates
      const result1 = DEMService.latLonToPixel(85, 180, 10)
      const result2 = DEMService.latLonToPixel(-85, -180, 10)
      
      expect(result1.px).toBeGreaterThan(0)
      expect(result2.px).toBeGreaterThan(0)
    })
  })

  describe('DEM Data Retrieval', () => {
    it('should successfully retrieve DEM data for valid coordinates', async () => {
      // Mock image data - simple 2x2 pixel data for testing
      const mockImageData = {
        data: new Uint8ClampedArray([
          // Pixel 1: R=0, G=100, B=0, A=255 -> elevation = 0*2^16 + 100*2^8 + 0 = 25600 -> 256.00m
          0, 100, 0, 255,
          // Pixel 2: R=0, G=200, B=0, A=255 -> elevation = 0*2^16 + 200*2^8 + 0 = 51200 -> 512.00m
          0, 200, 0, 255,
          // Fill remaining pixels for 256x256 = 65536 total pixels
          ...new Array(65528).fill(0).map((_, i) => i % 4 === 3 ? 255 : 0)
        ])
      }

      mockGetImageData.mockReturnValue(mockImageData)

      const coords = { x: 123, y: 456, z: 14 }
      const demData = await DEMService.getDEM(coords)

      expect(demData).toBeInstanceOf(Float32Array)
      expect(demData.length).toBe(65536) // 256 * 256
      expect(demData[0]).toBe(256.00) // First pixel elevation
      expect(demData[1]).toBe(512.00) // Second pixel elevation
    })

    it('should handle missing data elevation values', async () => {
      // Mock image data with missing elevation (special value)
      const mockImageData = {
        data: new Uint8ClampedArray([
          // Missing data: RGB = (128, 0, 0) -> value = -2^23 -> height = 0
          128, 0, 0, 255,
          ...new Array(65532).fill(0).map((_, i) => i % 4 === 3 ? 255 : 0)
        ])
      }

      mockGetImageData.mockReturnValue(mockImageData)

      const coords = { x: 123, y: 456, z: 14 }
      const demData = await DEMService.getDEM(coords)

      expect(demData).toBeInstanceOf(Float32Array)
      expect(demData[0]).toBe(0) // Missing data should be 0
    })

    it('should handle image loading errors', async () => {
      // Override Image mock to simulate error
      global.Image = class MockErrorImage {
        public onload: (() => void) | null = null
        public onerror: (() => void) | null = null
        public crossOrigin: string = ''
        public src: string = ''

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror()
          }, 0)
        }
      } as any

      const coords = { x: 123, y: 456, z: 14 }

      await expect(DEMService.getDEM(coords)).rejects.toThrow()
    })

    it('should handle 5m mesh fallback to 10m mesh', async () => {
      let imageLoadAttempts = 0
      
      // Mock Image to fail first (5m mesh) then succeed (10m mesh)
      global.Image = class MockFallbackImage {
        public onload: (() => void) | null = null
        public onerror: (() => void) | null = null
        public crossOrigin: string = ''
        public src: string = ''

        constructor() {
          imageLoadAttempts++
          setTimeout(() => {
            if (imageLoadAttempts === 1) {
              // First attempt (5m mesh) fails
              if (this.onerror) this.onerror()
            } else {
              // Second attempt (10m mesh) succeeds
              if (this.onload) this.onload()
            }
          }, 0)
        }
      } as any

      const mockImageData = {
        data: new Uint8ClampedArray(65536 * 4) // 256x256 pixels, 4 bytes each
      }
      mockGetImageData.mockReturnValue(mockImageData)

      const coords = { x: 123, y: 456, z: 14 }
      const demData = await DEMService.getDEM(coords)

      expect(demData).toBeInstanceOf(Float32Array)
      expect(imageLoadAttempts).toBe(2) // Should have tried both 5m and 10m
    })
  })

  describe('Point Elevation Retrieval', () => {
    it('should get elevation for a specific point', async () => {
      const mockImageData = {
        data: new Uint8ClampedArray([
          // Mock data for center pixel (128, 128) -> index 128*256 + 128 = 32896
          ...new Array(32896 * 4).fill(0).map((_, i) => i % 4 === 3 ? 255 : 0),
          // Center pixel: elevation = 100m
          0, 39, 16, 255, // RGB(0, 39, 16) -> 0*2^16 + 39*2^8 + 16 = 10000 -> 100.00m
          ...new Array((65536 - 32897) * 4).fill(0).map((_, i) => i % 4 === 3 ? 255 : 0)
        ])
      }

      mockGetImageData.mockReturnValue(mockImageData)

      const elevation = await DEMService.getElevationAtPoint(35.6812, 139.7671, 14)

      expect(typeof elevation).toBe('number')
      expect(elevation).toBeGreaterThanOrEqual(0)
    })

    it('should handle elevation retrieval errors gracefully', async () => {
      // Mock Image to always fail
      global.Image = class MockErrorImage {
        public onload: (() => void) | null = null
        public onerror: (() => void) | null = null
        public crossOrigin: string = ''
        public src: string = ''

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror()
          }, 0)
        }
      } as any

      const elevation = await DEMService.getElevationAtPoint(35.6812, 139.7671, 14)

      expect(elevation).toBe(0) // Should return 0 on error
    })
  })

  describe('URL Template Formatting', () => {
    it('should format URL templates correctly', () => {
      // This tests the private formatURL method indirectly through getDEM
      const coords = { x: 123, y: 456, z: 14 }
      
      // We can't directly test the private method, but we can verify
      // that the URLs are being constructed properly by mocking Image
      // and checking what URLs are requested
      let requestedUrls: string[] = []
      
      global.Image = class MockUrlImage {
        public onload: (() => void) | null = null
        public onerror: (() => void) | null = null
        public crossOrigin: string = ''
        
        private _src: string = ''
        public get src(): string { return this._src }
        public set src(value: string) {
          this._src = value
          requestedUrls.push(value)
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      } as any

      const mockImageData = {
        data: new Uint8ClampedArray(65536 * 4)
      }
      mockGetImageData.mockReturnValue(mockImageData)

      return DEMService.getDEM(coords).then(() => {
        expect(requestedUrls.length).toBeGreaterThan(0)
        expect(requestedUrls[0]).toContain('123')
        expect(requestedUrls[0]).toContain('456')
        expect(requestedUrls[0]).toContain('14')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle canvas context creation failure', async () => {
      // Mock getContext to return null
      mockGetContext.mockReturnValue(null)

      const coords = { x: 123, y: 456, z: 14 }

      await expect(DEMService.getDEM(coords)).rejects.toThrow('Cannot get canvas context')
    })

    it('should handle invalid coordinates gracefully', async () => {
      const mockImageData = {
        data: new Uint8ClampedArray(65536 * 4)
      }
      mockGetImageData.mockReturnValue(mockImageData)

      // Test with various invalid coordinate values
      const invalidCoords = [
        { x: -1, y: 456, z: 14 },
        { x: 123, y: -1, z: 14 },
        { x: 123, y: 456, z: -1 }
      ]

      for (const coords of invalidCoords) {
        const demData = await DEMService.getDEM(coords)
        expect(demData).toBeInstanceOf(Float32Array)
      }
    })
  })

  describe('Performance', () => {
    it('should complete DEM retrieval within reasonable time', async () => {
      const mockImageData = {
        data: new Uint8ClampedArray(65536 * 4)
      }
      mockGetImageData.mockReturnValue(mockImageData)

      const coords = { x: 123, y: 456, z: 14 }
      const startTime = Date.now()
      
      await DEMService.getDEM(coords)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle large pixel arrays efficiently', async () => {
      // Test with full 256x256 image data
      const largeImageData = {
        data: new Uint8ClampedArray(65536 * 4) // Full size
      }
      
      // Fill with test pattern
      for (let i = 0; i < 65536; i++) {
        largeImageData.data[i * 4] = i % 256     // R
        largeImageData.data[i * 4 + 1] = (i / 256) % 256 // G
        largeImageData.data[i * 4 + 2] = 0       // B
        largeImageData.data[i * 4 + 3] = 255     // A
      }

      mockGetImageData.mockReturnValue(largeImageData)

      const coords = { x: 123, y: 456, z: 14 }
      const demData = await DEMService.getDEM(coords)

      expect(demData).toBeInstanceOf(Float32Array)
      expect(demData.length).toBe(65536)
      
      // Verify some elevation values are computed correctly
      expect(demData[0]).toBeGreaterThanOrEqual(0)
      expect(demData[65535]).toBeGreaterThanOrEqual(0)
    })
  })
})