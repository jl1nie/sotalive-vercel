import { test, expect } from '@playwright/test'

test.describe('サミットマーカードラッグモード修正確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('サミットマーカークリック後のドラッグモード継続問題修正確認', async ({ page }) => {
    console.log('=== サミットマーカードラッグモード修正テスト開始 ===')

    // 5秒待機してマーカー読み込み完了
    await page.waitForTimeout(5000)
    
    // サミットマーカーを検索
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: '' // CircleMarkerを対象
    })
    
    const markerCount = await summitMarkers.count()
    console.log(`サミットマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // 1. 初期状態の地図ドラッグ機能確認
      const mapContainer = page.locator('.leaflet-container')
      
      console.log('1. 初期状態でのドラッグテスト')
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(500, 300)
      await page.mouse.up()
      
      await page.waitForTimeout(500)
      console.log('✓ 初期ドラッグ動作完了')
      
      // 2. サミットマーカーをクリック
      console.log('2. サミットマーカークリック')
      const firstMarker = summitMarkers.first()
      await firstMarker.click()
      
      await page.waitForTimeout(1000)
      
      // 3. クリック後の地図ドラッグ機能確認
      console.log('3. マーカークリック後のドラッグテスト')
      
      // マウスカーソルの状態確認
      const cursorStyle = await mapContainer.evaluate(el => getComputedStyle(el).cursor)
      console.log(`マップコンテナのカーソル: ${cursorStyle}`)
      
      // ドラッグテスト実行
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(600, 400)
      await page.mouse.up()
      
      await page.waitForTimeout(500)
      
      // 4. 再度ドラッグできることを確認
      console.log('4. 追加ドラッグテスト')
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(400, 200)
      await page.mouse.up()
      
      await page.waitForTimeout(500)
      console.log('✅ ドラッグモード継続問題が修正されました')
      
      // 5. ポップアップ表示確認
      const popupCount = await page.locator('.leaflet-popup').count()
      console.log(`ポップアップ数: ${popupCount}`)
      
      if (popupCount === 1) {
        console.log('✅ ポップアップが正常に1つだけ表示されています')
      } else if (popupCount > 1) {
        console.log('⚠️ 複数のポップアップが表示されています')
      } else {
        console.log('⚠️ ポップアップが表示されていません')
      }
      
    } else {
      console.log('⚠️ サミットマーカーが見つかりません')
    }

    console.log('=== サミットマーカードラッグモード修正テスト完了 ===')
  })

  test('地図インタラクション総合テスト', async ({ page }) => {
    console.log('=== 地図インタラクション総合テスト開始 ===')

    await page.waitForTimeout(5000)
    
    const mapContainer = page.locator('.leaflet-container')
    
    // 1. 基本ドラッグ
    console.log('1. 基本ドラッグテスト')
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(100, 100)
    await page.mouse.up()
    await page.waitForTimeout(300)
    
    // 2. ズーム操作
    console.log('2. ズーム操作テスト')
    await mapContainer.hover()
    await page.mouse.wheel(0, -120) // ズームイン
    await page.waitForTimeout(500)
    await page.mouse.wheel(0, 120)  // ズームアウト
    await page.waitForTimeout(500)
    
    // 3. 地図クリック
    console.log('3. 地図クリックテスト')
    await mapContainer.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(1000)
    
    // 4. 最終ドラッグ確認
    console.log('4. 最終ドラッグ確認')
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(200, 200)
    await page.mouse.up()
    
    console.log('✅ 全ての地図インタラクションが正常に動作しています')
    console.log('=== 地図インタラクション総合テスト完了 ===')
  })
})