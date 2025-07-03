import { test, expect } from '@playwright/test'

test('DOM構造詳細確認', async ({ page }) => {
  console.log('アプリケーションにアクセス中...')
  await page.goto('http://localhost:5173/myact/')
  
  // ページ読み込み完了まで待機
  await page.waitForSelector('#root', { timeout: 10000 })
  console.log('React root loaded')

  // 10秒待機してアプリケーション完全読み込み
  await page.waitForTimeout(10000)
  console.log('10秒待機完了')

  // MapContainer要素の詳細確認
  console.log('\n=== MapContainer詳細確認 ===')
  const mapContainerCount = await page.locator('[data-testid="map-container"]').count()
  console.log('MapContainer count:', mapContainerCount)

  if (mapContainerCount > 0) {
    const mapContainerHTML = await page.locator('[data-testid="map-container"]').innerHTML()
    console.log('MapContainer innerHTML (first 1000 chars):')
    console.log(mapContainerHTML.slice(0, 1000))
    
    // MapContainer内の直接の子要素確認
    const directChildren = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="map-container"]')
      if (!container) return 'No container found'
      
      return Array.from(container.children).map((child, index) => ({
        index,
        tagName: child.tagName,
        className: child.className,
        id: child.id,
        hasDataTestId: child.hasAttribute('data-testid'),
        dataTestId: child.getAttribute('data-testid'),
        children: child.children.length
      }))
    })
    console.log('\nMapContainer direct children:', directChildren)
  }

  // Leaflet関連要素の詳細確認
  console.log('\n=== Leaflet関連要素確認 ===')
  const leafletContainerCount = await page.locator('.leaflet-container').count()
  console.log('leaflet-container count:', leafletContainerCount)

  const leafletMapPaneCount = await page.locator('.leaflet-map-pane').count()
  console.log('leaflet-map-pane count:', leafletMapPaneCount)

  const leafletControlsCount = await page.locator('.leaflet-control').count()
  console.log('leaflet-control count:', leafletControlsCount)

  // data-testidが設定されたleaflet関連要素の確認
  const leafletWithTestId = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="leaflet"]')
    return Array.from(elements)
      .filter(el => el.hasAttribute('data-testid'))
      .map(el => ({
        tagName: el.tagName,
        className: el.className,
        dataTestId: el.getAttribute('data-testid')
      }))
  })
  console.log('Leaflet elements with data-testid:', leafletWithTestId)

  // React-Leaflet MapContainer要素の確認（より具体的に）
  console.log('\n=== React-Leaflet MapContainer確認 ===')
  const mapContainerElement = await page.evaluate(() => {
    // Leaflet containerの親要素を確認
    const leafletContainer = document.querySelector('.leaflet-container')
    if (!leafletContainer) return 'No leaflet-container found'
    
    const parent = leafletContainer.parentElement
    if (!parent) return 'No parent found'
    
    return {
      parentTagName: parent.tagName,
      parentClassName: parent.className,
      parentDataTestId: parent.getAttribute('data-testid'),
      leafletContainer: {
        tagName: leafletContainer.tagName,
        className: leafletContainer.className,
        dataTestId: leafletContainer.getAttribute('data-testid'),
        id: leafletContainer.id
      }
    }
  })
  console.log('MapContainer structure:', mapContainerElement)

  // すべてのdata-testid属性を持つ要素の確認
  console.log('\n=== 全data-testid要素確認 ===')
  const allTestIds = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid]')
    return Array.from(elements).map(el => ({
      tagName: el.tagName,
      className: el.className,
      dataTestId: el.getAttribute('data-testid'),
      parentTagName: el.parentElement?.tagName || 'No parent'
    }))
  })
  console.log('All elements with data-testid:', allTestIds)

  // 特定のleaflet-map data-testidを直接検索
  console.log('\n=== leaflet-map data-testid直接検索 ===')
  const leafletMapTestId = await page.locator('[data-testid="leaflet-map"]').count()
  console.log('Direct [data-testid="leaflet-map"] count:', leafletMapTestId)

  // より広範囲な検索
  const allLeafletMapElements = await page.evaluate(() => {
    const byTestId = document.querySelectorAll('[data-testid*="leaflet"]')
    const byClass = document.querySelectorAll('[class*="leaflet-container"]')
    
    return {
      byTestId: Array.from(byTestId).map(el => ({
        tagName: el.tagName,
        dataTestId: el.getAttribute('data-testid'),
        className: el.className
      })),
      byClass: Array.from(byClass).map(el => ({
        tagName: el.tagName,
        dataTestId: el.getAttribute('data-testid'),
        className: el.className
      }))
    }
  })
  console.log('Leaflet elements search results:', allLeafletMapElements)

  // HTML全体のdata-testid="leaflet-map"検索
  const htmlContent = await page.content()
  const hasLeafletMapTestId = htmlContent.includes('data-testid="leaflet-map"')
  console.log('HTML contains data-testid="leaflet-map":', hasLeafletMapTestId)

  // スクリーンショット撮影
  await page.screenshot({ path: 'test-results/debug-dom-structure.png', fullPage: true })
  console.log('Screenshot saved: test-results/debug-dom-structure.png')
})