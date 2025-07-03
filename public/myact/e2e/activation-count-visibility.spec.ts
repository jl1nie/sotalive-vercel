import { test, expect } from '@playwright/test'

test.describe('Activation Count Visibility Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for it to load
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for the map to load
    await page.waitForSelector('.leaflet-container', { timeout: 30000 })
    
    // Wait for map data to be loaded
    let dataLoaded = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!dataLoaded && attempts < maxAttempts) {
      attempts++
      console.log(`🔍 Attempt ${attempts}: Waiting for map data...`)
      
      await page.waitForTimeout(2000)
      
      // Check if summit markers are present
      const summitMarkers = await page.locator('.summit-marker').count()
      console.log(`🔍 Found ${summitMarkers} summit markers on attempt ${attempts}`)
      
      if (summitMarkers > 0) {
        dataLoaded = true
        console.log('✅ Map data loaded successfully')
      }
    }
    
    if (!dataLoaded) {
      console.warn('⚠️ Map data may not have loaded properly')
    }
  })

  test('should display activation count tooltips on summit markers when zoomed in', async ({ page }) => {
    console.log('🧪 TEST: Checking activation count tooltip visibility')
    
    // Zoom in to level where tooltips should appear (> 11)
    console.log('🔍 Zooming in to trigger activation count display...')
    
    // Get current zoom level
    const currentZoom = await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      if (mapContainer && (window as any).mapInstance) {
        return (window as any).mapInstance.getZoom()
      }
      return null
    })
    
    console.log(`📊 Current zoom level: ${currentZoom}`)
    
    // Zoom in multiple times to reach level 12+ (tooltips show at zoom > 11)
    for (let i = 0; i < 5; i++) {
      await page.locator('.leaflet-control-zoom-in').click()
      await page.waitForTimeout(500)
    }
    
    // Check zoom level after zooming
    const newZoom = await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      if (mapContainer && (window as any).mapInstance) {
        return (window as any).mapInstance.getZoom()
      }
      return null
    })
    
    console.log(`📊 New zoom level: ${newZoom}`)
    
    // Wait for tooltips to appear
    await page.waitForTimeout(1000)
    
    // Check for tooltip elements
    const tooltips = await page.locator('.leaflet-tooltip').count()
    console.log(`📍 Found ${tooltips} tooltip elements`)
    
    // Check for specific tooltip class
    const myTooltips = await page.locator('.my-tooltip-label').count()
    console.log(`📍 Found ${myTooltips} activation count tooltips`)
    
    // Verify that tooltips are visible
    if (myTooltips > 0) {
      console.log('✅ SUCCESS: Activation count tooltips are visible!')
      
      // Get content of first tooltip
      const firstTooltipContent = await page.locator('.my-tooltip-label').first().textContent()
      console.log(`📝 First tooltip content: "${firstTooltipContent}"`)
      
      // Verify content is numeric (activation count)
      const isNumeric = /^\d+$/.test(firstTooltipContent || '')
      expect(isNumeric).toBe(true)
      console.log(`📊 Tooltip content is numeric: ${isNumeric}`)
      
    } else {
      console.log('❌ No activation count tooltips found')
      
      // Debug: Check what tooltip-related elements exist
      const allTooltipClasses = await page.evaluate(() => {
        const tooltips = Array.from(document.querySelectorAll('[class*="tooltip"]'))
        return tooltips.map(el => el.className)
      })
      console.log('🔍 Debug: All tooltip-related classes:', allTooltipClasses)
      
      // Debug: Check if summit markers exist
      const summitMarkers = await page.locator('.summit-marker').count()
      console.log(`🔍 Debug: Summit markers count: ${summitMarkers}`)
    }
    
    // Verify that at least some tooltips are visible at high zoom
    expect(myTooltips).toBeGreaterThan(0)
  })

  test('should hide activation count tooltips when zoomed out', async ({ page }) => {
    console.log('🧪 TEST: Checking activation count tooltips are hidden at low zoom')
    
    // Start at low zoom level (should be default)
    const initialZoom = await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      if (mapContainer && (window as any).mapInstance) {
        return (window as any).mapInstance.getZoom()
      }
      return null
    })
    
    console.log(`📊 Initial zoom level: ${initialZoom}`)
    
    // Make sure we're at low zoom (< 11)
    for (let i = 0; i < 3; i++) {
      await page.locator('.leaflet-control-zoom-out').click()
      await page.waitForTimeout(300)
    }
    
    await page.waitForTimeout(1000)
    
    // Check that no activation count tooltips are visible
    const tooltips = await page.locator('.my-tooltip-label').count()
    console.log(`📍 Found ${tooltips} activation count tooltips at low zoom`)
    
    expect(tooltips).toBe(0)
    console.log('✅ SUCCESS: No activation count tooltips at low zoom level')
  })
})