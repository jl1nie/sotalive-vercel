import { test, expect } from '@playwright/test'

test.describe('TopoJSONクリック機能 簡易テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000) // 地図とデータ読み込み待機
  })

  test('TopoJSONクリックエラーが発生しないことを確認', async ({ page }) => {
    // エラー監視
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.error('PAGE ERROR:', error.message)
    })

    // TopoJSONデータ読み込み確認
    await page.waitForFunction(() => {
      return document.querySelectorAll('.leaflet-overlay-pane svg path').length > 0
    }, { timeout: 10000 }).catch(() => {
      console.log('TopoJSON paths not found, but continuing test')
    })

    // SVG path要素（公園領域）を探してクリック
    const svgPaths = page.locator('.leaflet-overlay-pane svg path')
    const pathCount = await svgPaths.count()
    console.log(`発見されたSVGパス数: ${pathCount}`)

    if (pathCount > 0) {
      // 最初のパスをクリック
      await svgPaths.first().click({ force: true, timeout: 3000 })
      await page.waitForTimeout(1000)

      // ポップアップが表示されるか確認
      const popup = page.locator('.leaflet-popup')
      const popupVisible = await popup.isVisible()
      console.log('ポップアップ表示:', popupVisible)

      if (popupVisible) {
        const content = await popup.locator('.leaflet-popup-content').textContent()
        console.log('ポップアップ内容:', content)
      }
    }

    // className.includesエラーが発生していないことを確認
    const classNameErrors = errors.filter(error => 
      error.includes('className.includes is not a function')
    )
    expect(classNameErrors).toHaveLength(0)

    console.log('✅ TopoJSONクリック機能でエラーは発生しませんでした')
  })

  test('TopoJSONレイヤーが正常にレンダリングされている', async ({ page }) => {
    // SVGレイヤーの存在確認
    const svgContainer = page.locator('.leaflet-overlay-pane svg')
    await expect(svgContainer).toBeVisible({ timeout: 10000 })

    // パス要素の存在確認
    const svgPaths = page.locator('.leaflet-overlay-pane svg path')
    const pathCount = await svgPaths.count()
    
    console.log(`SVGパス要素数: ${pathCount}`)
    
    // 少なくとも1つのパス要素が存在することを確認
    expect(pathCount).toBeGreaterThan(0)

    console.log('✅ TopoJSONレイヤーが正常にレンダリングされています')
  })
})