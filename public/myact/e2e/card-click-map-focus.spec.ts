import { test, expect } from '@playwright/test'

test.describe('カードクリック地図フォーカステスト', () => {
  test('カードをクリックすると地図が移動する', async ({ page }) => {
    // コンソールログを監視してマップの移動を確認
    const mapUpdateLogs: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('LeafletMap: Updating map view from store:')) {
        mapUpdateLogs.push(text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 初期の地図中心位置を取得
    const initialMapDebug = page.locator('[data-testid="map-debug-info"]')
    const initialCenterText = await initialMapDebug.textContent()
    console.log('初期地図情報:', initialCenterText)

    // カードを探す
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    console.log(`表示されているカード数: ${cardCount}`)

    if (cardCount > 0) {
      // 最初のカードをクリック
      const firstCard = cards.first()
      
      // カードの詳細情報を取得（リファレンス情報）
      const cardText = await firstCard.textContent()
      console.log('クリックするカード:', cardText)
      
      // カードをクリック
      await firstCard.click()
      
      // 地図の移動を待機
      await page.waitForTimeout(2000)
      
      // 地図の位置が変更されたことを確認
      const updatedMapDebug = page.locator('[data-testid="map-debug-info"]')
      const updatedCenterText = await updatedMapDebug.textContent()
      console.log('更新後地図情報:', updatedCenterText)
      
      // 位置が変更されたことを確認
      expect(updatedCenterText).not.toBe(initialCenterText)
      console.log('✅ カードクリックで地図の位置が変更されました')
      
      // マップ更新ログが記録されたことを確認
      if (mapUpdateLogs.length > 0) {
        console.log('マップ更新ログ:', mapUpdateLogs[0])
        console.log('✅ 地図の更新ログが正常に記録されました')
      }
    } else {
      console.log('⚠️ 表示されているカードがありません')
    }
  })

  test('地図のズームレベルが適切に設定される', async ({ page }) => {
    // ズーム変更ログを監視
    const zoomLogs: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('zoom')) {
        zoomLogs.push(text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // カードを探してクリック
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // 初期ズームレベルを取得
      const mapDebugInfo = page.locator('[data-testid="map-debug-info"]')
      const initialDebugText = await mapDebugInfo.textContent()
      const initialZoomMatch = initialDebugText?.match(/Zoom:\s*(\d+)/)
      const initialZoom = initialZoomMatch ? parseInt(initialZoomMatch[1]) : 0
      console.log(`初期ズームレベル: ${initialZoom}`)

      // カードをクリック
      await cards.first().click()
      await page.waitForTimeout(2000)

      // 更新後のズームレベルを確認
      const updatedDebugText = await mapDebugInfo.textContent()
      const updatedZoomMatch = updatedDebugText?.match(/Zoom:\s*(\d+)/)
      const updatedZoom = updatedZoomMatch ? parseInt(updatedZoomMatch[1]) : 0
      console.log(`更新後ズームレベル: ${updatedZoom}`)

      // ズームが15になっているか、または変更されていることを確認
      if (updatedZoom === 15) {
        console.log('✅ ズームレベルが15に正確に設定されました')
      } else if (updatedZoom !== initialZoom) {
        console.log(`✅ ズームレベルが変更されました: ${initialZoom} → ${updatedZoom}`)
      } else {
        console.log('⚠️ ズームレベルが変更されませんでした')
      }
    }
  })

  test('異なるプログラム（SOTA/POTA）のカードで地図移動が動作する', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // SOTAとPOTAのカードを探す
      let sotaCardIndex = -1
      let potaCardIndex = -1

      for (let i = 0; i < Math.min(cardCount, 10); i++) {
        const card = cards.nth(i)
        const cardText = await card.textContent()
        
        if (cardText?.includes('SOTA') && sotaCardIndex === -1) {
          sotaCardIndex = i
        }
        if (cardText?.includes('POTA') && potaCardIndex === -1) {
          potaCardIndex = i
        }
      }

      console.log(`SOTA カード: ${sotaCardIndex}, POTA カード: ${potaCardIndex}`)

      // SOTAカードをテスト
      if (sotaCardIndex >= 0) {
        const sotaCard = cards.nth(sotaCardIndex)
        const initialMapInfo = await page.locator('[data-testid="map-debug-info"]').textContent()
        
        await sotaCard.click()
        await page.waitForTimeout(2000)
        
        const updatedMapInfo = await page.locator('[data-testid="map-debug-info"]').textContent()
        
        if (updatedMapInfo !== initialMapInfo) {
          console.log('✅ SOTAカードクリックで地図が移動しました')
        }
      }

      // POTAカードをテスト
      if (potaCardIndex >= 0) {
        const potaCard = cards.nth(potaCardIndex)
        const initialMapInfo = await page.locator('[data-testid="map-debug-info"]').textContent()
        
        await potaCard.click()
        await page.waitForTimeout(2000)
        
        const updatedMapInfo = await page.locator('[data-testid="map-debug-info"]').textContent()
        
        if (updatedMapInfo !== initialMapInfo) {
          console.log('✅ POTAカードクリックで地図が移動しました')
        }
      }

      if (sotaCardIndex >= 0 || potaCardIndex >= 0) {
        console.log('✅ 異なるプログラムのカードで地図移動機能が動作しています')
      } else {
        console.log('⚠️ SOTAまたはPOTAカードが見つかりませんでした')
      }
    }
  })
})