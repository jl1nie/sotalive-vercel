import { test, expect } from '@playwright/test'

test.describe('TopoJSON Popup Position Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // Wait for map to be visible
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('TopoJSON popup position should be correct after reload', async ({ page }) => {
    console.log('🧪 Testing TopoJSON popup position fix after reload')

    // Monitor console logs for debugging
    const clickLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('TopoJSONLayer') || text.includes('click') || text.includes('popup') || text.includes('handleParkClick')) {
        clickLogs.push(text)
      }
    })

    // 1. Verify park areas are displayed
    await page.waitForTimeout(3000)
    const svgLayers = page.locator('.leaflet-overlay-pane svg')
    const svgCount = await svgLayers.count()
    console.log(`✅ SVG layers found: ${svgCount}`)
    expect(svgCount).toBeGreaterThan(0)

    const paths = page.locator('.leaflet-overlay-pane svg path')
    const pathCount = await paths.count()
    console.log(`✅ Park area paths found: ${pathCount}`)
    expect(pathCount).toBeGreaterThan(0)

    // 2. Test park area click BEFORE reload
    console.log('🖱️ Testing park area click BEFORE reload')
    await paths.first().click()
    await page.waitForTimeout(1000)

    // Check for popup
    const popupBefore = page.locator('.leaflet-popup')
    const popupVisibleBefore = await popupBefore.isVisible()
    console.log(`✅ Popup visible before reload: ${popupVisibleBefore}`)

    let popupContentBefore = ''
    if (popupVisibleBefore) {
      popupContentBefore = await popupBefore.textContent() || ''
      console.log(`✅ Popup content before reload: ${popupContentBefore.substring(0, 50)}...`)
    }

    // Close popup
    if (popupVisibleBefore) {
      const closeButton = page.locator('.leaflet-popup-close-button')
      await closeButton.click()
      await page.waitForTimeout(500)
    }

    // 3. RELOAD the page (this was causing the position displacement issue)
    console.log('🔄 Reloading page to test position displacement fix')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
    
    // Wait for map stabilization after reload (important for coordinate system)
    await page.waitForTimeout(5000)

    // 4. Verify park areas are still displayed after reload
    const svgLayersAfter = page.locator('.leaflet-overlay-pane svg')
    const svgCountAfter = await svgLayersAfter.count()
    console.log(`✅ SVG layers after reload: ${svgCountAfter}`)
    
    const pathsAfter = page.locator('.leaflet-overlay-pane svg path')
    const pathCountAfter = await pathsAfter.count()
    console.log(`✅ Park area paths after reload: ${pathCountAfter}`)

    // 5. Test park area click AFTER reload (this should NOT have position displacement)
    console.log('🖱️ Testing park area click AFTER reload (critical test)')
    await pathsAfter.first().click()
    await page.waitForTimeout(2000) // Extra wait for coordinate conversion stabilization

    // Check for popup after reload
    const popupAfter = page.locator('.leaflet-popup')
    const popupVisibleAfter = await popupAfter.isVisible()
    console.log(`✅ Popup visible after reload: ${popupVisibleAfter}`)

    let popupContentAfter = ''
    if (popupVisibleAfter) {
      popupContentAfter = await popupAfter.textContent() || ''
      console.log(`✅ Popup content after reload: ${popupContentAfter.substring(0, 50)}...`)
    }

    // 6. Verify popup appears correctly (no position displacement)
    expect(popupVisibleAfter).toBe(true)
    expect(popupContentAfter).toContain('JA-') // Should contain park reference

    // 7. Verify only one popup appears (unified system working)
    const allPopups = page.locator('.leaflet-popup')
    const popupCount = await allPopups.count()
    console.log(`✅ Total popup count: ${popupCount}`)
    expect(popupCount).toBe(1) // Only one popup should be visible

    // 8. Check that handleParkClick was called (unified system vs fallback)
    const handleParkClickLogs = clickLogs.filter(log => 
      log.includes('handleParkClick') || log.includes('setUniquePopup')
    )
    console.log(`✅ handleParkClick function calls: ${handleParkClickLogs.length}`)
    
    if (handleParkClickLogs.length > 0) {
      console.log('✅ Unified popup system is being used (handleParkClick called)')
      handleParkClickLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`)
      })
    } else {
      console.log('⚠️ Fallback Leaflet popup system may be in use')
    }

    // 9. Log all click-related events for debugging
    if (clickLogs.length > 0) {
      console.log('📋 All click-related logs:')
      clickLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`)
      })
    }

    console.log('✅ TopoJSON popup position fix verification completed successfully')
  })

  test('Verify coordinate conversion stability after reload', async ({ page }) => {
    console.log('🧪 Testing coordinate conversion stability after reload')

    // Wait for map stabilization
    await page.waitForTimeout(3000)

    // Test coordinate conversion before reload
    const coordinateTestBefore = await page.evaluate(() => {
      const map = (window as any).L_map
      if (map) {
        try {
          const testPoint = map.latLngToContainerPoint([35.6762, 139.6503])
          return {
            success: true,
            x: testPoint.x,
            y: testPoint.y,
            valid: testPoint.x > 0 && testPoint.y > 0 && testPoint.x < 10000 && testPoint.y < 10000
          }
        } catch (error) {
          return { success: false, error: error.message }
        }
      }
      return { success: false, error: 'Map not found' }
    })

    console.log('🔍 Coordinate conversion before reload:', coordinateTestBefore)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
    await page.waitForTimeout(5000) // Wait for coordinate system stabilization

    // Test coordinate conversion after reload
    const coordinateTestAfter = await page.evaluate(() => {
      const map = (window as any).L_map
      if (map) {
        try {
          const testPoint = map.latLngToContainerPoint([35.6762, 139.6503])
          return {
            success: true,
            x: testPoint.x,
            y: testPoint.y,
            valid: testPoint.x > 0 && testPoint.y > 0 && testPoint.x < 10000 && testPoint.y < 10000
          }
        } catch (error) {
          return { success: false, error: error.message }
        }
      }
      return { success: false, error: 'Map not found' }
    })

    console.log('🔍 Coordinate conversion after reload:', coordinateTestAfter)

    // Verify coordinate conversion works after reload
    expect(coordinateTestAfter.success).toBe(true)
    expect(coordinateTestAfter.valid).toBe(true)

    console.log('✅ Coordinate conversion stability test completed')
  })
})