import { test, expect } from '@playwright/test'

test.describe('ポップアップ表示位置テスト', () => {
  test('リロード後最初のクリック時のポップアップ位置を確認', async ({ page }) => {
    // コンソールログとエラーを監視
    const logs: string[] = []
    const errors: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      logs.push(text)
      if (text.includes('popup') || text.includes('Popup') || text.includes('position')) {
        console.log('POPUP LOG:', text)
      }
    })
    
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.error('PAGE ERROR:', error.message)
    })

    // 1. 新しいページを読み込み（リロード状態を再現）
    console.log('🔄 ページを読み込み中...')
    await page.goto('http://localhost:5173/myact/')
    
    // 2. 地図が完全に読み込まれるまで待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    console.log('✅ 地図コンテナが読み込まれました')
    
    // 3. TopoJSONデータ読み込み完了まで待機
    await page.waitForFunction(() => {
      return document.querySelectorAll('.leaflet-overlay-pane svg path').length > 0
    }, { timeout: 15000 }).catch(() => {
      console.log('⚠️ TopoJSONデータ読み込みタイムアウト')
    })
    
    // 地図の境界とビューポート情報を取得
    const mapBounds = await page.locator('.leaflet-container').boundingBox()
    const viewport = page.viewportSize()
    console.log('地図境界:', mapBounds)
    console.log('ビューポート:', viewport)
    
    // 4. 最初のクリック - TopoJSON領域
    console.log('🖱️ 最初のクリック: TopoJSON公園領域')
    const svgPaths = page.locator('.leaflet-overlay-pane svg path')
    const pathCount = await svgPaths.count()
    console.log(`発見されたSVGパス数: ${pathCount}`)
    
    if (pathCount > 0) {
      // 最初のパスの位置を取得
      const firstPath = svgPaths.first()
      const pathBounds = await firstPath.boundingBox()
      console.log('クリック対象パスの境界:', pathBounds)
      
      // パスの中央をクリック
      if (pathBounds) {
        const clickX = pathBounds.x + pathBounds.width / 2
        const clickY = pathBounds.y + pathBounds.height / 2
        console.log(`クリック座標: (${clickX}, ${clickY})`)
        
        await page.mouse.click(clickX, clickY)
        await page.waitForTimeout(1000)
        
        // ポップアップの表示確認
        const popup = page.locator('.leaflet-popup')
        const popupVisible = await popup.isVisible()
        console.log('ポップアップ表示:', popupVisible)
        
        if (popupVisible) {
          const popupBounds = await popup.boundingBox()
          console.log('ポップアップ境界:', popupBounds)
          
          // ポップアップ位置の妥当性チェック
          if (popupBounds && mapBounds) {
            const popupCenterX = popupBounds.x + popupBounds.width / 2
            const popupCenterY = popupBounds.y + popupBounds.height / 2
            
            // ポップアップが地図内に表示されているかチェック
            const isInMapArea = 
              popupBounds.x >= mapBounds.x &&
              popupBounds.y >= mapBounds.y &&
              popupBounds.x + popupBounds.width <= mapBounds.x + mapBounds.width &&
              popupBounds.y + popupBounds.height <= mapBounds.y + mapBounds.height
            
            console.log('ポップアップが地図内:', isInMapArea)
            
            // クリック位置とポップアップ位置の関係チェック
            const distanceX = Math.abs(popupCenterX - clickX)
            const distanceY = Math.abs(popupCenterY - clickY)
            console.log(`クリック位置からの距離: X=${distanceX}, Y=${distanceY}`)
            
            // ポップアップがクリック位置から極端に離れていないかチェック
            const maxReasonableDistance = 200 // ピクセル
            const isReasonableDistance = distanceX < maxReasonableDistance && distanceY < maxReasonableDistance
            console.log('妥当な距離内:', isReasonableDistance)
            
            // ポップアップ内容の確認
            const content = await popup.locator('.leaflet-popup-content').textContent()
            console.log('ポップアップ内容:', content)
            
            // アサーション
            expect(isInMapArea).toBe(true, 'ポップアップが地図外に表示されています')
            expect(isReasonableDistance).toBe(true, 'ポップアップがクリック位置から極端に離れています')
            expect(content).toMatch(/(JA-\d+|JAFF-\d+)/, 'ポップアップに適切な参照番号が含まれていません')
          }
        }
      }
    }
    
    // ポップアップを閉じる
    await page.locator('.leaflet-popup-close-button').click().catch(() => {
      console.log('ポップアップクローズボタンが見つかりません')
    })
    await page.waitForTimeout(500)
    
    // 5. 2回目のクリック - 地図領域
    console.log('🖱️ 2回目のクリック: 地図空白領域')
    if (mapBounds) {
      // 地図の中央付近をクリック（マーカーがない場所）
      const mapCenterX = mapBounds.x + mapBounds.width / 2
      const mapCenterY = mapBounds.y + mapBounds.height / 2
      console.log(`2回目クリック座標: (${mapCenterX}, ${mapCenterY})`)
      
      await page.mouse.click(mapCenterX, mapCenterY)
      await page.waitForTimeout(2000) // リバースジオコーディング待機
      
      // ポップアップの表示確認
      const popup2 = page.locator('.leaflet-popup')
      const popup2Visible = await popup2.isVisible()
      console.log('2回目ポップアップ表示:', popup2Visible)
      
      if (popup2Visible) {
        const popup2Bounds = await popup2.boundingBox()
        console.log('2回目ポップアップ境界:', popup2Bounds)
        
        // 2回目のポップアップ位置チェック
        if (popup2Bounds && mapBounds) {
          const popup2CenterX = popup2Bounds.x + popup2Bounds.width / 2
          const popup2CenterY = popup2Bounds.y + popup2Bounds.height / 2
          
          const distance2X = Math.abs(popup2CenterX - mapCenterX)
          const distance2Y = Math.abs(popup2CenterY - mapCenterY)
          console.log(`2回目クリック位置からの距離: X=${distance2X}, Y=${distance2Y}`)
          
          const isReasonableDistance2 = distance2X < 200 && distance2Y < 200
          console.log('2回目の妥当な距離内:', isReasonableDistance2)
          
          const content2 = await popup2.locator('.leaflet-popup-content').textContent()
          console.log('2回目ポップアップ内容:', content2)
          
          // 2回目のアサーション
          expect(isReasonableDistance2).toBe(true, '2回目のポップアップがクリック位置から極端に離れています')
        }
      }
    }
    
    // 6. 3回目のクリック - サミットマーカー
    console.log('🖱️ 3回目のクリック: サミットマーカー')
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`サミットマーカー数: ${summitCount}`)
    
    if (summitCount > 0) {
      const firstSummit = summitMarkers.first()
      const summitBounds = await firstSummit.boundingBox()
      
      if (summitBounds) {
        const summitX = summitBounds.x + summitBounds.width / 2
        const summitY = summitBounds.y + summitBounds.height / 2
        console.log(`サミットクリック座標: (${summitX}, ${summitY})`)
        
        await page.mouse.click(summitX, summitY)
        await page.waitForTimeout(1000)
        
        const popup3 = page.locator('.leaflet-popup')
        const popup3Visible = await popup3.isVisible()
        console.log('サミットポップアップ表示:', popup3Visible)
        
        if (popup3Visible) {
          const content3 = await popup3.locator('.leaflet-popup-content').textContent()
          console.log('サミットポップアップ内容:', content3)
          
          // サミット情報の確認
          expect(content3).toMatch(/JA\/[A-Z]+-\d+/, 'サミット参照番号が含まれていません')
        }
      }
    }
    
    // エラーが発生していないことを確認
    expect(errors).toHaveLength(0, `ページエラーが発生しました: ${errors.join(', ')}`)
    
    console.log('✅ ポップアップ位置テスト完了')
  })

  test('異なるズームレベルでのポップアップ位置確認', async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
    
    const mapBounds = await page.locator('.leaflet-container').boundingBox()
    
    // ズームレベルを変更してテスト
    const zoomLevels = [8, 12, 16]
    
    for (const zoomLevel of zoomLevels) {
      console.log(`🔍 ズームレベル ${zoomLevel} でテスト`)
      
      // ズーム変更
      await page.evaluate((zoom) => {
        const map = (window as any).mapRef?.current
        if (map) {
          map.setZoom(zoom)
        }
      }, zoomLevel)
      
      await page.waitForTimeout(1000)
      
      // 地図中央をクリック
      if (mapBounds) {
        const centerX = mapBounds.x + mapBounds.width / 2
        const centerY = mapBounds.y + mapBounds.height / 2
        
        await page.mouse.click(centerX, centerY)
        await page.waitForTimeout(2000)
        
        const popup = page.locator('.leaflet-popup')
        const popupVisible = await popup.isVisible()
        
        if (popupVisible) {
          const popupBounds = await popup.boundingBox()
          console.log(`ズーム${zoomLevel}: ポップアップ境界:`, popupBounds)
          
          // ポップアップが地図内に表示されているかチェック
          if (popupBounds && mapBounds) {
            const isInMapArea = 
              popupBounds.x >= mapBounds.x &&
              popupBounds.y >= mapBounds.y &&
              popupBounds.x + popupBounds.width <= mapBounds.x + mapBounds.width &&
              popupBounds.y + popupBounds.height <= mapBounds.y + mapBounds.height
            
            expect(isInMapArea).toBe(true, `ズーム${zoomLevel}でポップアップが地図外に表示されています`)
          }
          
          // ポップアップを閉じる
          await page.locator('.leaflet-popup-close-button').click().catch(() => {})
          await page.waitForTimeout(300)
        }
      }
    }
    
    console.log('✅ ズームレベル別ポップアップ位置テスト完了')
  })
})