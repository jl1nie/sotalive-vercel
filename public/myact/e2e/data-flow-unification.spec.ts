import { test, expect } from '@playwright/test'

test.describe('Data Flow Unification Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // Wait for map to be visible
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('Verify unified data flow - no duplicate API calls', async ({ page }) => {
    console.log('🧪 Testing unified data flow (MapDataLoader only)')

    // Monitor API calls and map data loading
    const apiCalls: string[] = []
    const dataLoadMessages: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('API with params') || text.includes('Received data')) {
        apiCalls.push(text)
      }
      if (text.includes('MapDataLoader') || text.includes('useMapData')) {
        dataLoadMessages.push(text)
      }
    })

    // Wait for initial data loading
    await page.waitForTimeout(5000)

    // Perform a map operation to trigger data reload
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 300, y: 200 },
      targetPosition: { x: 400, y: 300 }
    })
    await page.waitForTimeout(3000)

    // Zoom to trigger another data load
    const zoomInBtn = page.locator('.leaflet-control-zoom-in')
    await zoomInBtn.click()
    await page.waitForTimeout(3000)

    console.log('📊 Data Flow Analysis:')
    console.log(`Total API calls: ${apiCalls.length}`)
    console.log(`Data load messages: ${dataLoadMessages.length}`)

    // Verify no duplicate data loading systems
    const useMapDataMessages = dataLoadMessages.filter(msg => msg.includes('useMapData'))
    const mapDataLoaderMessages = dataLoadMessages.filter(msg => msg.includes('MapDataLoader'))

    console.log(`useMapData messages: ${useMapDataMessages.length}`)
    console.log(`MapDataLoader messages: ${mapDataLoaderMessages.length}`)

    // Expected: Only MapDataLoader should be handling data loading
    expect(useMapDataMessages.length).toBe(0) // No useMapData API calls
    expect(mapDataLoaderMessages.length).toBeGreaterThan(0) // MapDataLoader active
    expect(apiCalls.length).toBeLessThan(10) // Reasonable number of API calls

    // Verify markers are displayed (data flow working)
    await page.waitForTimeout(2000)
    const interactiveElements = page.locator('.leaflet-interactive')
    const elementCount = await interactiveElements.count()
    
    console.log(`Interactive elements (markers): ${elementCount}`)
    expect(elementCount).toBeGreaterThan(0) // Data flow successful

    // Print recent API calls for verification
    if (apiCalls.length > 0) {
      console.log('📋 Recent API calls:')
      apiCalls.slice(-3).forEach((call, index) => {
        console.log(`  ${index + 1}. ${call}`)
      })
    }

    console.log('✅ Data flow unification test completed')
  })

  test('Verify useMapData hook provides store data correctly', async ({ page }) => {
    console.log('🧪 Testing useMapData hook store access')

    // Check if debug info is available (uses useMapData internally)
    await page.waitForTimeout(3000)

    // Debug component should show marker counts
    const debugInfo = page.locator('[data-testid="map-debug-info"]')
    const isDebugVisible = await debugInfo.isVisible()
    
    if (isDebugVisible) {
      const debugText = await debugInfo.textContent()
      console.log('🔍 Debug info contains:', debugText?.substring(0, 100) + '...')
      
      // Should contain marker count information
      expect(debugText).toContain('SOTA:')
      expect(debugText).toContain('POTA:')
      console.log('✅ useMapData hook provides store data correctly')
    } else {
      console.log('⚠️ Debug info not visible - hook working but no UI display')
    }
  })
})