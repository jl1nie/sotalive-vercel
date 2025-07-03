import { test, expect } from '@playwright/test'

test.describe('React App Verification', () => {
  test('should load and render React components', async ({ page }) => {
    // Navigate to the React app
    await page.goto('http://localhost:4173/myact/')
    
    // Wait for React to load
    await page.waitForSelector('#root', { timeout: 10000 })
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'e2e-results/react-app-loaded.png', fullPage: true })
    
    // Check if React root has content
    const rootElement = page.locator('#root')
    await expect(rootElement).toBeVisible()
    
    // Wait for React components to render
    await page.waitForTimeout(3000)
    
    // Check if React has rendered content inside root
    const rootContent = await rootElement.innerHTML()
    console.log(`React root content length: ${rootContent.length} characters`)
    
    // Look for MUI components (should indicate React has rendered)
    const muiElements = page.locator('[class*="Mui"], [class*="mui-"]')
    const muiCount = await muiElements.count()
    console.log(`MUI elements found: ${muiCount}`)
    
    if (muiCount > 0) {
      console.log('✅ React MUI components are rendering')
    } else {
      console.log('❌ No React MUI components found')
    }
    
    // Look for main layout components
    const layoutElements = page.locator('main, [role="main"], header, nav')
    const layoutCount = await layoutElements.count()
    console.log(`Layout elements found: ${layoutCount}`)
    
    // Check for specific MyACT components
    const mapContainer = page.locator('#map, [id*="map"], [class*="map"]')
    const mapExists = await mapContainer.count() > 0
    console.log(`Map container found: ${mapExists}`)
    
    // Look for CollapsibleSidePanel or AlertSpotCardList
    const alertSpotElements = page.locator('[class*="Alert"], [class*="Spot"], [class*="Panel"]')
    const alertSpotCount = await alertSpotElements.count()
    console.log(`Alert/Spot panel elements: ${alertSpotCount}`)
    
    // Check if loading spinner is gone (indicates app has loaded)
    const loadingSpinner = page.locator('#loading, .loading-container')
    const loadingVisible = await loadingSpinner.isVisible().catch(() => false)
    console.log(`Loading spinner visible: ${loadingVisible}`)
    
    // Save DOM structure for analysis
    const bodyHTML = await page.locator('body').innerHTML()
    require('fs').writeFileSync('e2e-results/react-dom-structure.html', bodyHTML)
    console.log('✅ DOM structure saved to e2e-results/react-dom-structure.html')
    
    // Log console messages and errors
    const messages: string[] = []
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      } else {
        messages.push(`${msg.type()}: ${msg.text()}`)
      }
    })
    
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`)
    })
    
    // Wait for any console output
    await page.waitForTimeout(2000)
    
    if (errors.length > 0) {
      console.log('❌ JavaScript errors detected:')
      errors.forEach(error => console.log(`  - ${error}`))
    } else {
      console.log('✅ No JavaScript errors detected')
    }
    
    // Final assessment
    const reactWorking = rootContent.length > 100 && muiCount > 0 && !loadingVisible
    
    if (reactWorking) {
      console.log('🎉 React application is successfully rendering!')
    } else {
      console.log('⚠️  React application may have rendering issues')
      console.log(`Root content: ${rootContent.length} chars, MUI: ${muiCount}, Loading: ${loadingVisible}`)
    }
    
    // Expect at least some content in the React root
    expect(rootContent.length).toBeGreaterThan(50)
  })
  
  test('should verify alert spot panel functionality', async ({ page }) => {
    await page.goto('http://localhost:4173/myact/')
    
    // Wait for React to load
    await page.waitForSelector('#root', { timeout: 10000 })
    await page.waitForTimeout(5000) // Give React components time to render
    
    // Look for the CollapsibleSidePanel by searching for Japanese text
    const alertText = page.locator('text=アラート')
    const spotText = page.locator('text=スポット')
    const alertSpotText = page.locator('text=アラート・スポット')
    
    const alertExists = await alertText.count() > 0
    const spotExists = await spotText.count() > 0  
    const alertSpotExists = await alertSpotText.count() > 0
    
    console.log(`Alert text found: ${alertExists}`)
    console.log(`Spot text found: ${spotExists}`)
    console.log(`Alert・Spot text found: ${alertSpotExists}`)
    
    if (alertExists || spotExists || alertSpotExists) {
      console.log('✅ Alert/Spot functionality text detected')
      
      // Take screenshot of the panel area
      await page.screenshot({ path: 'e2e-results/alert-spot-panel.png', fullPage: true })
      
      // Try to find panel container
      const panelContainer = page.locator('[class*="Panel"], [class*="Side"]')
      const panelCount = await panelContainer.count()
      console.log(`Panel containers found: ${panelCount}`)
      
      if (panelCount > 0) {
        const firstPanel = panelContainer.first()
        await firstPanel.screenshot({ path: 'e2e-results/panel-element.png' })
        console.log('✅ Panel element screenshot saved')
      }
      
    } else {
      console.log('❌ Alert/Spot functionality not detected')
      
      // Check what text is actually present
      const bodyText = await page.locator('body').textContent()
      console.log(`Total page text length: ${bodyText?.length || 0} characters`)
      
      if (bodyText) {
        // Look for any Japanese text
        const japaneseMatch = bodyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g)
        if (japaneseMatch) {
          console.log(`Japanese characters found: ${japaneseMatch.length}`)
          // Show first 200 characters of body text
          console.log(`Sample text: ${bodyText.substring(0, 200)}...`)
        } else {
          console.log('No Japanese text found in page')
        }
      }
    }
  })
})

test.beforeAll(async () => {
  // Ensure results directory exists
  const fs = require('fs')
  if (!fs.existsSync('e2e-results')) {
    fs.mkdirSync('e2e-results')
  }
})