import { test, expect } from '@playwright/test'

test.describe('フィルター動作テスト', () => {
  test('データ表示とフィルター機能の詳細確認', async ({ page }) => {
    const apiRequests: { url: string; status?: number }[] = []
    const consoleLogs: string[] = []
    const errorLogs: string[] = []
    
    // APIリクエストを監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/activation/') || url.includes('sotaapp2.sotalive.net')) {
        apiRequests.push({ url })
        console.log('📡 API Request:', url)
      }
    })

    // APIレスポンスを監視
    page.on('response', response => {
      const url = response.url()
      if (url.includes('/activation/') || url.includes('sotaapp2.sotalive.net')) {
        const request = apiRequests.find(r => r.url === url && !r.status)
        if (request) {
          request.status = response.status()
          console.log('📥 API Response:', url, 'Status:', response.status())
        }
      }
    })

    // コンソールログを監視
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('ALERT-SPOT') || text.includes('SPOT-API') || text.includes('Final processed cards')) {
        consoleLogs.push(text)
        console.log('📊 LOG:', text)
      }
      if (text.includes('error') || text.includes('Error') || text.includes('Failed')) {
        errorLogs.push(text)
        console.log('❌ ERROR:', text)
      }
    })

    // サイトにアクセス
    console.log('サイトにアクセス中...')
    await page.goto('http://localhost:5173/myact/')
    
    // 地図が表示されるまで待機
    console.log('地図コンテナの表示を待機中...')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    console.log('地図コンテナが表示されました')
    
    // 初期データ読み込みを待機
    console.log('初期データ読み込みを15秒間待機します...')
    await page.waitForTimeout(15000)
    
    console.log('=== 初期状態確認 ===')
    
    // サイドパネルの表示確認
    const sidePanel = page.locator('[data-testid="alert-spot-card-list"]')
    const sidePanelVisible = await sidePanel.isVisible()
    console.log(`サイドパネル表示: ${sidePanelVisible}`)
    
    if (sidePanelVisible) {
      // タイトル確認
      const title = await page.locator('text=アラート・スポット').isVisible()
      console.log(`タイトル表示: ${title}`)
      
      // フィルターボタン確認
      const filterButtons = await page.locator('[aria-label*="フィルタ"]').count()
      console.log(`フィルターボタン数: ${filterButtons}`)
      
      // カード表示確認
      const cards = page.locator('[data-testid="alert-spot-card"]')
      const cardCount = await cards.count()
      console.log(`表示カード数: ${cardCount}`)
      
      // メッセージ表示確認
      const noDataMessage = await page.locator('text=アラート・スポットがありません').isVisible()
      const loadingMessage = await page.locator('text=データを読み込み中').isVisible()
      console.log(`データなしメッセージ: ${noDataMessage}`)
      console.log(`読み込み中メッセージ: ${loadingMessage}`)
      
      if (cardCount === 0 && !noDataMessage && !loadingMessage) {
        console.log('⚠️ カードもメッセージも表示されていません')
      }
    }
    
    // API状態確認
    console.log('=== API状態確認 ===')
    const spotsRequests = apiRequests.filter(req => req.url.includes('/activation/spots'))
    const alertsRequests = apiRequests.filter(req => req.url.includes('/activation/alerts'))
    
    console.log(`スポットAPIリクエスト数: ${spotsRequests.length}`)
    console.log(`アラートAPIリクエスト数: ${alertsRequests.length}`)
    
    // フィルター設定の確認
    console.log('=== フィルター設定確認 ===')
    
    const filterInfo = await page.evaluate(() => {
      // Zustand store の状態を確認
      // @ts-ignore
      const store = window.__ZUSTAND_STORE__
      if (store) {
        const state = store.getState()
        return {
          preferences: state.preferences,
          alertSpotFilters: {
            type_filter: state.preferences.alert_spot_type_filter,
            program_filter: state.preferences.alert_spot_program_filter,
            region_filter: state.preferences.alert_spot_region_filter,
            show_by_call: state.preferences.alert_spot_show_by_call
          }
        }
      }
      return null
    })
    
    if (filterInfo) {
      console.log('フィルター設定:', JSON.stringify(filterInfo.alertSpotFilters, null, 2))
    } else {
      console.log('⚠️ Store状態を取得できませんでした')
    }
    
    // フィルター操作テスト
    if (sidePanelVisible) {
      console.log('=== フィルター操作テスト ===')
      
      try {
        // フィルターメニューを開く
        console.log('フィルターメニューを開きます...')
        const filterButton = page.locator('[aria-label="フィルター"]').first()
        await filterButton.click()
        await page.waitForTimeout(1000)
        
        // フィルターメニューの表示確認
        const filterMenu = page.locator('[role="menu"]')
        const menuVisible = await filterMenu.isVisible()
        console.log(`フィルターメニュー表示: ${menuVisible}`)
        
        if (menuVisible) {
          // メニュー項目の確認
          const menuItems = await page.locator('[role="menuitem"]').count()
          console.log(`メニュー項目数: ${menuItems}`)
          
          // 「アラート」フィルターを選択
          console.log('「アラート」フィルターを選択...')
          await page.locator('text=アラート').click()
          await page.waitForTimeout(2000)
          
          // フィルター適用後のカード数確認
          const alertCardsCount = await page.locator('[data-testid="alert-spot-card"]').count()
          console.log(`アラートフィルター適用後のカード数: ${alertCardsCount}`)
          
          // 「すべて」に戻す
          console.log('フィルターを「すべて」に戻します...')
          await filterButton.click()
          await page.waitForTimeout(500)
          await page.locator('text=すべて').first().click()
          await page.waitForTimeout(2000)
          
          const allCardsCount = await page.locator('[data-testid="alert-spot-card"]').count()
          console.log(`全表示時のカード数: ${allCardsCount}`)
        }
      } catch (error) {
        console.log(`フィルター操作エラー: ${error}`)
      }
    }
    
    // 地域フィルターテスト
    console.log('=== 地域フィルターテスト ===')
    
    try {
      // 地域フィルターボタンをクリック
      const regionButton = page.locator('[aria-label="地域フィルター"]').first()
      await regionButton.click()
      await page.waitForTimeout(1000)
      
      // 地域メニューの表示確認
      const regionMenu = page.locator('[role="menu"]')
      const regionMenuVisible = await regionMenu.isVisible()
      console.log(`地域フィルターメニュー表示: ${regionMenuVisible}`)
      
      if (regionMenuVisible) {
        // 「全世界」を選択
        console.log('「全世界」フィルターを選択...')
        await page.locator('text=全世界').click()
        await page.waitForTimeout(3000)
        
        const worldwideCardsCount = await page.locator('[data-testid="alert-spot-card"]').count()
        console.log(`全世界フィルター適用後のカード数: ${worldwideCardsCount}`)
        
        // 「日本」に戻す
        console.log('地域フィルターを「日本」に戻します...')
        await regionButton.click()
        await page.waitForTimeout(500)
        await page.locator('text=日本').click()
        await page.waitForTimeout(3000)
        
        const japanCardsCount = await page.locator('[data-testid="alert-spot-card"]').count()
        console.log(`日本フィルター適用後のカード数: ${japanCardsCount}`)
      }
    } catch (error) {
      console.log(`地域フィルター操作エラー: ${error}`)
    }
    
    console.log('=== 最終結果 ===')
    console.log(`総APIリクエスト数: ${apiRequests.length}`)
    console.log(`コンソールログ数: ${consoleLogs.length}`)
    console.log(`エラーログ数: ${errorLogs.length}`)
    
    // 最新のprocessed cardsログを確認
    const processedCardsLogs = consoleLogs.filter(log => log.includes('Final processed cards'))
    if (processedCardsLogs.length > 0) {
      console.log('最新のprocessed cardsログ:')
      console.log(processedCardsLogs[processedCardsLogs.length - 1])
    }
    
    // 成功判定
    if (spotsRequests.length > 0 && alertsRequests.length > 0) {
      console.log('✅ API通信は正常に動作しています')
    } else {
      console.log('❌ API通信に問題があります')
    }
    
    // テスト通過条件
    expect(apiRequests.length).toBeGreaterThan(0)
  })
})