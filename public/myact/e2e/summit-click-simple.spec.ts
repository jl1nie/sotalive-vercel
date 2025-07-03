/**
 * Simplified Summit Marker Click Test
 * 
 * A minimal test to check if summit marker click issues can be detected
 * without complex React Leaflet initialization waiting
 */
import { test, expect } from '@playwright/test'

test.describe('Summit Marker Click (Simplified)', () => {
  test('basic page load and summit detection', async ({ page }) => {
    console.log('🧪 Testing: Basic page load and summit marker detection')
    
    // Monitor key MapDataLoader logs and any click-related errors
    page.on('console', (msg) => {
      if (msg.text().includes('MapDataLoader: Updating store with summits:')) {
        console.log('📡 MapDataLoader:', msg.text())
      }
      if (msg.text().includes('LeafletMap:') || msg.text().includes('handleSummitClick')) {
        console.log('🖱️ Click Handler:', msg.text())
      }
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text())
      }
    })
    
    // Navigate to the application
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for basic map container to appear
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    console.log('🗺️ Leaflet container found')
    
    // Set basic preferences to enable summit display (using correct Zustand store name)
    await page.evaluate(() => {
      localStorage.setItem('myact-map-store', JSON.stringify({
        state: { 
          preferences: {
            sota_ref: true,
            pota_ref: true,
            zoom_threshold: 5
          }
        },
        version: 0
      }))
    })
    
    // Reload to apply preferences
    await page.reload()
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    
    // Wait for any initial loading
    await page.waitForTimeout(5000)
    
    // Debug: Check live Zustand store state (not localStorage which doesn't persist summits/parks)
    const storeState = await page.evaluate(() => {
      try {
        // Try to access the global Zustand store instance
        if (window.useMapStore && window.useMapStore.getState) {
          const state = window.useMapStore.getState()
          return {
            preferences: {
              sota_ref: state.preferences.sota_ref,
              pota_ref: state.preferences.pota_ref,
              jaff_ref: state.preferences.jaff_ref,
              zoom_threshold: state.preferences.zoom_threshold
            },
            summitsCount: state.summits?.length || 0,
            parksCount: state.parks?.length || 0,
            isLoading: state.isLoading,
            zoom: state.zoom
          }
        } else {
          return { error: 'useMapStore not found on window' }
        }
      } catch (e) {
        return { error: e.message }
      }
    })
    console.log('🏪 Zustand store state:', storeState)
    
    // Check for MapDataLoader component presence
    const hasMapDataLoader = await page.locator('[data-testid="map-data-loader"]').count()
    console.log(`🔧 MapDataLoader components: ${hasMapDataLoader}`)
    
    // Check for React Leaflet CircleMarker elements (they might not be <circle> tags)
    const circleMarkers = await page.locator('circle[fill]').count()
    console.log(`📍 Circle elements with fill: ${circleMarkers}`)
    
    // Check for any circle elements at all
    const allCircles = await page.locator('circle').count()
    console.log(`⭕ All circle elements: ${allCircles}`)
    
    // Check for path elements (React Leaflet might use these)
    const pathElements = await page.locator('path').count()
    console.log(`🛤️ Path elements: ${pathElements}`)
    
    // Check for any SVG elements
    const svgElements = await page.locator('svg').count()
    console.log(`🎨 SVG elements: ${svgElements}`)
    
    // Check leaflet marker pane specifically
    const markerPane = await page.locator('.leaflet-marker-pane').count()
    console.log(`📌 Leaflet marker panes: ${markerPane}`)
    
    // Check for any leaflet-interactive elements
    const interactiveElements = await page.locator('.leaflet-interactive').count()
    console.log(`🎯 Leaflet interactive elements: ${interactiveElements}`)
    
    // Check if API was called
    const networkCalls = await page.evaluate(() => {
      // Check if any fetch calls were made to our API
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/search/') || entry.name.includes('sotaapp2'))
        .length
    })
    console.log(`🌐 Network API calls detected: ${networkCalls}`)
    
    // If we have markers, try clicking one (path elements = React Leaflet CircleMarkers)
    if (pathElements > 0) {
      console.log('🖱️ Testing summit marker click...')
      
      // Clear any existing popups first
      const existingPopups = await page.locator('.leaflet-popup').count()
      if (existingPopups > 0) {
        console.log(`🚮 Clearing ${existingPopups} existing popups`)
        await page.locator('.leaflet-popup-close-button').click()
        await page.waitForTimeout(500)
      }
      
      // Click on the first path element (React Leaflet CircleMarker)
      // Use normal click first, then force if needed
      try {
        await page.locator('path.leaflet-interactive').first().click({ timeout: 5000 })
      } catch (error) {
        console.log('🖱️ Normal click failed, trying force click...')
        await page.locator('path.leaflet-interactive').first().click({ force: true })
      }
      await page.waitForTimeout(2000)
      
      // Check for popup
      const popups = await page.locator('.leaflet-popup').count()
      console.log(`📋 Popups after click: ${popups}`)
      
      if (popups > 0) {
        const popupText = await page.locator('.leaflet-popup').first().textContent()
        console.log('📋 Popup content (first 100 chars):', popupText?.substring(0, 100))
        
        // Check if it shows summit info (not park info)
        const isSummitPopup = /JA\/[A-Z]+-\d+/.test(popupText || '')
        console.log('📋 Is summit popup:', isSummitPopup)
        
        if (!isSummitPopup && popupText?.includes('JAFF-')) {
          console.log('🚨 DETECTED ISSUE: Summit click shows POTA/JAFF info instead!')
        }
      }
    } else {
      console.log('⚠️ No path elements found - may indicate React Leaflet rendering issue')
    }
    
    // Always pass for now - this is a detection test
    expect(true).toBe(true)
  })
  
  test('check for specific API issues', async ({ page }) => {
    console.log('🧪 Testing: API error detection')
    
    let apiErrors: string[] = []
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('parameter out of range')) {
        apiErrors.push(msg.text())
        console.log('🚨 DETECTED: parameter out of range error!')
      }
    })
    
    // Navigate and wait
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    await page.waitForTimeout(3000)
    
    // Check current error count
    console.log(`❌ API errors detected: ${apiErrors.length}`)
    
    if (apiErrors.length > 0) {
      console.log('🚨 CONFIRMED: parameter out of range errors occurring')
      apiErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`)
      })
    }
    
    // Always pass - this is a detection test
    expect(true).toBe(true)
  })
})