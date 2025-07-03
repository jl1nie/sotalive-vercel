import { test, expect } from '@playwright/test'

test.describe('Popup Duplicate Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for map to be ready
    await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 30000 })
    
    // Wait for initial data load
    await page.waitForTimeout(3000)
  })

  test('should not show duplicate popup logs during zoom operations', async ({ page }) => {
    console.log('🧪 Testing: Popup duplication during zoom operations')
    
    // Click on a summit marker to open popup
    const summitMarkers = page.locator('path.summit-marker')
    const markerCount = await summitMarkers.count()
    console.log(`📍 Found ${markerCount} summit markers`)
    
    if (markerCount > 0) {
      // Click on first visible summit marker
      await summitMarkers.first().click()
      console.log('🖱️ Clicked on summit marker')
      
      // Wait for popup to appear
      await page.waitForSelector('.leaflet-popup', { timeout: 5000 })
      console.log('✅ Popup appeared')
      
      // Monitor console logs during zoom operations
      const consoleLogs: string[] = []
      page.on('console', (msg) => {
        if (msg.text().includes('InfoPopup:') || msg.text().includes('Summit data:')) {
          consoleLogs.push(msg.text())
        }
      })
      
      // Perform zoom out operation (this was causing duplicate logs)
      console.log('🔍 Performing zoom out operation...')
      await page.locator('.leaflet-control-zoom-out').click()
      await page.waitForTimeout(1000)
      
      // Perform another zoom operation
      await page.locator('.leaflet-control-zoom-out').click()
      await page.waitForTimeout(1000)
      
      // Check for duplicate logs
      console.log(`📋 Collected ${consoleLogs.length} popup-related console logs:`)
      consoleLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`)
      })
      
      // Count duplicate "Summit data:" logs
      const summitDataLogs = consoleLogs.filter(log => log.includes('Summit data:'))
      console.log(`🎯 Summit data logs count: ${summitDataLogs.length}`)
      
      // Verify no excessive duplicate logs (should be 0 or minimal)
      expect(summitDataLogs.length).toBeLessThanOrEqual(2) // Allow some reasonable duplicates but not 6+
      
      // Check that popup is still visible and functional
      const popup = page.locator('.leaflet-popup')
      await expect(popup).toBeVisible()
      console.log('✅ Popup remains visible after zoom operations')
    } else {
      console.log('⚠️ No summit markers found for testing')
    }
  })

  test('should handle map data reload without excessive popup rerenders', async ({ page }) => {
    console.log('🧪 Testing: Popup stability during map data reload')
    
    // Click on a summit marker to open popup
    const summitMarkers = page.locator('path.summit-marker')
    const markerCount = await summitMarkers.count()
    
    if (markerCount > 0) {
      await summitMarkers.first().click()
      await page.waitForSelector('.leaflet-popup', { timeout: 5000 })
      
      // Monitor console logs
      const consoleLogs: string[] = []
      page.on('console', (msg) => {
        if (msg.text().includes('InfoPopup:') || 
            msg.text().includes('Summit data:') ||
            msg.text().includes('MapDataLoader:')) {
          consoleLogs.push(msg.text())
        }
      })
      
      // Trigger map data reload by panning
      console.log('🗺️ Triggering map data reload by panning...')
      const mapContainer = page.locator('.leaflet-container')
      await mapContainer.hover()
      
      // Pan the map to trigger data reload
      await page.mouse.down()
      await page.mouse.move(100, 100)
      await page.mouse.up()
      
      // Wait for data reload to complete
      await page.waitForTimeout(2000)
      
      console.log(`📋 Console logs during data reload: ${consoleLogs.length}`)
      
      // Filter out expected MapDataLoader logs
      const popupLogs = consoleLogs.filter(log => 
        log.includes('InfoPopup:') || log.includes('Summit data:')
      )
      
      console.log(`🎯 Popup-specific logs: ${popupLogs.length}`)
      popupLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`)
      })
      
      // Verify minimal popup logs during data reload
      expect(popupLogs.length).toBeLessThanOrEqual(3) // Allow minimal logs but not excessive
    }
  })
})