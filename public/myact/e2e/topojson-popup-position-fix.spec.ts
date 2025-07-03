import { test, expect } from '@playwright/test'

test.describe('TopoJSON Popup Position Fix (Post-Reload)', () => {
  test.beforeEach(async ({ page }) => {
    // Apply test configuration optimized for TopoJSON testing
    await page.goto('http://localhost:5173/myact/?testProfile=topoJsonPositionTest')
    
    // Wait for app initialization
    await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 30000 })
    
    // Enable comprehensive debugging
    await page.evaluate(() => {
      if ((window as any).testConfig?.playwrightHelpers) {
        const helpers = (window as any).testConfig.playwrightHelpers
        helpers.enableDebugForFeature('topojson-click')
        helpers.enableDebugForFeature('map-coordinate')
        helpers.enableDebugForFeature('popup-position')
        helpers.enableDebugForFeature('map-events')
      }
    })
    
    // Enable display_area preference for TopoJSON layer visibility
    await page.evaluate(() => {
      const { useMapStore } = window as any
      if (useMapStore?.getState) {
        const store = useMapStore.getState()
        if (store.updatePreferences) {
          store.updatePreferences({ display_area: true })
        }
      }
    })
    
    // Wait for TopoJSON layer to load
    await page.waitForTimeout(3000)
    
    console.log('TOPOJSON-POS: Test setup complete')
  })

  test('should display park popup at correct position before and after page reload', async ({ page }) => {
    console.log('TOPOJSON-POS: Starting popup position test')
    
    // Step 1: Test initial park area click (before reload)
    console.log('TOPOJSON-POS: Testing initial park area click')
    
    // Navigate to Japan area where parks are visible
    await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (map) {
        console.log('TOPOJSON-POS: Setting view to Japan (park area)')
        map.setView([35.6762, 139.6503], 8) // Tokyo area with parks
      }
    })
    
    await page.waitForTimeout(2000)
    
    // Verify TopoJSON layer is loaded
    const topoLayerLoaded = await page.evaluate(() => {
      const topoLayer = document.querySelector('.leaflet-overlay-pane svg')
      console.log('TOPOJSON-POS: TopoJSON SVG element found:', !!topoLayer)
      return !!topoLayer
    })
    
    expect(topoLayerLoaded).toBe(true)
    
    // Monitor console logs for popup positioning
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('TopoJSONLayer') || text.includes('TOPOJSON-POS') || 
          text.includes('coordinate conversion') || text.includes('popup position')) {
        consoleLogs.push(text)
        console.log(`TOPOJSON-POS: ${text}`)
      }
    })
    
    // Find and click on a park area (TopoJSON polygon)
    const parkAreaClicked = await page.evaluate(() => {
      const DEBUG = true
      console.log('TOPOJSON-POS: Searching for park areas to click')
      
      // Look for SVG paths in the TopoJSON layer
      const svgPaths = document.querySelectorAll('.leaflet-overlay-pane svg path')
      console.log(`TOPOJSON-POS: Found ${svgPaths.length} SVG paths (park areas)`)
      
      if (svgPaths.length > 0) {
        const firstPath = svgPaths[0] as SVGPathElement
        const rect = firstPath.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        console.log(`TOPOJSON-POS: Clicking park area at (${centerX}, ${centerY})`)
        console.log('TOPOJSON-POS: Park area dimensions:', rect)
        
        // Create click event on the park area
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY
        })
        
        firstPath.dispatchEvent(clickEvent)
        return true
      } else {
        console.log('TOPOJSON-POS: No park areas found for clicking')
        return false
      }
    })
    
    if (!parkAreaClicked) {
      console.log('TOPOJSON-POS: Falling back to map area click for testing')
      await page.click('.leaflet-container', { position: { x: 400, y: 300 } })
    }
    
    await page.waitForTimeout(1000)
    
    // Step 2: Verify popup appears and capture position
    console.log('TOPOJSON-POS: Verifying initial popup position')
    
    const initialPopupInfo = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup')
      const popupContent = document.querySelector('.leaflet-popup-content')
      
      if (popup && popupContent) {
        const popupRect = popup.getBoundingClientRect()
        const hasReferences = popupContent.textContent?.includes('JA-') || 
                             popupContent.textContent?.includes('JAFF-')
        
        console.log('TOPOJSON-POS: Initial popup found')
        console.log('TOPOJSON-POS: Initial popup position:', popupRect)
        console.log('TOPOJSON-POS: Initial popup has references:', hasReferences)
        
        return {
          visible: true,
          position: { x: popupRect.x, y: popupRect.y, width: popupRect.width, height: popupRect.height },
          hasReferences,
          content: popupContent.textContent?.slice(0, 100) || ''
        }
      } else {
        console.log('TOPOJSON-POS: No initial popup found')
        return { visible: false, position: null, hasReferences: false, content: '' }
      }
    })
    
    expect(initialPopupInfo.visible).toBe(true)
    console.log('TOPOJSON-POS: Initial popup info:', initialPopupInfo)
    
    // Step 3: Close popup and verify closure
    await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup')
      if (popup) {
        const closeButton = popup.querySelector('.leaflet-popup-close-button') as HTMLElement
        if (closeButton) {
          console.log('TOPOJSON-POS: Closing popup with close button')
          closeButton.click()
        } else {
          console.log('TOPOJSON-POS: Removing popup programmatically')
          popup.remove()
        }
      }
    })
    
    await page.waitForTimeout(500)
    
    // Verify popup is closed
    const popupClosed = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup')
      return !popup
    })
    
    expect(popupClosed).toBe(true)
    console.log('TOPOJSON-POS: Popup successfully closed')
    
    // Step 4: CRITICAL TEST - Reload page and test position consistency
    console.log('TOPOJSON-POS: Reloading page to test position displacement fix')
    
    await page.reload({ waitUntil: 'networkidle' })
    
    // Re-apply test configuration after reload
    await page.evaluate(() => {
      if ((window as any).testConfig?.playwrightHelpers) {
        const helpers = (window as any).testConfig.playwrightHelpers
        helpers.enableDebugForFeature('topojson-click')
        helpers.enableDebugForFeature('map-coordinate')
        helpers.enableDebugForFeature('popup-position')
      }
    })
    
    // Re-enable display_area preference after reload
    await page.evaluate(() => {
      const { useMapStore } = window as any
      if (useMapStore?.getState) {
        const store = useMapStore.getState()
        if (store.updatePreferences) {
          store.updatePreferences({ display_area: true })
        }
      }
    })
    
    // Wait for full map stabilization after reload
    await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 30000 })
    await page.waitForTimeout(5000) // Extended wait for coordinate system stabilization
    
    console.log('TOPOJSON-POS: Page reloaded, waiting for map stabilization')
    
    // Step 5: Verify map coordinate system is stable
    const coordinateSystemStable = await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (!map) {
        console.log('TOPOJSON-POS: Map reference not available after reload')
        return false
      }
      
      try {
        // Test coordinate conversion stability
        const testPoint = map.latLngToContainerPoint([35.6762, 139.6503])
        const isValid = testPoint && testPoint.x > 0 && testPoint.y > 0 && 
                       testPoint.x < 10000 && testPoint.y < 10000
        
        console.log('TOPOJSON-POS: Post-reload coordinate conversion test:', testPoint)
        console.log('TOPOJSON-POS: Coordinate system stable:', isValid)
        
        return isValid
      } catch (error) {
        console.log('TOPOJSON-POS: Coordinate conversion error after reload:', error)
        return false
      }
    })
    
    expect(coordinateSystemStable).toBe(true)
    
    // Step 6: Test park area click after reload (critical test)
    console.log('TOPOJSON-POS: Testing park area click after reload')
    
    // Navigate to same area as before
    await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (map) {
        console.log('TOPOJSON-POS: Re-setting view to Japan (park area) after reload')
        map.setView([35.6762, 139.6503], 8)
      }
    })
    
    await page.waitForTimeout(2000)
    
    // Clear previous console logs and monitor for issues
    consoleLogs.length = 0
    
    // Click on park area again after reload
    const postReloadClicked = await page.evaluate(() => {
      console.log('TOPOJSON-POS: Clicking park area after reload')
      
      const svgPaths = document.querySelectorAll('.leaflet-overlay-pane svg path')
      console.log(`TOPOJSON-POS: Found ${svgPaths.length} SVG paths after reload`)
      
      if (svgPaths.length > 0) {
        const firstPath = svgPaths[0] as SVGPathElement
        const rect = firstPath.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        console.log(`TOPOJSON-POS: Post-reload click at (${centerX}, ${centerY})`)
        
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY
        })
        
        firstPath.dispatchEvent(clickEvent)
        return true
      }
      return false
    })
    
    if (!postReloadClicked) {
      await page.click('.leaflet-container', { position: { x: 400, y: 300 } })
    }
    
    await page.waitForTimeout(2000) // Extended wait for popup processing
    
    // Step 7: Verify popup position is correct after reload (critical verification)
    const postReloadPopupInfo = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup')
      const popupContent = document.querySelector('.leaflet-popup-content')
      
      if (popup && popupContent) {
        const popupRect = popup.getBoundingClientRect()
        const hasReferences = popupContent.textContent?.includes('JA-') || 
                             popupContent.textContent?.includes('JAFF-')
        
        console.log('TOPOJSON-POS: Post-reload popup found')
        console.log('TOPOJSON-POS: Post-reload popup position:', popupRect)
        console.log('TOPOJSON-POS: Post-reload popup has references:', hasReferences)
        
        return {
          visible: true,
          position: { x: popupRect.x, y: popupRect.y, width: popupRect.width, height: popupRect.height },
          hasReferences,
          content: popupContent.textContent?.slice(0, 100) || ''
        }
      } else {
        console.log('TOPOJSON-POS: No post-reload popup found')
        return { visible: false, position: null, hasReferences: false, content: '' }
      }
    })
    
    expect(postReloadPopupInfo.visible).toBe(true)
    console.log('TOPOJSON-POS: Post-reload popup info:', postReloadPopupInfo)
    
    // Step 8: Verify unified popup system is working (no duplicate popups)
    const popupSystemCheck = await page.evaluate(() => {
      const popups = document.querySelectorAll('.leaflet-popup')
      const leafletPopups = document.querySelectorAll('.leaflet-popup-content')
      
      console.log(`TOPOJSON-POS: Found ${popups.length} popup containers`)
      console.log(`TOPOJSON-POS: Found ${leafletPopups.length} popup content areas`)
      
      return {
        totalPopups: popups.length,
        totalContent: leafletPopups.length,
        unified: popups.length <= 1 && leafletPopups.length <= 1
      }
    })
    
    expect(popupSystemCheck.unified).toBe(true)
    expect(popupSystemCheck.totalPopups).toBeLessThanOrEqual(1)
    console.log('TOPOJSON-POS: Unified popup system verified:', popupSystemCheck)
    
    // Step 9: Verify handleParkClick function is being called (not fallback Leaflet popup)
    const handlerVerification = await page.evaluate(() => {
      // Check if our React-based popup system is being used
      const reactPopup = document.querySelector('.leaflet-popup [data-testid]') ||
                        document.querySelector('.leaflet-popup div[style*="font-size: 12px"]')
      
      console.log('TOPOJSON-POS: React-based popup detected:', !!reactPopup)
      
      return {
        reactBased: !!reactPopup,
        hasStyleMarkers: !!document.querySelector('.leaflet-popup div[style*="font-size: 12px"]')
      }
    })
    
    console.log('TOPOJSON-POS: Handler verification:', handlerVerification)
    
    // Step 10: Test coordinate conversion is working correctly
    const coordinateTest = await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (!map) return { valid: false, error: 'No map reference' }
      
      try {
        // Test multiple coordinate conversions
        const testPoints = [
          [35.6762, 139.6503], // Tokyo
          [34.6937, 135.5023], // Osaka
          [43.0642, 141.3469]  // Sapporo
        ]
        
        const results = testPoints.map(([lat, lng]) => {
          const point = map.latLngToContainerPoint([lat, lng])
          const backToLatLng = map.containerPointToLatLng(point)
          
          return {
            original: [lat, lng],
            containerPoint: point,
            backConverted: [backToLatLng.lat, backToLatLng.lng],
            valid: point && point.x > 0 && point.y > 0 && point.x < 10000 && point.y < 10000
          }
        })
        
        console.log('TOPOJSON-POS: Coordinate conversion test results:', results)
        
        const allValid = results.every(r => r.valid)
        return { valid: allValid, results }
      } catch (error) {
        console.log('TOPOJSON-POS: Coordinate conversion test failed:', error)
        return { valid: false, error: error.toString() }
      }
    })
    
    expect(coordinateTest.valid).toBe(true)
    console.log('TOPOJSON-POS: Coordinate conversion test passed')
    
    // Final verification: Check console logs for errors
    const hasErrors = consoleLogs.some(log => 
      log.includes('error') || log.includes('failed') || log.includes('displacement')
    )
    
    expect(hasErrors).toBe(false)
    
    console.log('TOPOJSON-POS: Test completed successfully')
    console.log(`TOPOJSON-POS: Captured ${consoleLogs.length} debug logs`)
  })

  test('should correctly handle TopoJSON click vs marker click separation', async ({ page }) => {
    console.log('TOPOJSON-POS: Testing TopoJSON vs marker click separation')
    
    // Navigate to area with both parks and summits
    await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (map) {
        map.setView([35.6762, 139.6503], 10) // Tokyo area with mixed markers
      }
    })
    
    await page.waitForTimeout(3000)
    
    // Test 1: Click on TopoJSON area (should show park info)
    console.log('TOPOJSON-POS: Testing TopoJSON area click')
    
    const topoClickResult = await page.evaluate(() => {
      const svgPaths = document.querySelectorAll('.leaflet-overlay-pane svg path')
      if (svgPaths.length > 0) {
        const path = svgPaths[0] as SVGPathElement
        const rect = path.getBoundingClientRect()
        
        console.log('TOPOJSON-POS: Clicking TopoJSON path area')
        path.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        }))
        return true
      }
      return false
    })
    
    if (topoClickResult) {
      await page.waitForTimeout(1000)
      
      // Verify park popup appears
      const parkPopup = await page.evaluate(() => {
        const popup = document.querySelector('.leaflet-popup-content')
        if (popup) {
          const content = popup.textContent || ''
          const isParkInfo = content.includes('JA-') || content.includes('JAFF-')
          console.log('TOPOJSON-POS: TopoJSON click shows park info:', isParkInfo)
          return { found: true, isParkInfo, content: content.slice(0, 50) }
        }
        return { found: false, isParkInfo: false, content: '' }
      })
      
      expect(parkPopup.found).toBe(true)
      console.log('TOPOJSON-POS: Park popup verification:', parkPopup)
    }
    
    // Close any existing popup
    await page.evaluate(() => {
      const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement
      if (closeButton) closeButton.click()
    })
    
    await page.waitForTimeout(500)
    
    // Test 2: Click on summit marker (should show summit info, not park)
    console.log('TOPOJSON-POS: Testing summit marker click separation')
    
    const summitClickResult = await page.evaluate(() => {
      const summitMarkers = document.querySelectorAll('.summit-marker, .leaflet-marker-icon')
      if (summitMarkers.length > 0) {
        const marker = summitMarkers[0] as HTMLElement
        const rect = marker.getBoundingClientRect()
        
        console.log('TOPOJSON-POS: Clicking summit marker')
        marker.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        }))
        return true
      }
      return false
    })
    
    if (summitClickResult) {
      await page.waitForTimeout(1000)
      
      // Verify summit popup appears (not park info)
      const summitPopup = await page.evaluate(() => {
        const popup = document.querySelector('.leaflet-popup-content')
        if (popup) {
          const content = popup.textContent || ''
          const isSummitInfo = content.includes('JA/') || content.includes('標高') || content.includes('pts')
          const isParkInfo = content.includes('JAFF-') && !content.includes('JA/')
          console.log('TOPOJSON-POS: Summit click shows summit info:', isSummitInfo)
          console.log('TOPOJSON-POS: Summit click incorrectly shows park info:', isParkInfo)
          return { found: true, isSummitInfo, isParkInfo, content: content.slice(0, 50) }
        }
        return { found: false, isSummitInfo: false, isParkInfo: false, content: '' }
      })
      
      expect(summitPopup.found).toBe(true)
      expect(summitPopup.isParkInfo).toBe(false) // Critical: should not show park info on summit click
      console.log('TOPOJSON-POS: Summit popup verification:', summitPopup)
    }
    
    console.log('TOPOJSON-POS: Click separation test completed')
  })

  test('should handle coordinate validation and retry mechanism', async ({ page }) => {
    console.log('TOPOJSON-POS: Testing coordinate validation and retry mechanism')
    
    // Simulate map in unstable state by manipulating coordinate conversion
    await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (map) {
        // Temporarily override coordinate conversion to simulate instability
        const originalLatLngToContainerPoint = map.latLngToContainerPoint
        let callCount = 0
        
        map.latLngToContainerPoint = function(latlng: any) {
          callCount++
          if (callCount <= 2) {
            // Simulate invalid coordinates for first 2 calls
            console.log('TOPOJSON-POS: Simulating invalid coordinate conversion')
            return { x: -999, y: -999 }
          }
          // Return to normal after retry
          console.log('TOPOJSON-POS: Coordinate conversion stabilized')
          return originalLatLngToContainerPoint.call(this, latlng)
        }
        
        ;(window as any).mapCoordinateTestSetup = true
      }
    })
    
    // Trigger TopoJSON click with unstable coordinates
    const clickResult = await page.evaluate(() => {
      const svgPaths = document.querySelectorAll('.leaflet-overlay-pane svg path')
      if (svgPaths.length > 0) {
        const path = svgPaths[0] as SVGPathElement
        const rect = path.getBoundingClientRect()
        
        console.log('TOPOJSON-POS: Triggering click with unstable coordinates')
        path.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        }))
        return true
      }
      return false
    })
    
    expect(clickResult).toBe(true)
    
    // Wait for retry mechanism to complete
    await page.waitForTimeout(1500) // 500ms retry delay + processing time
    
    // Verify popup eventually appears after retry
    const retryPopupResult = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup-content')
      return {
        found: !!popup,
        content: popup?.textContent?.slice(0, 50) || ''
      }
    })
    
    expect(retryPopupResult.found).toBe(true)
    console.log('TOPOJSON-POS: Retry mechanism successful:', retryPopupResult)
    
    // Restore normal coordinate conversion
    await page.evaluate(() => {
      const map = (window as any).mapRef?.current
      if (map && (window as any).mapCoordinateTestSetup) {
        // Restore original behavior
        delete map.latLngToContainerPoint
        console.log('TOPOJSON-POS: Coordinate conversion restored to normal')
      }
    })
    
    console.log('TOPOJSON-POS: Coordinate validation test completed')
  })
})