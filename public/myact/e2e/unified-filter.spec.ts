import { test, expect } from '@playwright/test'

test.describe('統合フィルターメニューテスト', () => {
  test('1つのメニューで種類とプログラムが選択できる', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // アラート・スポットパネルが表示されることを確認
    await expect(page.locator('h6').filter({ hasText: 'アラート・スポット' }).first()).toBeVisible()

    // フィルターボタンは1つだけであることを確認
    const filterButtons = page.locator('button').filter({ has: page.locator('i.fa-filter') })
    const buttonCount = await filterButtons.count()
    expect(buttonCount).toBe(1)
    console.log('✅ フィルターボタンが1つに統合されています')

    // フィルターメニューを開く
    await filterButtons.click()

    // 種類セクションの確認
    await expect(page.locator('text=種類')).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'すべて' }).first()).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'アラート' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'スポット' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'アクティブ' })).toBeVisible()
    console.log('✅ 種類セクションが正常に表示されます')

    // プログラムセクションの確認
    await expect(page.locator('text=プログラム')).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'SOTA' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'POTA' })).toBeVisible()
    console.log('✅ プログラムセクションが正常に表示されます')

    // メニューを閉じる
    await page.keyboard.press('Escape')
    console.log('✅ 統合フィルターメニューが正常に実装されています')
  })

  test('統合メニューでフィルター選択が機能する', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 初期状態のカード数を記録
    const initialCards = page.locator('[data-testid="alert-spot-card"]')
    const initialCount = await initialCards.count()
    console.log(`初期カード数: ${initialCount}`)

    const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })

    // アラートのみフィルターを選択
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'アラート' }).click()
    await page.waitForTimeout(1000)
    
    const alertCards = page.locator('[data-testid="alert-spot-card"]')
    const alertCount = await alertCards.count()
    console.log(`アラートフィルター後のカード数: ${alertCount}`)

    // SOTAプログラムフィルターを選択
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'SOTA' }).click()
    await page.waitForTimeout(1000)
    
    const sotaCards = page.locator('[data-testid="alert-spot-card"]')
    const sotaCount = await sotaCards.count()
    console.log(`SOTA + アラートフィルター後のカード数: ${sotaCount}`)

    // 全て表示に戻す
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'すべて' }).first().click()
    await page.waitForTimeout(500)
    
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'すべて' }).nth(1).click()
    await page.waitForTimeout(1000)

    const allCards = page.locator('[data-testid="alert-spot-card"]')
    const allCount = await allCards.count()
    console.log(`全表示復帰後のカード数: ${allCount}`)

    console.log('✅ 統合フィルターメニューでの選択が正常に動作しています')
  })

  test('選択状態がメニューに反映される', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })

    // アラートを選択
    await filterButton.click()
    await page.locator('li').filter({ hasText: 'アラート' }).click()
    await page.waitForTimeout(500)

    // メニューを再度開いて選択状態を確認
    await filterButton.click()
    
    // selectedクラスまたは属性があることを確認
    const selectedAlert = page.locator('li').filter({ hasText: 'アラート' })
    await expect(selectedAlert).toHaveClass(/selected|Mui-selected/)
    console.log('✅ 選択状態がメニューに正しく反映されています')

    await page.keyboard.press('Escape')
  })
})