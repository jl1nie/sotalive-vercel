import { test, expect } from '@playwright/test'

test.describe('スポットカード表示デバッグ', () => {
  test('スポットデータの取得と表示を検証', async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'log' && (
        msg.text().includes('ALERT-SPOT') || 
        msg.text().includes('SPOT -') ||
        msg.text().includes('TIMELINE')
      )) {
        consoleLogs.push(msg.text())
      }
    })

    // ページに移動
    await page.goto('/myact/')

    // 地図とUIが表示されるまで待機
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    // サイドパネルが表示されるまで待機
    await expect(page.locator('h6').filter({ hasText: 'アラート・スポット' }).first()).toBeVisible()

    // 3秒待ってAPIコールが完了するのを待つ
    await page.waitForTimeout(2000)

    // アラート・スポットカードリストが表示されているか確認
    const cardList = page.locator('[data-testid="alert-spot-card-list"]')
    await expect(cardList).toBeVisible()

    // カードが表示されているか確認
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()

    // コンソールログの分析
    console.log('=== 収集されたコンソールログ ===')
    consoleLogs.forEach(log => console.log(log))

    // デバッグ情報を出力
    console.log(`=== 表示されたカード数: ${cardCount} ===`)

    // スポットAPIデータのログを確認
    const spotApiLogs = consoleLogs.filter(log => log.includes('ALERT-SPOT - Spot API Data'))
    expect(spotApiLogs.length).toBeGreaterThan(0)

    // プロセッシングログを確認
    const processingLogs = consoleLogs.filter(log => log.includes('ALERT-SPOT - Processing cards'))
    expect(processingLogs.length).toBeGreaterThan(0)

    // 最終結果ログを確認
    const finalLogs = consoleLogs.filter(log => log.includes('ALERT-SPOT - Final processed cards'))
    expect(finalLogs.length).toBeGreaterThan(0)

    // 実際のカード表示を確認
    if (cardCount === 0) {
      // カードが表示されていない場合の詳細デバッグ
      const debugInfo = await page.evaluate(() => {
        const mapStore = (window as any).__ZUSTAND_STORE__?.mapStore
        return {
          preferences: mapStore?.getState?.()?.preferences,
          currentURL: window.location.href,
          localStorage: { ...localStorage }
        }
      })
      
      console.log('=== デバッグ情報 ===')
      console.log('MapStore Preferences:', debugInfo.preferences)
      console.log('Current URL:', debugInfo.currentURL)
      console.log('LocalStorage:', debugInfo.localStorage)

      // 設定ダイアログを開いて設定を確認
      const settingsButton = page.locator('[aria-label="設定"]')
      if (await settingsButton.isVisible()) {
        await settingsButton.click()
        await page.waitForTimeout(1000)
        
        // SOTA/POTA設定の状態を確認
        const sotaSwitch = page.locator('input[type="checkbox"][name*="sota"]')
        const potaSwitch = page.locator('input[type="checkbox"][name*="pota"]')
        
        const sotaEnabled = await sotaSwitch.isChecked().catch(() => false)
        const potaEnabled = await potaSwitch.isChecked().catch(() => false)
        
        console.log(`SOTA有効: ${sotaEnabled}, POTA有効: ${potaEnabled}`)
        
        // ダイアログを閉じる
        await page.keyboard.press('Escape')
      }
    }

    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'e2e-results/spot-card-debug.png',
      fullPage: true 
    })

    // 最低限のテスト条件
    expect(consoleLogs.length).toBeGreaterThan(0) // ログが出力されている
  })

  test('フィルタとソート機能のテスト', async ({ page }) => {
    await page.goto('/myact/')
    
    // サイドパネルが表示されるまで待機
    await expect(page.locator('h6').filter({ hasText: 'アラート・スポット' }).first()).toBeVisible()
    await page.waitForTimeout(2000)

    // フィルタボタンがあるか確認（地域フィルターでない方を選択）
    const filterButton = page.locator('[aria-label="フィルター"]')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // フィルタメニューの選択肢を確認
      const allOption = page.locator('text=すべて')
      const alertsOption = page.locator('text=アラートのみ')
      const spotsOption = page.locator('text=スポットのみ')
      
      if (await spotsOption.isVisible()) {
        console.log('スポットのみフィルタを選択')
        await spotsOption.click()
        await page.waitForTimeout(2000)
        
        // スポットのみ表示された後のカード数を確認
        const spotCards = page.locator('[data-testid="alert-spot-card"]')
        const spotCardCount = await spotCards.count()
        console.log(`スポットのみフィルタ後のカード数: ${spotCardCount}`)
      }
    }

    await page.screenshot({ 
      path: 'e2e-results/spot-filter-test.png',
      fullPage: true 
    })
  })

  test('API呼び出しの詳細確認', async ({ page }) => {
    // ネットワークリクエストを監視
    const apiRequests: any[] = []
    
    page.on('request', request => {
      if (request.url().includes('/activation/spots') || 
          request.url().includes('/activation/alerts')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        })
      }
    })

    page.on('response', response => {
      if (response.url().includes('/activation/spots') || 
          response.url().includes('/activation/alerts')) {
        console.log(`API Response: ${response.url()} - Status: ${response.status()}`)
      }
    })

    await page.goto('/myact/')
    await page.waitForTimeout(3000)

    console.log('=== API呼び出し履歴 ===')
    apiRequests.forEach((req, index) => {
      console.log(`Request ${index + 1}:`, req)
    })

    expect(apiRequests.length).toBeGreaterThan(0)
  })
})