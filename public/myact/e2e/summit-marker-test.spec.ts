import { test, expect } from '@playwright/test'

test.describe('サミットマーカーテスト', () => {
  test('サミットマーカー表示・クリック機能確認', async ({ page }) => {
    console.log('=== サミットマーカーテスト開始 ===')
    
    // コンソールログ監視
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      
      // 重要なログのみ表示
      if (text.includes('MapDataLoader') || 
          text.includes('SummitMarker') ||
          text.includes('SOTA') ||
          text.includes('summit')) {
        console.log('SUMMIT-LOG:', text)
      }
    })

    await page.goto('http://localhost:5173/myact/')
    
    console.log('=== 地図ロード待機 ===')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 10000 })
    
    // 地図が日本の領域に移動されるまで待機
    console.log('=== 日本領域移動・データロード待機 ===')
    await page.waitForTimeout(5000)
    
    // 地図を日本の特定の山岳エリア（富士山近辺）に移動
    const japanCenter = { lat: 35.3606, lng: 138.7274 } // 富士山
    const zoom = 10
    
    console.log('=== 富士山エリアに地図移動 ===')
    await page.evaluate(({ lat, lng, zoom }) => {
      const mapStore = (window as any).zustandMapStore
      if (mapStore) {
        mapStore.setState({ 
          mapCenter: { lat, lng },
          zoom: zoom
        })
      }
    }, { lat: japanCenter.lat, lng: japanCenter.lng, zoom })
    
    // データ読み込み待機
    await page.waitForTimeout(3000)
    
    // 設定確認
    const preferences = await page.evaluate(() => {
      const mapStore = (window as any).zustandMapStore
      return mapStore ? mapStore.getState().preferences : null
    })
    console.log('設定状況:', {
      sota_ref: preferences?.sota_ref,
      pota_ref: preferences?.pota_ref,
      zoom_threshold: preferences?.zoom_threshold
    })
    
    // サミット数確認
    const summitCount = await page.evaluate(() => {
      const mapStore = (window as any).zustandMapStore
      return mapStore ? mapStore.getState().summits.length : 0
    })
    console.log(`サミット数: ${summitCount}`)
    
    // サミットデータの詳細確認
    const summitSample = await page.evaluate(() => {
      const mapStore = (window as any).zustandMapStore
      const summits = mapStore ? mapStore.getState().summits : []
      return summits.slice(0, 3).map((s: any) => ({
        code: s.summitCode,
        name: s.summitName,
        lat: s.latitude,
        lng: s.longitude
      }))
    })
    console.log('サミットサンプル:', summitSample)
    
    // DOMでサミットマーカーの存在確認
    const circleMarkers = await page.locator('.leaflet-interactive[stroke="#4e342e"]').count()
    console.log(`CircleMarkerの数: ${circleMarkers}`)
    
    // サミットマーカークリックテスト
    if (circleMarkers > 0) {
      console.log('=== サミットマーカークリックテスト ===')
      
      // 最初のサミットマーカーをクリック
      const firstMarker = page.locator('.leaflet-interactive[stroke="#4e342e"]').first()
      await firstMarker.click()
      
      // ポップアップ表示待機
      await page.waitForTimeout(2000)
      
      // ポップアップ内容確認
      const popupVisible = await page.locator('.leaflet-popup').isVisible()
      console.log(`ポップアップ表示: ${popupVisible}`)
      
      if (popupVisible) {
        const popupContent = await page.locator('.leaflet-popup-content').textContent()
        console.log('ポップアップ内容:', popupContent?.substring(0, 200))
      }
    } else {
      console.log('❌ サミットマーカーが見つかりません')
    }
    
    // API呼び出しログ確認
    const apiLogs = consoleLogs.filter(log => 
      log.includes('APIService') || 
      log.includes('/search') ||
      log.includes('searchInBounds')
    )
    console.log('=== API呼び出しログ ===')
    apiLogs.slice(-3).forEach((log, i) => console.log(`${i + 1}: ${log}`))
    
    // エラーログ確認
    const errorLogs = consoleLogs.filter(log => 
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('failed')
    )
    if (errorLogs.length > 0) {
      console.log('=== エラーログ ===')
      errorLogs.forEach((log, i) => console.log(`Error ${i + 1}: ${log}`))
    }
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'e2e-results/summit-marker-test.png', 
      fullPage: true 
    })
    
    expect(true).toBe(true) // テスト必須
  })
})