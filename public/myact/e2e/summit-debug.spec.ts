import { test, expect } from '@playwright/test'

test.describe('サミットマーカークリックデバッグ', () => {
  test.beforeEach(async ({ page }) => {
    // すべてのコンソールメッセージをキャプチャ
    page.on('console', msg => {
      console.log(`[${msg.type().toUpperCase()}]`, msg.text())
    })
    
    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('サミットマーカークリック時の詳細ログ確認', async ({ page }) => {
    console.log('=== サミットマーカークリック詳細デバッグ開始 ===')

    // 5秒待機してマーカー読み込み完了
    await page.waitForTimeout(5000)
    
    // サミットマーカーを検索（色別）
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: '' // 空のテキストフィルターでCircleMarkerを対象
    })
    
    const markerCount = await summitMarkers.count()
    console.log(`サミットマーカー候補数: ${markerCount}`)

    if (markerCount > 0) {
      // 最初のマーカーをクリック
      console.log('サミットマーカーをクリックします...')
      const firstMarker = summitMarkers.first()
      
      // クリック前のポップアップ状態
      const initialPopups = await page.locator('.leaflet-popup').count()
      console.log(`クリック前のポップアップ数: ${initialPopups}`)
      
      // マーカークリック実行
      await firstMarker.click()
      
      // クリック後の処理を段階的に確認
      await page.waitForTimeout(500)
      const popup1 = await page.locator('.leaflet-popup').count()
      console.log(`クリック後0.5秒でのポップアップ数: ${popup1}`)
      
      await page.waitForTimeout(1000)
      const popup2 = await page.locator('.leaflet-popup').count()
      console.log(`クリック後1.5秒でのポップアップ数: ${popup2}`)
      
      await page.waitForTimeout(1500)
      const popup3 = await page.locator('.leaflet-popup').count()
      console.log(`クリック後3秒でのポップアップ数: ${popup3}`)
      
      // ポップアップの内容確認
      if (popup3 > 0) {
        const popupContent = await page.locator('.leaflet-popup-content').textContent()
        console.log('ポップアップ内容:', popupContent)
        
        if (popupContent?.includes('parameter out of range')) {
          console.log('❌ parameter out of rangeエラーが含まれています')
        } else {
          console.log('✅ parameter out of rangeエラーは含まれていません')
        }
      }
      
      // 複数のポップアップが表示されている場合
      if (popup3 > 1) {
        console.log('⚠️ 複数のポップアップが表示されています')
        const allPopups = page.locator('.leaflet-popup-content')
        const popupCount = await allPopups.count()
        
        for (let i = 0; i < popupCount; i++) {
          const content = await allPopups.nth(i).textContent()
          console.log(`ポップアップ ${i + 1}: ${content}`)
        }
      }
      
    } else {
      console.log('⚠️ サミットマーカーが見つかりません')
      
      // 代替検索：すべてのLeafletインタラクティブ要素
      const allInteractive = page.locator('.leaflet-interactive')
      const totalCount = await allInteractive.count()
      console.log(`全インタラクティブ要素数: ${totalCount}`)
      
      if (totalCount > 0) {
        // 最初の要素をクリックしてテスト
        await allInteractive.first().click()
        await page.waitForTimeout(2000)
        
        const resultPopups = await page.locator('.leaflet-popup').count()
        console.log(`代替クリック後のポップアップ数: ${resultPopups}`)
      }
    }

    console.log('=== サミットマーカークリック詳細デバッグ完了 ===')
  })
})