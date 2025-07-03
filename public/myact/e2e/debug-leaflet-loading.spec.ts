import { test, expect } from '@playwright/test'

test('Leaflet地図読み込みデバッグ', async ({ page }) => {
  // コンソールログ収集
  const consoleMessages: string[] = []
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  })

  // エラー収集
  const errors: string[] = []
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`)
  })

  // ネットワークエラー収集
  page.on('requestfailed', request => {
    errors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`)
  })

  console.log('アプリケーションにアクセス中...')
  await page.goto('http://localhost:5173/myact/')
  
  // ページタイトル確認
  const title = await page.title()
  console.log('Page title:', title)
  expect(title).toBe('MyACT - SOTA & POTA Activity Logger')

  // React root要素が存在することを確認
  await page.waitForSelector('#root', { timeout: 10000 })
  console.log('React root found')

  // MapContainerの状態を段階的に確認
  console.log('MapContainer状態確認開始...')
  
  // 1. MapContainer要素の存在確認
  console.log('1. MapContainer要素確認中...')
  const mapContainerExists = await page.locator('[data-testid="map-container"]').count()
  console.log('MapContainer elements:', mapContainerExists)

  if (mapContainerExists > 0) {
    // 2. CircularProgressの表示状況確認
    console.log('2. CircularProgress状況確認中...')
    const progressExists = await page.locator('.MuiCircularProgress-root').count()
    console.log('CircularProgress elements:', progressExists)

    // 3. React.Suspenseの状態確認
    console.log('3. Suspense状態確認中...')
    // 5秒待機してSuspenseが解除されるかチェック
    await page.waitForTimeout(5000)
    
    const progressAfterWait = await page.locator('.MuiCircularProgress-root').count()
    console.log('CircularProgress after 5s wait:', progressAfterWait)

    // 4. LeafletMap要素の詳細確認
    console.log('4. LeafletMap要素詳細確認中...')
    const leafletMapTestId = await page.locator('[data-testid="leaflet-map"]').count()
    console.log('LeafletMap with data-testid:', leafletMapTestId)
    
    const leafletContainer = await page.locator('.leaflet-container').count()
    console.log('Leaflet container elements:', leafletContainer)
    
    const leafletElements = await page.locator('[class*="leaflet"]').count()
    console.log('All Leaflet-related elements:', leafletElements)

    // 5. 動的読み込み状況の確認
    console.log('5. 動的読み込み状況確認中...')
    
    // JavaScript実行でMapContainer内部状態を確認
    const clientState = await page.evaluate(() => {
      const mapContainer = document.querySelector('[data-testid="map-container"]')
      if (!mapContainer) return 'MapContainer not found'
      
      return {
        hasChildren: mapContainer.children.length,
        childrenHTML: Array.from(mapContainer.children).map(child => child.tagName),
        innerHTML: mapContainer.innerHTML.slice(0, 500) // 最初の500文字
      }
    })
    console.log('MapContainer internal state:', clientState)

    // 6. React.lazy読み込み完了を待機
    console.log('6. React.lazy読み込み完了待機中...')
    try {
      await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 15000 })
      console.log('✅ LeafletMap successfully loaded')
      
      const finalLeafletCount = await page.locator('.leaflet-container').count()
      console.log('Final Leaflet container count:', finalLeafletCount)
    } catch (error) {
      console.log('❌ LeafletMap failed to load within 15 seconds')
      console.log('Error:', error.message)
    }
  }

  // 最終状態確認
  console.log('7. 最終状態確認...')
  const finalState = await page.evaluate(() => {
    return {
      reactRoot: !!document.querySelector('#root'),
      mapContainer: !!document.querySelector('[data-testid="map-container"]'),
      leafletMap: !!document.querySelector('[data-testid="leaflet-map"]'),
      leafletContainer: !!document.querySelector('.leaflet-container'),
      progressVisible: !!document.querySelector('.MuiCircularProgress-root')
    }
  })
  console.log('Final state:', finalState)

  // コンソールメッセージとエラーの出力
  if (consoleMessages.length > 0) {
    console.log('\n=== Console Messages ===')
    consoleMessages.forEach((msg, i) => console.log(`${i + 1}. ${msg}`))
  }

  if (errors.length > 0) {
    console.log('\n=== Errors ===')
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`))
  }

  // スクリーンショット撮影
  await page.screenshot({ path: 'test-results/debug-leaflet-loading.png', fullPage: true })
  console.log('Screenshot saved: test-results/debug-leaflet-loading.png')
})