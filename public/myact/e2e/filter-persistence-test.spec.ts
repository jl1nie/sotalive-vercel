import { test, expect } from '@playwright/test'

test.describe('フィルター設定永続化テスト', () => {
  test('地域フィルターの設定が永続化される', async ({ page }) => {
    // ページに移動
    await page.goto('/myact/')

    // アラート・スポットパネルが表示されるまで待機
    await expect(page.locator('h6').filter({ hasText: 'アラート・スポット' }).first()).toBeVisible()
    await page.waitForTimeout(2000)

    // 初期状態確認：デフォルトは「日本」
    const initialRegionChip = page.locator('span.MuiChip-label').filter({ hasText: '日本' })
    await expect(initialRegionChip).toBeVisible()

    // 地域フィルターボタンをクリック
    const regionFilterButton = page.locator('[aria-label="地域フィルター"]')
    await regionFilterButton.click()

    // 「全世界」を選択
    const worldwideOption = page.locator('li').filter({ hasText: '全世界' })
    await worldwideOption.click()

    // フィルターが「全世界」に変更されたことを確認
    const worldwideChip = page.locator('span.MuiChip-label').filter({ hasText: '全世界' })
    await expect(worldwideChip).toBeVisible()

    // パネルを閉じる（アラート・スポットパネルのトグルボタン）
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    await toggleButton.click()
    await page.waitForTimeout(800)

    // パネルを再度開く
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    await expandButton.click()
    await page.waitForTimeout(2000)

    // フィルター設定が永続化されていることを確認（「全世界」のまま）
    const persistedChip = page.locator('span.MuiChip-label').filter({ hasText: '全世界' })
    await expect(persistedChip).toBeVisible()

    console.log('✅ 地域フィルター設定が正常に永続化されました')
  })

  test('パネル開閉時の地図リサイズ', async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('LeafletMap: Map size invalidated')) {
        consoleLogs.push(msg.text())
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // パネルを閉じる（アラート・スポットパネルのトグルボタン）
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    await toggleButton.click()
    await page.waitForTimeout(800)

    // パネルを再度開く
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    await expandButton.click()
    await page.waitForTimeout(800)

    // 地図リサイズのログが出力されていることを確認
    console.log('=== 地図リサイズログ ===')
    consoleLogs.forEach(log => console.log(log))

    expect(consoleLogs.length).toBeGreaterThan(0)
    console.log('✅ パネル開閉時の地図リサイズが正常に動作しています')
  })
})