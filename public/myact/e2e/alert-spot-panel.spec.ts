import { test, expect } from '@playwright/test'

test.describe('Alert Spot Panel Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/myact/')
    
    // Wait for initial load
    await page.waitForLoadState('networkidle')
  })

  test('should display the main layout elements', async ({ page }) => {
    // Take a screenshot of the full page
    await page.screenshot({ path: 'e2e-results/full-page.png', fullPage: true })
    
    // Check if navbar exists
    const navbar = page.locator('nav, [role="navigation"], header')
    await expect(navbar.first()).toBeVisible({ timeout: 10000 })
    
    // Check for main container
    const mainContainer = page.locator('main, [role="main"], .MuiBox-root')
    await expect(mainContainer.first()).toBeVisible()
    
    console.log('✅ Basic layout elements found')
  })

  test('should display the debug styled side panel', async ({ page }) => {
    // Look for the debug red border we added
    const redBorderPanel = page.locator('[style*="border: 2px solid red"], [style*="border:2px solid red"]')
    
    if (await redBorderPanel.count() > 0) {
      await expect(redBorderPanel.first()).toBeVisible()
      console.log('✅ Red border debug panel found')
      
      // Take screenshot of the panel area
      await redBorderPanel.first().screenshot({ path: 'e2e-results/red-border-panel.png' })
    } else {
      console.log('❌ Red border debug panel NOT found')
      
      // Let's check what's actually on the page
      const allElements = await page.locator('*').all()
      console.log(`Total elements on page: ${allElements.length}`)
      
      // Look for any CollapsibleSidePanel or AlertSpotCardList elements
      const panelElements = page.locator('*[class*="Panel"], *[class*="Alert"], *[class*="Spot"]')
      const panelCount = await panelElements.count()
      console.log(`Panel-related elements found: ${panelCount}`)
      
      if (panelCount > 0) {
        for (let i = 0; i < Math.min(panelCount, 3); i++) {
          const element = panelElements.nth(i)
          const className = await element.getAttribute('class')
          console.log(`Panel element ${i}: ${className}`)
        }
      }
    }
  })

  test('should display the debug styled alert spot content', async ({ page }) => {
    // Look for the debug yellow background we added
    const yellowBgElement = page.locator('[style*="background-color: yellow"], [style*="backgroundColor: yellow"]')
    
    if (await yellowBgElement.count() > 0) {
      await expect(yellowBgElement.first()).toBeVisible()
      console.log('✅ Yellow background debug element found')
      
      // Take screenshot of the content area
      await yellowBgElement.first().screenshot({ path: 'e2e-results/yellow-bg-content.png' })
    } else {
      console.log('❌ Yellow background debug element NOT found')
    }
  })

  test('should check for JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    // Wait a bit for any errors to occur
    await page.waitForTimeout(3000)
    
    if (errors.length > 0) {
      console.log('❌ JavaScript errors found:')
      errors.forEach(error => console.log(`  - ${error}`))
    } else {
      console.log('✅ No JavaScript errors detected')
    }
    
    // Screenshot the console for manual review
    await page.screenshot({ path: 'e2e-results/page-with-console.png' })
  })

  test('should inspect DOM structure', async ({ page }) => {
    // Get the page HTML structure
    const bodyHTML = await page.locator('body').innerHTML()
    
    // Check for React root
    const reactRoot = page.locator('#root')
    const hasReactRoot = await reactRoot.count() > 0
    console.log(`React root element found: ${hasReactRoot}`)
    
    if (hasReactRoot) {
      const rootHTML = await reactRoot.innerHTML()
      console.log(`React root content length: ${rootHTML.length} characters`)
      
      // Look for specific component indicators
      const hasMUIComponents = rootHTML.includes('MuiBox-root') || rootHTML.includes('mui-')
      const hasAlertSpotText = rootHTML.includes('アラート') || rootHTML.includes('スポット')
      const hasCollapsiblePanel = rootHTML.includes('CollapsibleSidePanel') || rootHTML.includes('Collapsible')
      
      console.log(`MUI components detected: ${hasMUIComponents}`)
      console.log(`Alert/Spot text detected: ${hasAlertSpotText}`)
      console.log(`Collapsible panel detected: ${hasCollapsiblePanel}`)
      
      // Save DOM structure for inspection
      await page.locator('body').innerHTML().then(html => {
        require('fs').writeFileSync('e2e-results/dom-structure.html', html)
        console.log('✅ DOM structure saved to e2e-results/dom-structure.html')
      })
    }
  })

  test('should verify network requests', async ({ page }) => {
    const requests: string[] = []
    
    // Listen for network requests
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`)
    })
    
    // Wait for network activity
    await page.waitForTimeout(5000)
    
    console.log('Network requests made:')
    requests.forEach(req => console.log(`  - ${req}`))
    
    // Check for API requests
    const apiRequests = requests.filter(req => req.includes('sotaapp2.sotalive.net'))
    console.log(`SOTA API requests: ${apiRequests.length}`)
    
    if (apiRequests.length > 0) {
      console.log('✅ API requests detected')
      apiRequests.forEach(req => console.log(`  - ${req}`))
    } else {
      console.log('❌ No SOTA API requests detected')
    }
  })
})

test.afterAll(async () => {
  // Create results directory if it doesn't exist
  const fs = require('fs')
  if (!fs.existsSync('e2e-results')) {
    fs.mkdirSync('e2e-results')
  }
})