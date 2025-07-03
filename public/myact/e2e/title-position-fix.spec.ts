import { test, expect } from '@playwright/test'

test.describe('タイトル位置修正テスト', () => {
  test('タイトルがフィルターボタンの左側に正しく配置される', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // アラート・スポットタイトルを探す
    const title = page.locator('text=アラート・スポット')
    await expect(title).toBeVisible()
    
    // フィルターボタンを探す
    const filterButton = page.locator('button').filter({ has: page.locator('i.fa-filter') })
    await expect(filterButton).toBeVisible()

    // タイトルとフィルターボタンの位置関係を確認
    const titleBox = await title.boundingBox()
    const filterBox = await filterButton.boundingBox()
    
    expect(titleBox).not.toBeNull()
    expect(filterBox).not.toBeNull()
    
    // タイトルがフィルターボタンの左側にあることを確認
    expect(titleBox!.x).toBeLessThan(filterBox!.x)
    console.log(`タイトル位置: x=${titleBox!.x}, フィルターボタン位置: x=${filterBox!.x}`)
    console.log('✅ タイトルがフィルターボタンの左側に正しく配置されています')

    // 同じ行にあることを確認（Y座標が近い）
    const yDifference = Math.abs(titleBox!.y - filterBox!.y)
    expect(yDifference).toBeLessThan(10) // 10px以内の差なら同じ行とみなす
    console.log('✅ タイトルとボタンが同じ行に配置されています')
  })

  test('タイトルのフォントサイズが適切に小さく設定されている', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const title = page.locator('text=アラート・スポット')
    await expect(title).toBeVisible()

    // フォントサイズとスタイルを確認
    const titleStyles = await title.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        variant: el.closest('[class*="MuiTypography"]')?.className || 'unknown'
      }
    })
    
    console.log('タイトルスタイル:', titleStyles)
    
    // subtitle1サイズ（通常16px前後）であることを確認
    const fontSize = parseFloat(titleStyles.fontSize)
    expect(fontSize).toBeGreaterThan(14) // 14px以上
    expect(fontSize).toBeLessThan(20)    // 20px未満
    expect(titleStyles.fontWeight).toBe('600') // fontWeight: 600
    
    console.log('✅ タイトルのフォントサイズが適切に小さく設定されています')
  })

  test('レイアウトが正しく配置されている', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // タイトルとボタン群が同じコンテナ内にあることを確認
    const titleContainer = page.locator('text=アラート・スポット').locator('..')
    const buttonContainer = page.locator('button').filter({ has: page.locator('i.fa-filter') }).locator('..')
    
    // 共通の親要素があることを確認
    const sharedParent = page.locator('div').filter({
      has: page.locator('text=アラート・スポット')
    }).filter({
      has: page.locator('button').filter({ has: page.locator('i.fa-filter') })
    })
    
    await expect(sharedParent).toBeVisible()
    console.log('✅ タイトルとボタンが適切なレイアウトコンテナ内に配置されています')

    // チップエリアが下の行にあることを確認
    const titleBox = await page.locator('text=アラート・スポット').boundingBox()
    const chipArea = page.locator('.MuiChip-root').first()
    
    if (await chipArea.isVisible()) {
      const chipBox = await chipArea.boundingBox()
      expect(chipBox!.y).toBeGreaterThan(titleBox!.y + 20) // チップがタイトルより下にある
      console.log('✅ チップエリアが正しく下の行に配置されています')
    }
  })

  test('パネルタイトルが重複していない', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 「アラート・スポット」テキストの数を確認
    const titleElements = page.locator('text=アラート・スポット')
    const titleCount = await titleElements.count()
    
    expect(titleCount).toBe(1)
    console.log(`「アラート・スポット」タイトルの数: ${titleCount}`)
    console.log('✅ タイトルが重複していません')

    // 表示されているタイトルが正しい位置にあることを確認
    const visibleTitle = titleElements.first()
    await expect(visibleTitle).toBeVisible()
    
    // 親要素が適切なスタイルを持っていることを確認
    const parentStyles = await visibleTitle.locator('..').evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        display: styles.display,
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems
      }
    })
    
    expect(parentStyles.display).toBe('flex')
    expect(parentStyles.justifyContent).toBe('space-between')
    console.log('✅ レイアウトスタイルが正しく設定されています')
  })
})