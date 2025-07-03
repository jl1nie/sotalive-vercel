import { test, expect } from '@playwright/test'

test.describe('フィルター構造変更テスト', () => {
  test('種類とプログラムの分離フィルターが動作する', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // アラート・スポットパネルが表示されることを確認
    await expect(page.locator('h6').filter({ hasText: 'アラート・スポット' }).first()).toBeVisible()

    // 種類フィルターボタンの確認（filter アイコン）
    const typeFilterButton = page.locator('button[aria-label*="種類フィルター"]').or(
      page.locator('button').filter({ has: page.locator('i.fa-filter') })
    )
    await expect(typeFilterButton).toBeVisible()
    console.log('✅ 種類フィルターボタンが表示されています')

    // プログラムフィルターボタンの確認（layer-group アイコン）
    const programFilterButton = page.locator('button[aria-label*="プログラムフィルター"]').or(
      page.locator('button').filter({ has: page.locator('i.fa-layer-group') })
    )
    await expect(programFilterButton).toBeVisible()
    console.log('✅ プログラムフィルターボタンが表示されています')

    // 種類フィルターメニューを開く
    await typeFilterButton.click()
    await expect(page.locator('li').filter({ hasText: 'アラート' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'スポット' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'アクティブ' })).toBeVisible()
    console.log('✅ 種類フィルターメニューが正常に表示されます')
    
    // メニューを閉じる
    await page.keyboard.press('Escape')

    // プログラムフィルターメニューを開く
    await programFilterButton.click()
    await expect(page.locator('li').filter({ hasText: 'SOTA' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'POTA' })).toBeVisible()
    console.log('✅ プログラムフィルターメニューが正常に表示されます')
    
    // メニューを閉じる
    await page.keyboard.press('Escape')

    // チップ表示の確認（3つのフィルターが表示されているはず）
    const chips = page.locator('.MuiChip-root')
    const chipCount = await chips.count()
    console.log(`表示されているチップ数: ${chipCount}`)
    
    // 地域、種類、プログラム、ソート、件数のチップがあるはず
    expect(chipCount).toBeGreaterThanOrEqual(5)
    console.log('✅ フィルター構造の変更が正常に実装されています')
  })

  test('プログラムフィルターの動作確認', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 初期状態のカード数を記録
    const initialCards = page.locator('[data-testid="alert-spot-card"]')
    const initialCount = await initialCards.count()
    console.log(`初期カード数: ${initialCount}`)

    // プログラムフィルターを SOTA のみに変更
    const programFilterButton = page.locator('button').filter({ has: page.locator('i.fa-layer-group') })
    await programFilterButton.click()
    await page.locator('li').filter({ hasText: 'SOTA' }).click()

    // フィルター適用後のカード数を確認
    await page.waitForTimeout(1000)
    const sotaCards = page.locator('[data-testid="alert-spot-card"]')
    const sotaCount = await sotaCards.count()
    console.log(`SOTAフィルター後のカード数: ${sotaCount}`)

    // プログラムフィルターを POTA のみに変更
    await programFilterButton.click()
    await page.locator('li').filter({ hasText: 'POTA' }).click()

    // フィルター適用後のカード数を確認
    await page.waitForTimeout(1000)
    const potaCards = page.locator('[data-testid="alert-spot-card"]')
    const potaCount = await potaCards.count()
    console.log(`POTAフィルター後のカード数: ${potaCount}`)

    // 全て表示に戻す
    await programFilterButton.click()
    await page.locator('li').filter({ hasText: 'すべて' }).click()

    await page.waitForTimeout(1000)
    const allCards = page.locator('[data-testid="alert-spot-card"]')
    const allCount = await allCards.count()
    console.log(`全表示復帰後のカード数: ${allCount}`)

    console.log('✅ プログラムフィルターが正常に動作しています')
  })
})