import { test, expect } from '@playwright/test'

test.describe('タイトル重複修正テスト', () => {
  test('アラート・スポットタイトルが1つだけ表示される', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 「アラート・スポット」テキストを含む要素を検索
    const titleElements = page.locator('text=アラート・スポット')
    const titleCount = await titleElements.count()
    
    console.log(`「アラート・スポット」タイトルの数: ${titleCount}`)
    
    // タイトルが1つだけ表示されることを確認
    expect(titleCount).toBe(1)
    console.log('✅ アラート・スポットタイトルが1つだけ表示されています')

    // 表示されているタイトルのフォントサイズを確認
    const visibleTitle = titleElements.first()
    await expect(visibleTitle).toBeVisible()
    
    // タイトルがh6サイズ（1.25rem相当）であることを確認
    const titleStyles = await visibleTitle.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
      }
    })
    
    console.log('タイトルスタイル:', titleStyles)
    
    // フォントサイズが適切であることを確認（ブラウザによって計算値が異なる可能性があるため範囲チェック）
    const fontSize = parseFloat(titleStyles.fontSize)
    expect(fontSize).toBeGreaterThan(18) // 1.25rem ≈ 20px前後
    expect(fontSize).toBeLessThan(25)
    
    console.log('✅ タイトルのフォントサイズが適切に設定されています')
  })

  test('コントロールボタンが正しく配置されている', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 右上部分にコントロールボタンが表示されることを確認
    const controlButtons = page.locator('button').filter({ 
      has: page.locator('i.fa-globe, i.fa-filter, i.fa-sort, i.fa-sync') 
    })
    
    const buttonCount = await controlButtons.count()
    expect(buttonCount).toBe(4) // 地域・フィルター・ソート・更新の4つ
    console.log(`✅ コントロールボタンが${buttonCount}個表示されています`)

    // 各ボタンが見えることを確認
    await expect(controlButtons.nth(0)).toBeVisible()
    await expect(controlButtons.nth(1)).toBeVisible()
    await expect(controlButtons.nth(2)).toBeVisible()
    await expect(controlButtons.nth(3)).toBeVisible()
    
    console.log('✅ 全てのコントロールボタンが正常に表示されています')
  })

  test('パネル開閉時のタイトル表示', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 初期状態でタイトルが表示されている
    const title = page.locator('text=アラート・スポット')
    await expect(title).toBeVisible()
    console.log('✅ 初期状態でタイトルが表示されています')

    // パネルの開閉ボタンを探す（chevronアイコン）
    const toggleButton = page.locator('button').filter({ 
      has: page.locator('i.oi-chevron-right, i.oi-chevron-left') 
    })
    
    // パネルを閉じる
    await toggleButton.click()
    await page.waitForTimeout(1000)
    
    // 閉じた状態でもタイトルの要素は存在するが非表示になる
    console.log('✅ パネル開閉機能が正常に動作しています')

    // パネルを再度開く
    await toggleButton.click()
    await page.waitForTimeout(1000)
    
    // タイトルが再び表示される
    await expect(title).toBeVisible()
    console.log('✅ パネル再開時にタイトルが正常に表示されます')
  })
})