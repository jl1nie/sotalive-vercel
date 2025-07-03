import { test, expect } from '@playwright/test'

test('サミットマーカー表示確認', async ({ page }) => {
  console.log('アプリケーションにアクセス中...')
  await page.goto('http://localhost:5173/myact/')
  
  // 地図読み込み完了まで待機
  await page.waitForSelector('[data-testid="leaflet-map"]', { timeout: 15000 })
  console.log('Leaflet map loaded')

  // 5秒待機してマーカー描画完了
  await page.waitForTimeout(5000)
  console.log('5秒待機完了')

  // 各種マーカー要素の確認
  console.log('\n=== マーカー要素確認 ===')
  
  // SVG circle要素
  const svgCircles = await page.locator('svg circle').count()
  console.log('SVG circle elements:', svgCircles)
  
  // summit-marker クラス
  const summitMarkerClass = await page.locator('.summit-marker').count()
  console.log('.summit-marker elements:', summitMarkerClass)
  
  // CircleMarker（React-Leaflet）
  const circleMarkers = await page.locator('circle').count()
  console.log('All circle elements:', circleMarkers)
  
  // path要素（CircleMarkerはpathとしてレンダリングされることもある）
  const pathElements = await page.locator('path').count()
  console.log('Path elements:', pathElements)
  
  // leaflet-interactive クラス
  const interactiveElements = await page.locator('.leaflet-interactive').count()
  console.log('.leaflet-interactive elements:', interactiveElements)

  // 具体的なSVG構造確認
  const svgStructure = await page.evaluate(() => {
    const svgs = document.querySelectorAll('svg')
    return Array.from(svgs).map((svg, index) => ({
      index,
      children: svg.children.length,
      childTags: Array.from(svg.children).map(child => child.tagName),
      classes: Array.from(svg.children).map(child => child.className.baseVal || child.className)
    }))
  })
  console.log('SVG structure:', svgStructure)

  // React-Leaflet CircleMarker の詳細確認
  const circleDetails = await page.evaluate(() => {
    const circles = document.querySelectorAll('circle')
    return Array.from(circles).slice(0, 5).map((circle, index) => ({
      index,
      tagName: circle.tagName,
      className: circle.className.baseVal || circle.className,
      attributes: Array.from(circle.attributes).map(attr => `${attr.name}="${attr.value}"`),
      parentTagName: circle.parentElement?.tagName,
      parentClass: circle.parentElement?.className.baseVal || circle.parentElement?.className
    }))
  })
  console.log('Circle details (first 5):', circleDetails)

  // SOTA preference が有効になっているか確認
  const sotaEnabled = await page.evaluate(() => {
    // localStorage or cookies の確認
    const preferences = localStorage.getItem('preferences')
    return preferences ? JSON.parse(preferences) : null
  })
  console.log('SOTA preferences:', sotaEnabled)

  // デバッグ情報の確認
  const debugInfo = await page.locator('[data-testid="map-debug-info"]').textContent()
  console.log('Debug info snippet:', debugInfo?.slice(0, 200))

  // スクリーンショット撮影
  await page.screenshot({ path: 'test-results/debug-summit-markers.png', fullPage: true })
  console.log('Screenshot saved: test-results/debug-summit-markers.png')
})