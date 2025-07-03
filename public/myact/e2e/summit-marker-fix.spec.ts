import { test, expect } from '@playwright/test'

test.describe('サミットマーカークリック修正確認', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールエラーをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text())
      }
    })
    
    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('サミットマーカークリック時のparameter out of rangeエラー修正確認', async ({ page }) => {
    console.log('=== サミットマーカークリックエラー修正テスト開始 ===')

    let consoleErrors: string[] = []
    
    // コンソールエラーを収集
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
        console.log('Captured console error:', msg.text())
      }
    })

    // 1. 地図上のサミットマーカーの確認
    await page.waitForTimeout(5000) // マーカー読み込み待機
    
    const summitMarkers = page.locator('.leaflet-interactive[fill="#1b5e20"], .leaflet-interactive[fill="#558b2f"], .leaflet-interactive[fill="#9e9d24"], .leaflet-interactive[fill="#f9a825"], .leaflet-interactive[fill="#ef6c00"], .leaflet-interactive[fill="#c62828"]')
    const markerCount = await summitMarkers.count()
    console.log(`地図上のサミットマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // 2. サミットマーカーをクリック
      const firstSummit = summitMarkers.first()
      
      console.log('サミットマーカーをクリックします...')
      await firstSummit.click()
      
      // 3. クリック後の処理完了を待機
      await page.waitForTimeout(2000)
      
      // 4. ポップアップの表示確認
      const popup = page.locator('.leaflet-popup')
      const popupVisible = await popup.count() > 0
      console.log(`ポップアップ表示: ${popupVisible ? 'あり' : 'なし'}`)
      
      // 5. コンソールエラーの確認
      const parameterErrors = consoleErrors.filter(error => 
        error.includes('parameter out of range') || 
        error.includes('Invalid coordinates') ||
        error.includes('Invalid distance parameter')
      )
      
      console.log('Parameter関連エラー数:', parameterErrors.length)
      parameterErrors.forEach(error => console.log('  -', error))
      
      // 6. その他のコンソールエラー確認
      const otherErrors = consoleErrors.filter(error => 
        !error.includes('parameter out of range') && 
        !error.includes('Invalid coordinates') &&
        !error.includes('Invalid distance parameter')
      )
      
      console.log('その他のエラー数:', otherErrors.length)
      otherErrors.forEach(error => console.log('  -', error))
      
      // 7. テスト結果判定
      if (parameterErrors.length === 0) {
        console.log('✅ parameter out of rangeエラーは修正されました')
      } else {
        console.log('❌ まだparameter関連エラーが発生しています')
      }
      
      if (popupVisible) {
        console.log('✅ ポップアップが正常に表示されました')
      } else {
        console.log('⚠️ ポップアップが表示されませんでした')
      }
      
      // アサーション
      expect(parameterErrors.length).toBe(0)
      
    } else {
      console.log('⚠️ サミットマーカーが表示されていません')
    }

    console.log('=== サミットマーカークリックエラー修正テスト完了 ===')
  })

  test('無効な座標データでのエラーハンドリング確認', async ({ page }) => {
    console.log('=== 無効座標エラーハンドリングテスト開始 ===')

    // JavaScriptで故意に無効な座標でAPIを呼び出し
    const result = await page.evaluate(async () => {
      try {
        // 無効な座標でAPIを直接呼び出し
        const response = await fetch('https://sotaapp2.sotalive.net/api/v2/sota/summits/search?lat=999&lon=999&dist=200')
        return {
          status: response.status,
          ok: response.ok,
          text: await response.text()
        }
      } catch (error) {
        return {
          error: error.message
        }
      }
    })

    console.log('無効座標APIレスポンス:', result)
    
    // APIが適切にエラーを返すことを確認
    if (result.status) {
      expect(result.status).toBeGreaterThanOrEqual(400)
      console.log('✅ APIが無効な座標に対して適切なエラーを返しています')
    }

    console.log('=== 無効座標エラーハンドリングテスト完了 ===')
  })
})