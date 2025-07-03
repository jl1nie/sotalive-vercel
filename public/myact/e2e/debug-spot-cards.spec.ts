import { test, expect } from '@playwright/test'

test.describe('スポットカード表示デバッグ', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを監視
    page.on('console', msg => {
      if (msg.text().includes('ALERT-SPOT')) {
        console.log(`CONSOLE: ${msg.text()}`)
      }
    })

    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('スポットカードデータの流れを詳細確認', async ({ page }) => {
    console.log('=== スポットカードデータ流れ確認開始 ===')

    // 1. サイドパネルの確認
    const sidePanel = page.locator('[data-testid="collapsible-side-panel"]')
    await expect(sidePanel).toBeVisible()
    console.log('✓ サイドパネル表示確認')

    // 2. AlertSpotCardListコンポーネントの存在確認
    const alertSpotComponent = page.locator('.MuiBox-root').filter({ hasText: /アラート|スポット/ })
    const componentExists = await alertSpotComponent.count() > 0
    console.log(`AlertSpotCardListコンポーネント: ${componentExists ? '存在' : '不存在'}`)

    // 3. カード要素の確認
    const allCards = page.locator('.MuiCard-root')
    const cardCount = await allCards.count()
    console.log(`総カード数: ${cardCount}`)

    // 4. APIデータの受信確認（ページ内でのJavaScript実行）
    const apiDataCheck = await page.evaluate(() => {
      // ローカルストレージまたはグローバル変数からAPIデータを確認
      const zustandData = localStorage.getItem('map-store')
      return {
        zustandExists: !!zustandData,
        zustandData: zustandData ? JSON.parse(zustandData) : null,
        windowLocation: window.location.href,
        reactElements: document.querySelectorAll('[data-testid]').length
      }
    })
    
    console.log('APIデータ確認:', JSON.stringify(apiDataCheck, null, 2))

    // 5. Zustand storeの内容確認
    if (apiDataCheck.zustandData?.state?.preferences) {
      const prefs = apiDataCheck.zustandData.state.preferences
      console.log('Zustand preferences:', {
        sota_ref: prefs.sota_ref,
        pota_ref: prefs.pota_ref,
        alert_spot_program_filter: prefs.alert_spot_program_filter,
        alert_spot_region_filter: prefs.alert_spot_region_filter,
        spot_period: prefs.spot_period
      })
    }

    // 6. 強制的にAPIデータを取得確認
    await page.waitForTimeout(5000) // API呼び出し完了を待つ

    // 7. 最終カード数確認
    const finalCardCount = await allCards.count()
    console.log(`最終カード数: ${finalCardCount}`)

    // 8. デバッグ情報をページから取得
    const debugInfo = await page.evaluate(() => {
      // Reactコンポーネントの状態確認
      const reactFiber = (document.querySelector('[data-testid="collapsible-side-panel"]') as any)?._reactInternalFiber
      return {
        reactFiberExists: !!reactFiber,
        documentTitle: document.title,
        bodyHTML: document.body.innerHTML.substring(0, 500) + '...'
      }
    })
    
    console.log('React状態確認:', debugInfo)

    console.log('=== スポットカードデータ流れ確認完了 ===')
  })
})