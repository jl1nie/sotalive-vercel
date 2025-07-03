import { test, expect } from '@playwright/test'

test.describe('Debug Summit Rendering', () => {
  test('should investigate why SummitMarker components are not rendering', async ({ page }) => {
    console.log('🧪 TEST: Investigating SummitMarker rendering issue')
    
    // Navigate to the app
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for the map to load
    await page.waitForSelector('.leaflet-container', { timeout: 30000 })
    await page.waitForTimeout(5000) // Give enough time for data loading
    
    // Collect all console messages
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      
      // Log React and map related messages
      if (text.includes('LeafletMap') || 
          text.includes('MapDataLoader') || 
          text.includes('SummitMarker') ||
          text.includes('preferences') ||
          text.includes('summits')) {
        console.log('📊 CONSOLE:', text)
      }
    })
    
    // Check the application state using JavaScript evaluation
    const appState = await page.evaluate(() => {
      // Get React app state if possible
      const reactRoot = document.querySelector('#root')
      
      // Check for map elements
      const mapContainer = document.querySelector('.leaflet-container')
      const summitMarkers = document.querySelectorAll('.summit-marker')
      const topoJsonElements = document.querySelectorAll('.leaflet-interactive[fill]')
      const allInteractiveElements = document.querySelectorAll('.leaflet-interactive')
      
      // Try to access store state if available (global debugging)
      let storeState = null
      try {
        // Check if there's a global store accessor
        storeState = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || 'No React DevTools'
      } catch (e) {
        storeState = 'Error accessing store: ' + e.message
      }
      
      return {
        reactRoot: !!reactRoot,
        mapContainer: !!mapContainer,
        summitMarkerCount: summitMarkers.length,
        topoJsonElementCount: topoJsonElements.length,
        summitMarkerClasses: Array.from(summitMarkers).slice(0, 3).map(el => el.className),
        totalInteractiveElements: allInteractiveElements.length,
        storeState: typeof storeState
      }
    })
    
    console.log('📊 APP STATE ANALYSIS:')
    console.log('  React root found:', appState.reactRoot)
    console.log('  Map container found:', appState.mapContainer)
    console.log('  Summit markers (.summit-marker):', appState.summitMarkerCount)
    console.log('  TopoJSON elements ([fill]):', appState.topoJsonElementCount)
    console.log('  Total interactive elements:', appState.totalInteractiveElements)
    console.log('  Sample marker classes:', appState.summitMarkerClasses)
    console.log('  Store access type:', appState.storeState)
    
    // Check preferences and data loading
    const preferencesAndData = await page.evaluate(() => {
      // Try to find any debug information in the DOM or window
      const debugInfo = document.querySelector('[data-testid="map-debug-info"]')
      const debugText = debugInfo ? debugInfo.textContent : null
      
      // Look for any error messages
      const errorElements = document.querySelectorAll('.error, .warning, [role="alert"]')
      const errors = Array.from(errorElements).map(el => el.textContent)
      
      return {
        debugInfo: debugText,
        errors: errors,
        windowKeys: Object.keys(window).filter(key => 
          key.toLowerCase().includes('sota') || 
          key.toLowerCase().includes('map') ||
          key.toLowerCase().includes('store')
        ).slice(0, 10)
      }
    })
    
    console.log('📊 PREFERENCES AND DATA:')
    console.log('  Debug info:', preferencesAndData.debugInfo)
    console.log('  Error messages:', preferencesAndData.errors)
    console.log('  Relevant window keys:', preferencesAndData.windowKeys)
    
    // Try clicking on a marker to see what happens
    const summitMarkers = page.locator('.summit-marker')
    const markerCount = await summitMarkers.count()
    
    if (markerCount > 0) {
      console.log(`🖱️ Attempting to click on first of ${markerCount} summit markers`)
      
      // Get marker details before clicking
      const markerInfo = await summitMarkers.first().evaluate((el) => ({
        tagName: el.tagName,
        className: el.className,
        fill: el.getAttribute('fill'),
        cx: el.getAttribute('cx'),
        cy: el.getAttribute('cy'),
        r: el.getAttribute('r')
      }))
      
      console.log('📍 First marker info:', markerInfo)
      
      // Click the marker
      await summitMarkers.first().click()
      await page.waitForTimeout(2000)
      
      // Check if any popup appeared
      const popup = page.locator('.leaflet-popup')
      const hasPopup = await popup.count() > 0
      
      console.log('📝 Popup appeared after click:', hasPopup)
      
      if (hasPopup) {
        const popupContent = await popup.textContent()
        console.log('📝 Popup content:', popupContent)
      }
    } else {
      console.log('❌ No summit markers found to click')
    }
    
    // Final analysis
    console.log('🔍 FINAL ANALYSIS:')
    console.log('  Total console messages:', consoleMessages.length)
    console.log('  Messages with "SummitMarker":', consoleMessages.filter(msg => msg.includes('SummitMarker')).length)
    console.log('  Messages with "LeafletMap":', consoleMessages.filter(msg => msg.includes('LeafletMap')).length)
    console.log('  Messages with "MapDataLoader":', consoleMessages.filter(msg => msg.includes('MapDataLoader')).length)
    
    // Print first few console messages for debugging
    console.log('📊 First 5 console messages:')
    consoleMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`)
    })
    
    // The test doesn't need to assert anything - it's just for investigation
    expect(appState.reactRoot).toBe(true)
    expect(appState.mapContainer).toBe(true)
  })
})