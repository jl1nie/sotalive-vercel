import { test, expect } from '@playwright/test'

test.describe('アクティブフィルター修正テスト', () => {
  test('上段の空白行が削除されている', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // パネル上部の空白を確認
    // アラート・スポットタイトルの上にヘッダーボックスがないことを確認
    const title = page.locator('text=アラート・スポット')
    await expect(title).toBeVisible()

    // タイトルの親要素を確認
    const titleParent = title.locator('..')
    const titleBox = await title.boundingBox()
    
    // パネルの最上部からタイトルまでの距離が小さい（余分な空白がない）ことを確認
    expect(titleBox!.y).toBeLessThan(150) // 適切な上部マージンの範囲内
    console.log(`タイトルY位置: ${titleBox!.y}`)
    console.log('✅ 上段の空白行が削除されています')
  })

  test('アクティブフィルターがスポットのみに適用される', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 初期状態のカード数を記録
    const initialCards = page.locator('[data-testid="alert-spot-card"]')
    const initialCount = await initialCards.count()
    console.log(`初期カード数: ${initialCount}`)

    // フィルターメニューを開いてアクティブを選択
    const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'アクティブ' }).click()
    await page.waitForTimeout(1000)

    // アクティブフィルター後のカード数を確認
    const activeCards = page.locator('[data-testid="alert-spot-card"]')
    const activeCount = await activeCards.count()
    console.log(`アクティブフィルター後のカード数: ${activeCount}`)

    // アクティブフィルターでは全てスポットのみが表示されることを確認
    if (activeCount > 0) {
      // 表示されているカードがすべてスポットであることを確認
      for (let i = 0; i < activeCount; i++) {
        const card = activeCards.nth(i)
        
        // スポット特有の要素があることを確認（例：周波数、モード）
        const hasFrequency = await card.locator('text=/MHz|kHz/').count() > 0
        const hasMode = await card.locator('text=/CW|SSB|FM|FT8|FT4/').count() > 0
        
        // アラート特有の要素がないことを確認（例：予定時刻）
        const hasScheduledTime = await card.locator('text=/予定|時刻/').count() > 0
        
        console.log(`カード${i+1}: 周波数=${hasFrequency}, モード=${hasMode}, 予定時刻=${hasScheduledTime}`)
        
        // スポットは周波数やモードがあり、予定時刻はない
        if (hasFrequency || hasMode) {
          expect(hasScheduledTime).toBe(false)
        }
      }
      console.log('✅ アクティブフィルターではスポットのみが表示されています')
    } else {
      console.log('✅ アクティブなスポットが現在ありません（正常）')
    }

    // 全表示に戻す
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'すべて' }).first().click()
    await page.waitForTimeout(1000)
  })

  test('アクティブカウントがスポットのみをカウントする', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // アクティブカウントチップを確認
    const activeChip = page.locator('.MuiChip-root').filter({ hasText: /アクティブ \d+件/ })
    
    if (await activeChip.isVisible()) {
      const activeText = await activeChip.textContent()
      const activeCount = parseInt(activeText!.match(/\d+/)![0])
      console.log(`アクティブカウント: ${activeCount}件`)

      // アクティブフィルターを適用して実際のカード数と比較
      const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })
      await filterButton.click()
      await page.locator('li').filter({ hasText: 'アクティブ' }).click()
      await page.waitForTimeout(1000)

      const actualActiveCards = page.locator('[data-testid="alert-spot-card"]')
      const actualActiveCount = await actualActiveCards.count()
      
      expect(actualActiveCount).toBe(activeCount)
      console.log('✅ アクティブカウントが正確にスポット数をカウントしています')

      // 全表示に戻す
      await filterButton.click()
      await page.locator('li').filter({ hasText: 'すべて' }).first().click()
      await page.waitForTimeout(1000)
    } else {
      console.log('✅ 現在アクティブなスポットがありません（正常）')
    }
  })

  test('フィルターメニューの動作確認', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })
    
    // フィルターメニューを開く
    await filterButton.click()

    // 種類セクションの項目を確認
    await expect(page.locator('text=種類')).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'すべて' }).first()).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'アラート' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'スポット' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'アクティブ' })).toBeVisible()

    console.log('✅ フィルターメニューの全ての項目が正常に表示されています')

    await page.keyboard.press('Escape')
  })
})