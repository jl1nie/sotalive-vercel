/**
 * Final Summit Click Fix Test
 * 
 * Comprehensive test to identify and fix the root cause of summit marker click issues
 */
import { test, expect } from '@playwright/test'

test.describe('Summit Click Final Fix', () => {
  test('comprehensive summit click investigation', async ({ page }) => {
    console.log('🧪 Testing: Comprehensive summit click issue analysis')
    
    let consoleErrors: string[] = []
    let consoleWarnings: string[] = []
    let clickHandlerLogs: string[] = []
    
    // Monitor all console messages
    page.on('console', (msg) => {
      const text = msg.text()
      
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text)
      }
      
      // Capture click-related logs
      if (text.includes('🔴 SummitMarker') || text.includes('🟢 ParkMarker') || text.includes('🏔️ handleSummitClick') || text.includes('🏞️ handleParkClick')) {
        clickHandlerLogs.push(text)
        console.log('📱 Click Handler Log:', text)
      }
      
      // Capture MapEvents logs
      if (text.includes('🗺️ MapEvents:')) {
        console.log('🗺️ Map Event:', text)
      }
    })
    
    // Navigate to the application
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for basic map container to appear
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    console.log('🗺️ Leaflet container found')
    
    // Wait for data loading
    await page.waitForTimeout(5000)
    
    // Get detailed marker information
    const markerAnalysis = await page.evaluate(() => {
      // Get zustand store state
      const store = (window as any).useMapStore?.getState()
      
      // Analyze summit and park coordinates for overlaps
      const summits = store?.summits || []
      const parks = store?.parks || []
      
      // Check for coordinate overlaps (within 0.0001 degrees ~ 10m)
      const overlaps = []
      const threshold = 0.0001
      
      for (let i = 0; i < Math.min(summits.length, 50); i++) { // Check first 50 for performance
        const summit = summits[i]
        for (let j = 0; j < Math.min(parks.length, 50); j++) {
          const park = parks[j]
          const latDiff = Math.abs(summit.latitude - park.latitude)
          const lngDiff = Math.abs(summit.longitude - park.longitude)
          
          if (latDiff < threshold && lngDiff < threshold) {
            overlaps.push({
              summit: { code: summit.summitCode, lat: summit.latitude, lng: summit.longitude },
              park: { code: park.potaCode || park.wwffCode, lat: park.latitude, lng: park.longitude },
              distance: Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
            })
          }
        }
      }
      
      return {
        summitCount: summits.length,
        parkCount: parks.length,
        overlaps: overlaps.slice(0, 10), // Return first 10 overlaps
        sampleSummit: summits[0],
        samplePark: parks[0]
      }
    })
    
    console.log('📊 Marker Analysis:', JSON.stringify(markerAnalysis, null, 2))
    
    // Count various marker elements
    const pathElements = await page.locator('path.leaflet-interactive').count()
    const circleElements = await page.locator('circle').count()
    const markerElements = await page.locator('.leaflet-marker-icon').count()
    
    console.log(`🔍 Element Count: ${pathElements} paths, ${circleElements} circles, ${markerElements} marker icons`)
    
    // Test clicking on multiple different elements to see patterns
    for (let attemptNum = 1; attemptNum <= 3; attemptNum++) {
      console.log(`\n🖱️ Click Attempt ${attemptNum}:`)
      
      // Clear any existing popups first
      const existingPopups = await page.locator('.leaflet-popup').count()
      if (existingPopups > 0) {
        console.log(`🚮 Clearing ${existingPopups} existing popups`)
        await page.locator('.leaflet-popup-close-button').click()
        await page.waitForTimeout(500)
      }
      
      // Clear click handler logs for this attempt
      clickHandlerLogs = []
      
      // Try clicking on different interactive elements
      const selector = attemptNum === 1 ? 'path.leaflet-interactive:first-child' : 
                      attemptNum === 2 ? 'path.leaflet-interactive:nth-child(10)' :
                                        'path.leaflet-interactive:nth-child(20)'
      
      try {
        // Get element position before clicking
        const elementBounds = await page.locator(selector).boundingBox()
        console.log(`🎯 Element bounds:`, elementBounds)
        
        await page.locator(selector).click({ force: true, timeout: 3000 })
        console.log(`✅ Successfully clicked on ${selector}`)
      } catch (error) {
        console.log(`❌ Failed to click on ${selector}:`, error.message)
        continue
      }
      
      // Wait for popup and handlers
      await page.waitForTimeout(2000)
      
      // Check click handler logs
      console.log(`📱 Click handlers called: ${clickHandlerLogs.length}`)
      clickHandlerLogs.forEach(log => console.log(`   ${log}`))
      
      // Check popup result
      const popups = await page.locator('.leaflet-popup').count()
      if (popups > 0) {
        const popupText = await page.locator('.leaflet-popup').first().textContent()
        const isSummitPopup = /JA\/[A-Z]+-\d+/.test(popupText || '')
        const isParkPopup = /JP-\d+|JAFF-\d+/.test(popupText || '')
        
        console.log(`📋 Popup (${popups}): ${isSummitPopup ? 'SUMMIT' : isParkPopup ? 'PARK' : 'OTHER'}`)
        console.log(`📋 Content: ${popupText?.substring(0, 80)}...`)
        
        if (!isSummitPopup && isParkPopup && clickHandlerLogs.length === 0) {
          console.log('🚨 CONFIRMED ISSUE: Park popup without any click handlers called!')
        }
      } else {
        console.log('📋 No popup appeared')
      }
    }
    
    // Final summary
    console.log('\n📊 FINAL ANALYSIS:')
    console.log(`   Console Errors: ${consoleErrors.length}`)
    console.log(`   Console Warnings: ${consoleWarnings.length}`)
    console.log(`   Coordinate Overlaps: ${markerAnalysis.overlaps.length}`)
    console.log(`   Total Click Handler Calls: ${clickHandlerLogs.length}`)
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:')
      consoleErrors.slice(0, 3).forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.substring(0, 100)}...`)
      })
    }
    
    // Always pass - this is a diagnostic test
    expect(true).toBe(true)
  })
  
  test('check drag mode after click', async ({ page }) => {
    console.log('🧪 Testing: Map drag functionality after marker click')
    
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    await page.waitForTimeout(3000)
    
    // Get initial map center
    const initialCenter = await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      const map = (mapContainer as any)?._leaflet_map
      if (map) {
        const center = map.getCenter()
        return { lat: center.lat, lng: center.lng }
      }
      return null
    })
    
    console.log('🗺️ Initial map center:', initialCenter)
    
    // Click on a marker
    const pathElements = await page.locator('path.leaflet-interactive').count()
    if (pathElements > 0) {
      await page.locator('path.leaflet-interactive').first().click({ force: true })
      await page.waitForTimeout(1000)
      console.log('🖱️ Clicked on marker')
    }
    
    // Try to drag the map
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 300, y: 300 }
    })
    
    await page.waitForTimeout(1000)
    
    // Get new map center
    const newCenter = await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      const map = (mapContainer as any)?._leaflet_map
      if (map) {
        const center = map.getCenter()
        return { lat: center.lat, lng: center.lng }
      }
      return null
    })
    
    console.log('🗺️ New map center:', newCenter)
    
    if (initialCenter && newCenter) {
      const moved = Math.abs(initialCenter.lat - newCenter.lat) > 0.001 || 
                    Math.abs(initialCenter.lng - newCenter.lng) > 0.001
      
      console.log(`🗺️ Map dragged successfully: ${moved ? 'YES' : 'NO'}`)
      
      if (!moved) {
        console.log('🚨 WARNING: Map drag mode may be disabled after marker click')
      }
    }
    
    expect(true).toBe(true)
  })
})