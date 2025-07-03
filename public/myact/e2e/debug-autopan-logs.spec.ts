import { test, expect } from '@playwright/test'

test('autopanログ詳細確認', async ({ page }) => {
  console.log('アプリケーションにアクセス中...')
  await page.goto('http://localhost:5173/myact/')
  
  // 地図初期化完了を待機
  await page.waitForSelector('[data-testid="leaflet-map"]')
  await page.waitForTimeout(3000)

  // autopan関連ログ監視
  const autopanLogs: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('autopan') || 
        text.includes('popup center') ||
        text.includes('map moved to popup') ||
        text.includes('pan to popup') ||
        text.includes('Position bounds check') ||
        text.includes('keepInView') ||
        text.includes('autoPan')) {
      autopanLogs.push(text)
    }
  })

  console.log('🎯 サミットマーカークリックでポップアップ表示')
  
  const summitMarker = await page.locator('path.summit-marker').first()
  await expect(summitMarker).toBeVisible()
  
  await summitMarker.click()
  await page.waitForSelector('.leaflet-popup', { timeout: 5000 })
  console.log('✅ ポップアップ表示成功')

  console.log('🎯 地図を大きく移動')
  const mapContainer = await page.locator('[data-testid="leaflet-map"]')
  
  // より大きな移動距離でテスト
  for (let i = 0; i < 5; i++) {
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(200 + i * 100, 200 + i * 100)
    await page.mouse.up()
    await page.waitForTimeout(1000)
    console.log(`地図移動 ${i + 1}/5 完了`)
  }

  console.log('🎯 autopan関連ログ出力:')
  autopanLogs.forEach((log, index) => {
    console.log(`${index + 1}. ${log}`)
  })

  // ポップアップの autoPan設定確認
  const popupSettings = await page.evaluate(() => {
    const popup = document.querySelector('.leaflet-popup')
    if (!popup) return 'No popup found'
    
    // Leafletポップアップオブジェクトの設定確認
    const leafletPopup = (popup as any)._leaflet_id ? 
      Object.values((window as any).L._layers || {}).find((layer: any) => 
        layer instanceof (window as any).L.Popup && layer.getElement() === popup
      ) : null
    
    return leafletPopup ? {
      options: leafletPopup.options,
      autoPan: leafletPopup.options?.autoPan,
      keepInView: leafletPopup.options?.keepInView
    } : 'Popup layer not found'
  })
  console.log('🎯 ポップアップ設定:', popupSettings)

  // スクリーンショット撮影
  await page.screenshot({ path: 'test-results/debug-autopan-logs.png', fullPage: true })
  console.log('Screenshot saved: test-results/debug-autopan-logs.png')
})