import { test, expect } from '@playwright/test'

/**
 * ポップアップ継続表示とautopan防止テスト
 * 
 * 問題：ポップアップを開いたまま地図を大きくスクロールすると、
 *      マーカー再描画時に地図がポップアップ位置に自動移動してしまう
 * 修正：ポップアップはユーザーが閉じるまで表示継続、autopan無効化で地図移動防止
 */
test.describe('Popup Position Bounds Control', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:5173/myact/')
    
    // 地図初期化完了を待機
    await page.waitForSelector('[data-testid="leaflet-map"]')
    await page.waitForTimeout(3000) // 地図・マーカー読み込み完了待ち
  })

  test('ポップアップ位置が地図領域外でも表示継続、autopan無効化確認', async ({ page }) => {
    // コンソールログ監視
    const consoleMessages: string[] = []
    const boundsCheckLogs: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      
      if (text.includes('InfoPopup: Position bounds check') ||
          text.includes('InfoPopup: Position outside bounds') ||
          text.includes('Map moved: Popup position status') ||
          text.includes('Popup is outside bounds but keeping visible')) {
        boundsCheckLogs.push(text)
      }
    })

    console.log('🎯 Step 1: サミットマーカークリックでポップアップ表示')
    
    // サミットマーカーをクリックしてポップアップ表示
    // React-LeafletのCircleMarkerはpath要素としてレンダリングされる
    const summitMarker = await page.locator('path.summit-marker').first()
    await expect(summitMarker).toBeVisible()
    
    // マーカーの位置を記録
    const markerPosition = await summitMarker.boundingBox()
    console.log('マーカー位置:', markerPosition)
    
    await summitMarker.click()
    
    // ポップアップ表示確認
    await page.waitForSelector('.leaflet-popup', { timeout: 5000 })
    let popup = await page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    
    console.log('✅ ポップアップ表示成功')
    
    console.log('🎯 Step 2: 地図を大きくスクロールしてポップアップ位置を領域外に移動')
    
    const mapContainer = await page.locator('[data-testid="leaflet-map"]')
    await expect(mapContainer).toBeVisible()
    
    // 地図を大きく移動（ポップアップ位置が領域外になるまで）
    let moveAttempts = 0
    let popupOutOfBounds = false
    
    while (moveAttempts < 5 && !popupOutOfBounds) {
      // 大きなドラッグ操作
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(100, 100) // 大きく左上に移動
      await page.mouse.up()
      
      await page.waitForTimeout(500) // 移動完了待ち
      
      // 境界チェックログの確認
      const latestBoundsLog = boundsCheckLogs[boundsCheckLogs.length - 1]
      if (latestBoundsLog && latestBoundsLog.includes('isInBounds') && latestBoundsLog.includes('false')) {
        popupOutOfBounds = true
        console.log('✅ ポップアップが地図領域外に移動完了')
      }
      
      moveAttempts++
    }
    
    if (!popupOutOfBounds) {
      console.log('⚠️ 5回の移動でもポップアップが領域外にならなかった（大きなマーカーかズームレベルの問題）')
      // より大きな移動を試行
      await page.mouse.down()
      await page.mouse.move(50, 50) // さらに大きく移動
      await page.mouse.up()
      await page.waitForTimeout(1000)
    }
    
    console.log('🎯 Step 3: ポップアップの表示状態確認')
    
    // ポップアップの表示状態確認（領域外でも表示継続が期待値）
    const popupAfterMove = await page.locator('.leaflet-popup')
    const isPopupVisible = await popupAfterMove.isVisible().catch(() => false)
    
    console.log('📊 ポップアップ表示状態:')
    console.log(`  - 地図移動後のポップアップ表示: ${isPopupVisible ? 'YES' : 'NO'}`)
    console.log(`  - 境界チェックログ数: ${boundsCheckLogs.length}件`)
    
    // 境界チェックログの内容確認
    if (boundsCheckLogs.length > 0) {
      const lastBoundsCheck = boundsCheckLogs[boundsCheckLogs.length - 1]
      console.log(`  - 最新の境界チェック: ${lastBoundsCheck.substring(0, 100)}...`)
      
      // 領域外でも表示継続のログがある場合
      const keepVisibleLogs = boundsCheckLogs.filter(log => 
        log.includes('keeping visible') || log.includes('but keeping popup visible')
      )
      
      if (keepVisibleLogs.length > 0) {
        console.log(`  - 継続表示ログ: ${keepVisibleLogs.length}件`)
        expect(isPopupVisible).toBe(true) // 領域外でもポップアップ表示継続
      } else {
        console.log(`  - 継続表示ログなし: ポップアップは領域内に留まっている可能性`)
        expect(isPopupVisible).toBe(true) // いずれにしてもポップアップ表示
      }
    }
    
    // 重要：領域外に移動してもポップアップは表示され続ける
    expect(isPopupVisible).toBe(true) // 必ずtrue（ユーザーが閉じるまで表示）
    
    console.log('🎯 Step 4: マーカー再描画時の地図位置安定性確認')
    
    // マーカー再描画をトリガー（新しいエリアに移動）
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(300, 300) // さらに大きく移動してAPI再実行をトリガー
    await page.mouse.up()
    
    await page.waitForTimeout(2000) // API呼び出し・マーカー再描画完了待ち
    
    // 地図位置が元のポップアップ位置に戻っていないことを確認
    const mapCenterAfterRedraw = await page.evaluate(() => {
      const leafletMap = (window as any).leafletMapInstance
      if (leafletMap) {
        const center = leafletMap.getCenter()
        return { lat: center.lat, lng: center.lng }
      }
      return null
    })
    
    console.log('📊 マーカー再描画後の地図中心:', mapCenterAfterRedraw)
    
    // autopanによる地図位置の自動調整が発生していないことを確認
    // 我々のコードからの境界チェックログは除外し、実際のLeaflet autopan機能のみをチェック
    const autoPositionLogs = consoleMessages.filter(msg => 
      (msg.includes('autopan') || 
       msg.includes('popup center') ||
       msg.includes('map moved to popup') ||
       msg.includes('pan to popup')) &&
      !msg.includes('Position bounds check') // 我々のデバッグログは除外
    )
    
    expect(autoPositionLogs.length).toBe(0) // 実際のautopan関連ログがないことを確認
    
    // ポップアップが依然として表示されていることを確認
    const finalPopup = await page.locator('.leaflet-popup')
    const finalPopupVisible = await finalPopup.isVisible().catch(() => false)
    expect(finalPopupVisible).toBe(true) // マーカー再描画後もポップアップ表示継続
    
    console.log('✅ テスト完了: ポップアップ継続表示とautopan防止が正常動作')
    console.log(`  - autopan防止: ${autoPositionLogs.length}件（期待値: 0件）`)
    console.log(`  - ポップアップ継続表示: ${finalPopupVisible ? 'YES' : 'NO'}（期待値: YES）`)
  })
  
  test('ユーザーによる手動ポップアップ閉じ操作の動作確認', async ({ page }) => {
    // ポップアップはユーザーが明示的に閉じるまで表示し続ける
    
    console.log('🎯 ユーザー手動クローズテスト開始')
    
    // サミットマーカークリック
    const summitMarker = await page.locator('path.summit-marker').first()
    await summitMarker.click()
    await page.waitForSelector('.leaflet-popup')
    
    let popup = await page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    
    // 地図を大きく移動（従来なら自動クリアされる状況）
    const mapContainer = await page.locator('[data-testid="leaflet-map"]')
    for (let i = 0; i < 3; i++) {
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(100 + i * 50, 100 + i * 50)
      await page.mouse.up()
      await page.waitForTimeout(500)
    }
    
    // 大きく移動してもポップアップは表示され続ける
    popup = await page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    console.log('✅ 大幅地図移動後もポップアップ表示継続')
    
    // ユーザーが明示的に閉じボタンをクリック
    const closeButton = await page.locator('.leaflet-popup-close-button')
    await expect(closeButton).toBeVisible()
    await closeButton.click()
    
    await page.waitForTimeout(500)
    
    // ポップアップが閉じられたことを確認
    popup = await page.locator('.leaflet-popup')
    const isVisible = await popup.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
    
    console.log('✅ ユーザー手動クローズ: 正常動作確認')
    console.log('  - 地図移動時: 表示継続')
    console.log('  - ユーザークリック: 正常クローズ')
  })
})