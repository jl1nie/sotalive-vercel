import { test, expect } from '@playwright/test'

test.describe('リロード後初回クリック位置修正テスト', () => {
  test('修正後のリロード初回クリック位置を確認', async ({ page }) => {
    console.log('🔧 修正実装後のポップアップ位置テスト開始')
    
    // 詳細なログ監視
    const initLogs: string[] = []
    const clickLogs: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('Map fully initialized') || text.includes('Map initialization')) {
        initLogs.push(text)
        console.log('INIT LOG:', text)
      }
      if (text.includes('click') || text.includes('popup') || text.includes('coordinate conversion')) {
        clickLogs.push(text)
        console.log('CLICK LOG:', text)
      }
    })
    
    // 新しいページ読み込み（リロード状態の再現）
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // 地図コンテナの確認
    const mapBounds = await page.locator('.leaflet-container').boundingBox()
    console.log('地図コンテナ境界:', mapBounds)
    
    // 初期化ログの確認まで待機（最大3秒）
    let initializationCompleted = false
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100)
      const hasInitLog = initLogs.some(log => log.includes('Map fully initialized'))
      if (hasInitLog) {
        initializationCompleted = true
        console.log('✅ 地図初期化完了を確認')
        break
      }
    }
    
    if (!initializationCompleted) {
      console.log('⚠️ 地図初期化完了ログが見つかりませんが、テストを継続')
    }
    
    // 初期化状態の確認（強制初期化後の5秒タイムアウト期待）
    await page.waitForTimeout(500)
    
    // 複数のクリックテストを実行
    const clickTests = [
      { name: '即座クリック', delay: 0, description: 'リロード直後の即座クリック' },
      { name: '1秒後クリック', delay: 1000, description: '1秒待機後のクリック' },
      { name: '2秒後クリック', delay: 2000, description: '2秒待機後のクリック' }
    ]
    
    const results = []
    
    for (const clickTest of clickTests) {
      console.log(`\n🖱️ ${clickTest.description}テスト`)
      
      // 指定時間待機
      if (clickTest.delay > 0) {
        await page.waitForTimeout(clickTest.delay)
      }
      
      // クリック実行
      if (mapBounds) {
        const clickX = mapBounds.x + mapBounds.width / 2 + (Math.random() - 0.5) * 100
        const clickY = mapBounds.y + mapBounds.height / 2 + (Math.random() - 0.5) * 100
        
        // 前のポップアップを閉じる
        await page.locator('.leaflet-popup-close-button').click().catch(() => {})
        await page.waitForTimeout(200)
        
        // クリックログをクリア
        clickLogs.length = 0
        
        console.log(`クリック座標: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`)
        await page.mouse.click(clickX, clickY)
        
        // ポップアップ表示待機
        await page.waitForTimeout(2500) // リバースジオコーディング + 安全対策時間
        
        // ポップアップ位置の確認
        const popup = page.locator('.leaflet-popup')
        const popupVisible = await popup.isVisible()
        
        if (popupVisible) {
          const popupBounds = await popup.boundingBox()
          if (popupBounds) {
            const popupCenterX = popupBounds.x + popupBounds.width / 2
            const popupCenterY = popupBounds.y + popupBounds.height / 2
            
            const distanceX = Math.abs(popupCenterX - clickX)
            const distanceY = Math.abs(popupCenterY - clickY)
            const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
            
            const result = {
              test: clickTest.name,
              clickPos: { x: clickX, y: clickY },
              popupPos: { x: popupCenterX, y: popupCenterY },
              distance: { x: distanceX, y: distanceY, total: totalDistance },
              withinNormalRange: totalDistance < 150, // 150px以内は正常とする
              initCompleted: initializationCompleted,
              safetyMeasuresUsed: clickLogs.some(log => log.includes('safety measures'))
            }
            
            results.push(result)
            
            console.log(`📊 ${clickTest.name}結果:`)
            console.log(`  距離: ΔX=${distanceX.toFixed(1)}, ΔY=${distanceY.toFixed(1)}, 総距離=${totalDistance.toFixed(1)}px`)
            console.log(`  正常範囲内: ${result.withinNormalRange ? '✅' : '❌'}`)
            console.log(`  安全対策使用: ${result.safetyMeasuresUsed ? '✅' : '❌'}`)
            
            // クリック時のログを確認
            const relevantLogs = clickLogs.filter(log => 
              log.includes('Map initialization status') || 
              log.includes('safety measures') ||
              log.includes('coordinate conversion')
            )
            console.log(`  関連ログ: ${relevantLogs.length}件`)
            relevantLogs.forEach(log => console.log(`    ${log}`))
          }
        } else {
          console.log(`❌ ${clickTest.name}: ポップアップが表示されませんでした`)
          results.push({
            test: clickTest.name,
            error: 'Popup not visible',
            withinNormalRange: false
          })
        }
      }
    }
    
    // 結果の総合評価
    console.log('\n📋 総合結果:')
    const successfulTests = results.filter(r => r.withinNormalRange).length
    const totalTests = results.length
    console.log(`成功率: ${successfulTests}/${totalTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`)
    
    // 初回クリック（即座クリック）の特別評価
    const immediateClickResult = results.find(r => r.test === '即座クリック')
    if (immediateClickResult) {
      console.log('\n🎯 初回クリック評価:')
      console.log(`位置精度: ${immediateClickResult.withinNormalRange ? '✅ 正常' : '❌ 異常'}`)
      console.log(`安全対策: ${immediateClickResult.safetyMeasuresUsed ? '✅ 実行済み' : '❌ 未実行'}`)
      
      if (immediateClickResult.withinNormalRange) {
        console.log('🎉 リロード後初回クリック位置問題が解決されました！')
      } else {
        console.log('⚠️ リロード後初回クリック位置問題が継続しています')
      }
    }
    
    // 地図初期化ログの確認
    console.log('\n📊 地図初期化ログ:')
    initLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`)
    })
    
    // テストアサーション
    expect(successfulTests).toBeGreaterThanOrEqual(2) // 3回中2回以上成功
    if (immediateClickResult) {
      expect(immediateClickResult.withinNormalRange).toBe(true) // 初回クリックが正常範囲内
    }
    
    console.log('✅ リロード後初回クリック位置修正テスト完了')
  })

  test('地図初期化安全対策の動作確認', async ({ page }) => {
    console.log('🛡️ 地図初期化安全対策の動作確認テスト')
    
    const safetyLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('safety measures') || text.includes('coordinate conversion') || text.includes('invalidateSize')) {
        safetyLogs.push(text)
        console.log('SAFETY LOG:', text)
      }
    })
    
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // 地図が完全に読み込まれる前に意図的に早めのクリック
    await page.waitForTimeout(500) // 短い待機時間
    
    const mapBounds = await page.locator('.leaflet-container').boundingBox()
    if (mapBounds) {
      const centerX = mapBounds.x + mapBounds.width / 2
      const centerY = mapBounds.y + mapBounds.height / 2
      
      console.log('🚀 早期クリック実行')
      await page.mouse.click(centerX, centerY)
      
      // 安全対策の実行を確認
      await page.waitForTimeout(1000)
      
      const safetyMeasuresActivated = safetyLogs.some(log => log.includes('applying safety measures'))
      const coordinateTest = safetyLogs.some(log => log.includes('coordinate conversion test'))
      const invalidateSizeUsed = safetyLogs.some(log => log.includes('invalidateSize'))
      
      console.log('安全対策アクティベート:', safetyMeasuresActivated ? '✅' : '❌')
      console.log('座標変換テスト実行:', coordinateTest ? '✅' : '❌')
      console.log('地図サイズ再計算実行:', invalidateSizeUsed ? '✅' : '❌')
      
      if (safetyMeasuresActivated) {
        console.log('🛡️ 安全対策が正常に動作しています')
      } else {
        console.log('⚠️ 安全対策が実行されていません（地図が既に初期化済みの可能性）')
      }
      
      // ポップアップが最終的に表示されることを確認
      const popup = page.locator('.leaflet-popup')
      await expect(popup).toBeVisible({ timeout: 3000 })
      
      console.log('✅ 安全対策後にポップアップが正常表示されました')
    }
    
    console.log('✅ 地図初期化安全対策テスト完了')
  })
})