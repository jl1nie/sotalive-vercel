import { test, expect } from '@playwright/test'

test.describe('Popup Rendering Conditions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    
    // Wait for map to be ready
    await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 30000 })
    
    // Wait for initial data load
    await page.waitForTimeout(3000)
  })

  test('should only show popup when appropriate conditions are met', async ({ page }) => {
    console.log('🧪 Testing: Popup rendering conditions after simplification')
    
    // Monitor popup appearances
    let popupCount = 0
    page.on('console', (msg) => {
      if (msg.text().includes('InfoPopup: Summit data:') || 
          msg.text().includes('InfoPopup: Park data:') ||
          msg.text().includes('InfoPopup rendered with')) {
        popupCount++
        console.log(`📋 Popup render event ${popupCount}: ${msg.text()}`)
      }
    })

    // Test 1: Click on empty map area (should show geocoding popup)
    console.log('🗺️ Test 1: Clicking on empty map area')
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 100, y: 100 } })
    
    // Wait for geocoding to complete
    await page.waitForTimeout(2000)
    
    // Check if popup appears with geocoding info
    const geocodingPopup = page.locator('.leaflet-popup')
    const geocodingPopupExists = await geocodingPopup.count() > 0
    console.log(`📍 Geocoding popup visible: ${geocodingPopupExists}`)
    
    if (geocodingPopupExists) {
      const popupContent = await geocodingPopup.textContent()
      const hasGeocodingInfo = popupContent?.includes('JCC') || popupContent?.includes('県') || popupContent?.includes('市')
      console.log(`🎯 Has geocoding info: ${hasGeocodingInfo}`)
      expect(hasGeocodingInfo).toBe(true)
      
      // Close popup for next test
      const closeButton = page.locator('.leaflet-popup-close-button')
      if (await closeButton.count() > 0) {
        await closeButton.click()
        await page.waitForTimeout(500)
      }
    }

    // Test 2: Click on summit marker (should show summit popup immediately)
    console.log('🏔️ Test 2: Clicking on summit marker')
    const summitMarkers = page.locator('path.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`📊 Found ${summitCount} summit markers`)
    
    if (summitCount > 0) {
      // Click on a summit marker
      await summitMarkers.first().click()
      await page.waitForTimeout(1000)
      
      // Check if summit popup appears
      const summitPopup = page.locator('.leaflet-popup')
      const summitPopupExists = await summitPopup.count() > 0
      console.log(`🏔️ Summit popup visible: ${summitPopupExists}`)
      
      if (summitPopupExists) {
        const popupContent = await summitPopup.textContent()
        const hasSummitInfo = popupContent?.includes('JA/') || popupContent?.includes('Summit')
        console.log(`🎯 Has summit info: ${hasSummitInfo}`)
        expect(hasSummitInfo).toBe(true)
        
        // Verify popup appears immediately (without waiting for geocoding)
        const hasGeocodingDelay = popupContent?.includes('Loading...') || popupContent?.includes('取得中')
        console.log(`⏱️ Has geocoding delay: ${hasGeocodingDelay}`)
        expect(hasGeocodingDelay).toBe(false)
        
        // Close popup
        const closeButton = page.locator('.leaflet-popup-close-button')
        if (await closeButton.count() > 0) {
          await closeButton.click()
          await page.waitForTimeout(500)
        }
      }
    }

    // Test 3: Verify no premature popup rendering
    console.log('⚡ Test 3: Checking for premature popup rendering')
    
    // Clear any existing popups
    await page.evaluate(() => {
      const popups = document.querySelectorAll('.leaflet-popup')
      popups.forEach(popup => popup.remove())
    })
    
    // Click on map and immediately check for popup before geocoding completes
    await mapContainer.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100) // Very short wait
    
    const immediatePopup = page.locator('.leaflet-popup')
    const immediatePopupCount = await immediatePopup.count()
    console.log(`⚡ Immediate popup count: ${immediatePopupCount}`)
    
    // Should either be 0 (waiting for geocoding) or 1 (with content)
    expect(immediatePopupCount).toBeLessThanOrEqual(1)
    
    if (immediatePopupCount === 1) {
      const popupContent = await immediatePopup.textContent()
      const isEmpty = !popupContent || popupContent.trim().length === 0
      console.log(`📝 Popup content empty: ${isEmpty}`)
      
      // If popup exists immediately, it should not be empty
      expect(isEmpty).toBe(false)
    }

    console.log(`📊 Total popup render events: ${popupCount}`)
    
    // Should not have excessive popup renders
    expect(popupCount).toBeLessThanOrEqual(5) // Allow reasonable number of renders
  })

  test('should handle geocoding delay without showing empty popups', async ({ page }) => {
    console.log('🧪 Testing: Geocoding delay handling')
    
    // Monitor for empty or loading popups
    const emptyPopupEvents: string[] = []
    page.on('console', (msg) => {
      if (msg.text().includes('InfoPopup rendered with empty content') ||
          msg.text().includes('InfoPopup: waiting for geocoding') ||
          msg.text().includes('InfoPopup: no content available')) {
        emptyPopupEvents.push(msg.text())
      }
    })

    // Click on multiple map locations quickly
    const mapContainer = page.locator('.leaflet-container')
    
    for (let i = 0; i < 3; i++) {
      console.log(`🖱️ Quick click ${i + 1}`)
      await mapContainer.click({ position: { x: 100 + i * 50, y: 100 + i * 50 } })
      await page.waitForTimeout(200) // Quick succession
    }
    
    // Wait for all geocoding to complete
    await page.waitForTimeout(3000)
    
    console.log(`📋 Empty popup events: ${emptyPopupEvents.length}`)
    emptyPopupEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event}`)
    })
    
    // Should not have excessive empty popup renders
    expect(emptyPopupEvents.length).toBeLessThanOrEqual(3) // One per click maximum
  })

  test('should maintain popup stability during zoom operations', async ({ page }) => {
    console.log('🧪 Testing: Popup stability during zoom after condition simplification')
    
    // Click on summit to open popup
    const summitMarkers = page.locator('path.summit-marker')
    const summitCount = await summitMarkers.count()
    
    if (summitCount > 0) {
      await summitMarkers.first().click()
      await page.waitForTimeout(1000)
      
      const popup = page.locator('.leaflet-popup')
      const initialPopupVisible = await popup.isVisible()
      console.log(`🏔️ Initial popup visible: ${initialPopupVisible}`)
      
      if (initialPopupVisible) {
        // Perform zoom operations
        console.log('🔍 Performing zoom operations...')
        
        for (let i = 0; i < 3; i++) {
          await page.locator('.leaflet-control-zoom-out').click()
          await page.waitForTimeout(500)
          
          // Check popup still visible
          const popupStillVisible = await popup.isVisible()
          console.log(`🔍 Popup visible after zoom ${i + 1}: ${popupStillVisible}`)
          
          if (!popupStillVisible) {
            console.log('❌ Popup disappeared during zoom operation')
            break
          }
        }
        
        // Final check
        const finalPopupVisible = await popup.isVisible()
        console.log(`🎯 Final popup visible: ${finalPopupVisible}`)
        
        // Popup should remain stable (this might fail if our simplification broke something)
        expect(finalPopupVisible).toBe(true)
      }
    }
  })
})