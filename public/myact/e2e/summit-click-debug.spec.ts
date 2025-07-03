import { test, expect } from '@playwright/test'

test.describe('サミットマーカークリック詳細デバッグ', () => {
  test('サミットマーカークリックの詳細動作確認', async ({ page }) => {
    // コンソールログの収集
    const logs: string[] = []
    const summitLogs: string[] = []
    const popupLogs: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      logs.push(text)
      
      if (text.includes('handleSummitClick') || text.includes('Summit marker') || text.includes('summit')) {
        summitLogs.push(text)
        console.log('SUMMIT LOG:', text)
      }
      
      if (text.includes('popup') || text.includes('Popup') || text.includes('InfoPopup')) {
        popupLogs.push(text)
        console.log('POPUP LOG:', text)
      }
    })
    
    // エラー監視
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.error('PAGE ERROR:', error.message)
    })

    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // サミットマーカーの確認
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`🎯 サミットマーカー数: ${summitCount}`)
    
    if (summitCount === 0) {
      console.log('⚠️ サミットマーカーが見つかりません - SOTA設定確認')
      
      // SOTA設定を有効化
      await page.evaluate(() => {
        const store = (window as any).mapStore?.getState?.()
        if (store) {
          store.updatePreferences({ sota_ref: true })
        }
      })
      
      await page.waitForTimeout(2000)
      const summitCount2 = await summitMarkers.count()
      console.log(`SOTA有効化後のサミットマーカー数: ${summitCount2}`)
    }

    if (await summitMarkers.count() > 0) {
      // 最初のサミットマーカーの詳細情報を取得
      const firstSummit = summitMarkers.first()
      const summitBounds = await firstSummit.boundingBox()
      console.log('サミットマーカー境界:', summitBounds)
      
      // クリック前のログをクリア
      summitLogs.length = 0
      popupLogs.length = 0
      
      // サミットマーカーをクリック
      console.log('🖱️ サミットマーカーをクリック')
      await firstSummit.click({ force: true })
      
      // クリック後の待機
      await page.waitForTimeout(2000)
      
      // ログの確認
      console.log('--- サミットクリック後のログ ---')
      summitLogs.forEach(log => console.log('SUMMIT:', log))
      popupLogs.forEach(log => console.log('POPUP:', log))
      
      // ポップアップの表示確認
      const popup = page.locator('.leaflet-popup')
      const popupVisible = await popup.isVisible()
      console.log('ポップアップ表示:', popupVisible)
      
      if (popupVisible) {
        const popupContent = await popup.locator('.leaflet-popup-content').textContent()
        console.log('ポップアップ内容:')
        console.log('---')
        console.log(popupContent)
        console.log('---')
        
        // ポップアップの HTML構造確認
        const popupHTML = await popup.locator('.leaflet-popup-content').innerHTML()
        console.log('ポップアップHTML:')
        console.log(popupHTML)
        
        // サミット情報が含まれているかチェック
        const hasSummitCode = /JA\/[A-Z]+-\d+/.test(popupContent || '')
        const hasSOTAInfo = popupContent?.includes('SOTA') || popupContent?.includes('summit')
        const hasMapInfo = popupContent?.includes('Pos:') || popupContent?.includes('GL:')
        
        console.log('サミットコード含む:', hasSummitCode)
        console.log('SOTA情報含む:', hasSOTAInfo)
        console.log('地図情報含む:', hasMapInfo)
        
        // 問題の診断
        if (!hasSummitCode && hasMapInfo) {
          console.log('🚨 問題発見: サミットマーカークリック時に地図情報が表示されています')
          console.log('原因調査: handleSummitClickが呼ばれていない可能性')
          
          // handleSummitClickが呼ばれたかチェック
          const summitClickCalled = summitLogs.some(log => log.includes('handleSummitClick called'))
          console.log('handleSummitClick呼び出し確認:', summitClickCalled)
          
          if (!summitClickCalled) {
            console.log('🔍 handleSummitClickが呼ばれていません - イベントハンドリング問題')
          }
        }
      }
      
      // エラーチェック
      if (errors.length > 0) {
        console.log('🚨 発生したエラー:')
        errors.forEach(error => console.log('ERROR:', error))
      }
      
      // 地図クリックとの比較テスト
      console.log('\n🖱️ 比較: 地図空白領域をクリック')
      await page.locator('.leaflet-popup-close-button').click().catch(() => {})
      await page.waitForTimeout(500)
      
      const mapBounds = await page.locator('.leaflet-container').boundingBox()
      if (mapBounds) {
        const mapCenterX = mapBounds.x + mapBounds.width / 2
        const mapCenterY = mapBounds.y + mapBounds.height / 2
        
        await page.mouse.click(mapCenterX, mapCenterY)
        await page.waitForTimeout(2000)
        
        const popup2 = page.locator('.leaflet-popup')
        const popup2Visible = await popup2.isVisible()
        
        if (popup2Visible) {
          const mapPopupContent = await popup2.locator('.leaflet-popup-content').textContent()
          console.log('地図クリックポップアップ内容:')
          console.log(mapPopupContent)
          
          // 地図クリックの場合は地図情報が正常
          const hasMapInfo2 = mapPopupContent?.includes('Pos:') || mapPopupContent?.includes('GL:')
          console.log('地図クリック時の地図情報表示（正常）:', hasMapInfo2)
        }
      }
    }
    
    console.log('✅ サミットマーカークリックデバッグ完了')
  })

  test('サミットマーカーイベントハンドラー確認', async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // サミットマーカーのイベントハンドラーが正しく設定されているか確認
    const summitEventCheck = await page.evaluate(() => {
      const summitMarkers = document.querySelectorAll('.summit-marker')
      const results = []
      
      for (let i = 0; i < Math.min(5, summitMarkers.length); i++) {
        const marker = summitMarkers[i]
        const hasClickHandler = marker.addEventListener ? true : false
        const hasOnClick = (marker as any).onclick ? true : false
        const className = marker.className
        
        results.push({
          index: i,
          hasClickHandler,
          hasOnClick,
          className: className.toString(),
          tagName: marker.tagName
        })
      }
      
      return results
    })
    
    console.log('サミットマーカーイベントハンドラー確認:')
    summitEventCheck.forEach((result, index) => {
      console.log(`マーカー${index}:`, result)
    })
    
    // React イベントハンドラーの確認
    const reactEventCheck = await page.evaluate(() => {
      const summitMarkers = document.querySelectorAll('.summit-marker')
      const reactProps = []
      
      for (let i = 0; i < Math.min(3, summitMarkers.length); i++) {
        const marker = summitMarkers[i]
        const reactFiber = (marker as any)._reactInternalFiber || (marker as any).__reactInternalInstance
        const hasReactProps = reactFiber ? true : false
        
        reactProps.push({
          index: i,
          hasReactProps,
          fiberKeys: reactFiber ? Object.keys(reactFiber) : []
        })
      }
      
      return reactProps
    })
    
    console.log('React イベントハンドラー確認:')
    reactEventCheck.forEach((result, index) => {
      console.log(`マーカー${index} React:`, result)
    })
  })
})