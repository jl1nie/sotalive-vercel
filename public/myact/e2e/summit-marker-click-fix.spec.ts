import { test, expect } from '@playwright/test'

test.describe('Summit Marker Click Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for it to load
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for the map to load
    await page.waitForSelector('.leaflet-container', { timeout: 30000 })
    
    // Wait for map data to be loaded - look for specific debug logs
    let dataLoaded = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!dataLoaded && attempts < maxAttempts) {
      attempts++
      console.log(`🔍 Attempt ${attempts}: Waiting for map data...`)
      
      // Check for MapDataLoader logs in console
      const logs = await page.evaluate(() => {
        return window.console && window.console.log ? 'Console available' : 'No console'
      })
      
      await page.waitForTimeout(2000)
      
      // Check if summit markers are present (use correct selector)
      const summitMarkers = await page.locator('.summit-marker').count()
      console.log(`🔍 Found ${summitMarkers} ACTUAL summit markers on attempt ${attempts}`)
      
      if (summitMarkers > 0) {
        dataLoaded = true
        console.log('✅ Map data loaded successfully')
      }
    }
    
    if (!dataLoaded) {
      console.warn('⚠️ Map data may not have loaded properly')
    }
  })

  test('should display summit info when clicking summit marker (not POTA park info)', async ({ page }) => {
    console.log('🧪 TEST: Starting summit marker click test')
    
    // Apply test configuration using centralized system
    await page.evaluate(() => {
      if ((window as any).testConfig) {
        (window as any).testConfig.applyTestProfile('summitMarkerTest')
      }
    })
    
    // Monitor console logs for debugging
    const consoleMessages: string[] = []
    const errorMessages: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      
      // Log all important debug messages
      if (text.includes('🔴 SummitMarker')) {
        console.log('🔴 SUMMIT MARKER LOG:', text)
      }
      if (text.includes('🏔️ handleSummitClick')) {
        console.log('🏔️ SUMMIT CLICK HANDLER:', text)
      }
      if (text.includes('🏞️ handleParkClick')) {
        console.log('🏞️ PARK CLICK HANDLER:', text)
      }
      if (text.includes('🗺️ MapEvents')) {
        console.log('🗺️ MAP EVENT:', text)
      }
      if (text.includes('MapDataLoader')) {
        console.log('📊 MAP DATA LOADER:', text)
      }
      if (text.includes('🗺️ LeafletMap')) {
        console.log('🗺️ LEAFLET MAP:', text)
      }
    })
    
    page.on('pageerror', (error) => {
      errorMessages.push(error.message)
      console.error('❌ PAGE ERROR:', error.message)
    })
    
    // Find ACTUAL summit markers (with .summit-marker class)
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`📍 Found ${summitCount} ACTUAL summit markers`)
    
    // Verify we have summit markers
    expect(summitCount).toBeGreaterThan(0)
    
    // Click on the first summit marker
    console.log('🖱️ Clicking on first summit marker')
    await summitMarkers.first().click()
    
    // Wait for popup to appear
    await page.waitForTimeout(1000)
    
    // Check if popup appeared
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible({ timeout: 5000 })
    
    // Get popup content
    const popupContent = await popup.textContent()
    console.log('📝 Popup content:', popupContent)
    
    // Verify popup contains summit information (not POTA park info)
    // Summit info should NOT contain JAFF codes or park names
    if (popupContent) {
      // Check for POTA park indicators that should NOT be present
      const hasPOTAInfo = popupContent.includes('JAFF-') || 
                         popupContent.includes('公園') ||
                         popupContent.includes('県立') ||
                         popupContent.includes('国立')
      
      if (hasPOTAInfo) {
        console.error('❌ FAILURE: Summit marker click shows POTA park info:', popupContent)
        
        // Log all console messages for debugging
        console.log('🔍 Console messages during test:')
        consoleMessages.forEach((msg, i) => {
          console.log(`${i + 1}. ${msg}`)
        })
        
        // Check which handler was actually called
        const summitHandlerCalled = consoleMessages.some(msg => 
          msg.includes('🏔️ handleSummitClick called'))
        const parkHandlerCalled = consoleMessages.some(msg => 
          msg.includes('🏞️ handleParkClick called'))
        
        console.log('📊 Handler Analysis:')
        console.log(`  Summit handler called: ${summitHandlerCalled}`)
        console.log(`  Park handler called: ${parkHandlerCalled}`)
        
        expect(hasPOTAInfo).toBe(false)
      } else {
        console.log('✅ SUCCESS: Summit marker shows correct summit info')
      }
    }
    
    // Check for any JavaScript errors
    if (errorMessages.length > 0) {
      console.error('❌ JavaScript errors detected:', errorMessages)
      expect(errorMessages.length).toBe(0)
    }
    
    // Verify no "parameter out of range" errors
    const parameterErrors = consoleMessages.filter(msg => 
      msg.includes('parameter out of range') || 
      msg.includes('Parameter out of range'))
    
    if (parameterErrors.length > 0) {
      console.error('❌ Parameter out of range errors found:', parameterErrors)
      expect(parameterErrors.length).toBe(0)
    }
    
    console.log('🎉 Summit marker click test completed successfully')
  })

  test('should verify summit marker click event handlers are called correctly', async ({ page }) => {
    console.log('🧪 TEST: Verifying summit marker event handlers')
    
    // Track specific handler calls
    let summitHandlerCalls = 0
    let parkHandlerCalls = 0
    
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('🔴 SummitMarker.handleClick CALLED')) {
        summitHandlerCalls++
        console.log('🔴 Summit marker handler called:', summitHandlerCalls)
      }
      if (text.includes('🏔️ handleSummitClick called')) {
        console.log('🏔️ Summit click handler executed')
      }
      if (text.includes('🏞️ handleParkClick called')) {
        parkHandlerCalls++
        console.log('🏞️ Park click handler called:', parkHandlerCalls)
      }
    })
    
    // Find and click summit marker
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`📍 Found ${summitCount} ACTUAL summit markers`)
    
    if (summitCount > 0) {
      await summitMarkers.first().click()
      await page.waitForTimeout(2000)
      
      // Verify correct handler was called
      console.log('📊 Final handler call counts:')
      console.log(`  Summit handler calls: ${summitHandlerCalls}`)
      console.log(`  Park handler calls: ${parkHandlerCalls}`)
      
      // We expect summit handler to be called, but not park handler
      expect(summitHandlerCalls).toBeGreaterThan(0)
      expect(parkHandlerCalls).toBe(0)
    }
  })

  test('should verify map click vs marker click separation', async ({ page }) => {
    console.log('🧪 TEST: Verifying map click vs marker click separation')
    
    let mapClickCount = 0
    let markerClickCount = 0
    
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('🗺️ MapEvents: Processing as map click')) {
        mapClickCount++
      }
      if (text.includes('🔴 SummitMarker.handleClick CALLED')) {
        markerClickCount++
      }
    })
    
    // Test 1: Click on empty area (should trigger map click)
    console.log('🖱️ Clicking on empty map area')
    await page.locator('.leaflet-container').click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(1000)
    
    // Test 2: Click on summit marker (should trigger marker click)
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    
    if (summitCount > 0) {
      console.log('🖱️ Clicking on summit marker')
      await summitMarkers.first().click()
      await page.waitForTimeout(1000)
    }
    
    console.log('📊 Click separation results:')
    console.log(`  Map clicks: ${mapClickCount}`)
    console.log(`  Marker clicks: ${markerClickCount}`)
    
    // Verify proper separation
    expect(mapClickCount).toBeGreaterThan(0)
    expect(markerClickCount).toBeGreaterThan(0)
  })
})