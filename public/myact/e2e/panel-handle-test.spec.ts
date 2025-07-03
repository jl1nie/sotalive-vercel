import { test, expect } from '@playwright/test'

test.describe('パネル引き手機能テスト', () => {
  test('パネル引き手の表示と開閉動作を検証', async ({ page }) => {
    // ページに移動
    await page.goto('/myact/')

    // 地図とUIが表示されるまで待機
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 10000 })
    
    // 右サイドパネルが表示されるまで待機
    await expect(page.locator('text=アラート・スポット')).toBeVisible()

    // パネルが表示されている状態で左側の引き手を確認
    const leftHandle = page.locator('[data-testid="panel-left-handle"]').first()
    
    // 引き手が表示されていることを確認（CSSで位置調整されているため、少し待機）
    await page.waitForTimeout(1000)
    
    // 引き手の基本プロパティをチェック
    const handleElement = page.locator('i[class*="fa-chevron-right"]').first()
    await expect(handleElement).toBeVisible({ timeout: 5000 })

    // パネルが現在表示されていることを確認
    const panel = page.locator('[data-testid="alert-spot-card-list"]')
    await expect(panel).toBeVisible()

    // 引き手をクリックしてパネルを閉じる
    const handleBox = page.locator('div').filter({
      has: page.locator('i[class*="fa-chevron-right"]')
    }).first()
    
    await handleBox.click()
    
    // パネルが閉じるまで待機
    await page.waitForTimeout(1000)
    
    // パネルが非表示になったことを確認
    await expect(panel).not.toBeVisible()

    // 閉じた状態での引き手（再表示用）を確認
    const reopenHandle = page.locator('i[class*="fa-chevron-left"]').first()
    await expect(reopenHandle).toBeVisible({ timeout: 5000 })

    // 再表示用引き手をクリックしてパネルを開く
    const reopenHandleBox = page.locator('div').filter({
      has: page.locator('i[class*="fa-chevron-left"]')
    }).first()
    
    await reopenHandleBox.click()
    
    // パネルが再表示されるまで待機
    await page.waitForTimeout(1000)
    
    // パネルが再表示されたことを確認
    await expect(panel).toBeVisible()
    await expect(page.locator('text=アラート・スポット')).toBeVisible()

    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'e2e-results/panel-handle-test.png',
      fullPage: true 
    })
  })

  test('引き手のスタイルとアニメーションを確認', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('text=アラート・スポット')).toBeVisible()
    
    // 引き手要素のスタイルをチェック
    const handleBox = page.locator('div').filter({
      has: page.locator('i[class*="fa-chevron-right"]')
    }).first()

    // 引き手のCSS属性を確認
    const handleStyles = await handleBox.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        position: computed.position,
        backgroundColor: computed.backgroundColor,
        cursor: computed.cursor,
        borderRadius: computed.borderRadius,
        zIndex: computed.zIndex
      }
    })

    // 期待されるスタイル属性をチェック
    expect(handleStyles.position).toBe('absolute')
    expect(handleStyles.cursor).toBe('pointer')
    expect(parseInt(handleStyles.zIndex)).toBeGreaterThan(1300)

    // ホバー効果をテスト
    await handleBox.hover()
    await page.waitForTimeout(300) // ホバーアニメーション待機

    // スクリーンショットでホバー状態を確認
    await page.screenshot({ 
      path: 'e2e-results/panel-handle-hover.png',
      clip: { x: 0, y: 200, width: 100, height: 200 }
    })
  })

  test('モバイル表示での引き手動作確認', async ({ page, isMobile }) => {
    // モバイルビューポートを設定
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/myact/')
    await expect(page.locator('text=アラート・スポット')).toBeVisible()

    // モバイルでの引き手表示を確認
    const handleElement = page.locator('i[class*="fa-chevron"]').first()
    await expect(handleElement).toBeVisible({ timeout: 5000 })

    // モバイルでの開閉動作をテスト
    const handleBox = page.locator('div').filter({
      has: handleElement
    }).first()
    
    await handleBox.click()
    await page.waitForTimeout(1000)
    
    // パネルが閉じたことを確認
    const panel = page.locator('[data-testid="alert-spot-card-list"]')
    await expect(panel).not.toBeVisible()

    // モバイル用スクリーンショット
    await page.screenshot({ 
      path: 'e2e-results/panel-handle-mobile.png',
      fullPage: true 
    })
  })

  test('地図レンダリングへの影響確認', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible()
    
    // 地図が正常にレンダリングされていることを確認
    const mapContainer = page.locator('[data-testid="map-container"]')
    const initialMapSize = await mapContainer.boundingBox()
    
    // パネルを閉じる
    const handleBox = page.locator('div').filter({
      has: page.locator('i[class*="fa-chevron-right"]')
    }).first()
    
    await handleBox.click()
    await page.waitForTimeout(1000) // アニメーション完了まで待機
    
    // 地図のサイズが変更されたことを確認
    const newMapSize = await mapContainer.boundingBox()
    
    // 地図の幅が増加していることを確認（パネルが閉じたため）
    if (initialMapSize && newMapSize) {
      expect(newMapSize.width).toBeGreaterThan(initialMapSize.width)
    }
    
    // パネルを再度開く
    const reopenHandleBox = page.locator('div').filter({
      has: page.locator('i[class*="fa-chevron-left"]')
    }).first()
    
    await reopenHandleBox.click()
    await page.waitForTimeout(1000)
    
    // 地図のサイズが元に戻ったことを確認
    const finalMapSize = await mapContainer.boundingBox()
    if (initialMapSize && finalMapSize) {
      expect(Math.abs(finalMapSize.width - initialMapSize.width)).toBeLessThan(20) // 誤差を考慮
    }
  })
})