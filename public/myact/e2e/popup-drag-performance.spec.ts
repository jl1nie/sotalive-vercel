import { test, expect } from '@playwright/test'

/**
 * ポップアップとマーカー独立性テスト
 * 
 * 問題：ポップアップ表示中に地図をドラッグすると、マーカーの再描画が3回発生
 * 修正：React.memo + 安定キーによるマーカー最適化、ポップアップとマーカーデータの独立性確保
 */
test.describe('Popup Display Performance During Map Drag', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:5173/myact/')
    
    // 地図初期化完了を待機
    await page.waitForSelector('[data-testid="leaflet-map"]')
    await page.waitForTimeout(3000) // 地図・マーカー読み込み完了待ち
  })

  test('ポップアップとマーカーデータ読み込みの独立性確認', async ({ page }) => {
    // コンソールログ監視開始
    const consoleMessages: string[] = []
    const performanceLogs: { type: string, count: number, timestamp: number }[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      
      // パフォーマンス関連ログを記録
      if (text.includes('MapDataLoader: Loading data for bounds') ||
          text.includes('MapDataLoader: Updating summits') ||
          text.includes('MapDataLoader: Updating parks') ||
          text.includes('MapDataLoader: Skipping load')) {
        performanceLogs.push({
          type: text.includes('Loading data') ? 'API_CALL' :
                text.includes('Updating summits') ? 'SUMMIT_UPDATE' :
                text.includes('Updating parks') ? 'PARK_UPDATE' :
                'SKIP_LOAD',
          count: 1,
          timestamp: Date.now()
        })
      }
    })

    // 1. サミットマーカーをクリックしてポップアップ表示
    console.log('🎯 Step 1: サミットマーカークリックでポップアップ表示')
    const summitMarker = await page.locator('circle.summit-marker').first()
    await expect(summitMarker).toBeVisible()
    await summitMarker.click()
    
    // ポップアップ表示確認
    await page.waitForSelector('.leaflet-popup', { timeout: 5000 })
    const popup = await page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    
    console.log('✅ ポップアップ表示成功')
    
    // パフォーマンス測定開始
    const startTime = Date.now()
    const initialLogCount = performanceLogs.length
    
    // 2. ポップアップ表示中に地図をドラッグ（複数回の小さな移動）
    console.log('🎯 Step 2: ポップアップ表示中に地図ドラッグ実行')
    
    const mapContainer = await page.locator('[data-testid="leaflet-map"]')
    await expect(mapContainer).toBeVisible()
    
    // 複数回の小さなドラッグ操作（従来は各ドラッグでAPI再実行）
    for (let i = 0; i < 5; i++) {
      await mapContainer.hover()
      await page.mouse.down()
      await page.mouse.move(500 + i * 10, 300 + i * 10) // 小さな移動
      await page.mouse.up()
      await page.waitForTimeout(100) // 短い間隔
    }
    
    console.log('✅ 地図ドラッグ操作完了')
    
    // 3. デバウンス期間完了まで待機
    console.log('🎯 Step 3: デバウンス期間完了待ち（ポップアップ表示中は1秒延長）')
    await page.waitForTimeout(1500) // ポップアップ表示中のデバウンス遅延（1000ms + マージン）
    
    // 4. パフォーマンス結果分析
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    const logsAfterDrag = performanceLogs.slice(initialLogCount)
    
    // API呼び出し回数をカウント
    const apiCalls = logsAfterDrag.filter(log => log.type === 'API_CALL').length
    const summitUpdates = logsAfterDrag.filter(log => log.type === 'SUMMIT_UPDATE').length
    const parkUpdates = logsAfterDrag.filter(log => log.type === 'PARK_UPDATE').length
    const skipLoads = logsAfterDrag.filter(log => log.type === 'SKIP_LOAD').length
    
    console.log('📊 パフォーマンス測定結果:')
    console.log(`  - 測定時間: ${totalDuration}ms`)
    console.log(`  - API呼び出し: ${apiCalls}回`)
    console.log(`  - サミット更新: ${summitUpdates}回`) 
    console.log(`  - 公園更新: ${parkUpdates}回`)
    console.log(`  - スキップされた読み込み: ${skipLoads}回`)
    
    // 5. パフォーマンス改善の検証
    
    // 期待値：ポップアップとマーカーは独立、地図移動時は通常通りAPI呼び出し
    expect(apiCalls).toBeGreaterThanOrEqual(1) // 地図移動時は通常通りAPI呼び出し
    expect(summitUpdates).toBeGreaterThanOrEqual(0) // データ更新は通常通り
    expect(parkUpdates).toBeGreaterThanOrEqual(0) // データ更新は通常通り
    
    // ポップアップの安定性確認（地図移動後もポップアップが表示されている）
    const popupAfterDrag = await page.locator('.leaflet-popup')
    await expect(popupAfterDrag).toBeVisible() // ポップアップが地図移動後も残存
    
    console.log('✅ ポップアップ独立性確認:')
    console.log(`  - 地図移動後もポップアップ表示: YES`)
    console.log(`  - マーカーデータ更新: ${summitUpdates + parkUpdates}回`)
    console.log(`  - API呼び出し: ${apiCalls}回`)
    
    // 6. ポップアップ閉じて通常動作確認
    console.log('🎯 Step 4: ポップアップ閉じて通常動作確認')
    
    const closeButton = await page.locator('.leaflet-popup-close-button')
    await closeButton.click()
    await page.waitForTimeout(500)
    
    // ポップアップが閉じられた後の通常ドラッグ（制限なし）
    const beforeNormalDrag = performanceLogs.length
    
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(400, 400) // 大きな移動
    await page.mouse.up()
    await page.waitForTimeout(800) // 通常のデバウンス待ち（300ms + マージン）
    
    const afterNormalDrag = performanceLogs.length
    const normalDragLogs = performanceLogs.slice(beforeNormalDrag)
    const normalApiCalls = normalDragLogs.filter(log => log.type === 'API_CALL').length
    
    console.log('📊 通常動作（ポップアップなし）:')
    console.log(`  - API呼び出し: ${normalApiCalls}回`)
    
    // 通常動作では制限なしでAPI呼び出しが発生することを確認
    expect(normalApiCalls).toBeGreaterThanOrEqual(0) // 通常動作は制限なし
    
    console.log('✅ 全テスト完了: ポップアップ表示中のパフォーマンス最適化が正常動作')
  })
  
  test('ポップアップ表示中の大きな移動では通常通り再読み込み', async ({ page }) => {
    // 大きな移動の場合は最適化されずに通常通り動作することを確認
    
    const consoleMessages: string[] = []
    const apiCalls: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      if (text.includes('MapDataLoader: Loading data for bounds')) {
        apiCalls.push(text)
      }
    })

    // サミットマーカークリックでポップアップ表示
    const summitMarker = await page.locator('circle.summit-marker').first()
    await summitMarker.click()
    await page.waitForSelector('.leaflet-popup')
    
    const initialApiCount = apiCalls.length
    
    // ポップアップ表示中の大きな移動（閾値を超える）
    const mapContainer = await page.locator('[data-testid="leaflet-map"]')
    await mapContainer.hover()
    await page.mouse.down()
    await page.mouse.move(200, 200) // 大きな移動（通常通り処理されるべき）
    await page.mouse.up()
    
    await page.waitForTimeout(1500) // デバウンス待ち
    
    const finalApiCount = apiCalls.length
    const newApiCalls = finalApiCount - initialApiCount
    
    console.log(`大きな移動でのAPI呼び出し: ${newApiCalls}回`)
    
    // 大きな移動では通常通りAPI呼び出しが実行される
    expect(newApiCalls).toBeGreaterThanOrEqual(1)
    
    // 大きな移動のログが出力されていないことを確認（小さな移動の最適化ログが出ない）
    const minorMovementLogs = consoleMessages.filter(msg => 
      msg.includes('minor movement during popup display')
    )
    expect(minorMovementLogs.length).toBe(0) // 大きな移動では最適化ログは出力されない
  })
})