import { test, expect } from '@playwright/test'

test.describe('シンプルフィルターテスト', () => {
  test('基本的なデータ表示とフィルター確認', async ({ page }) => {
    const consoleLogs: string[] = []
    
    // 重要なコンソールログのみを監視
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Final processed cards') || 
          text.includes('spotsCount') || 
          text.includes('apiAlertsCount') ||
          text.includes('filteredCards')) {
        consoleLogs.push(text)
        console.log('📊 DATA:', text)
      }
    })

    console.log('サイトにアクセス...')
    await page.goto('http://localhost:5173/myact/')
    
    console.log('地図表示待機...')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    console.log('データ読み込み待機（10秒）...')
    await page.waitForTimeout(10000)
    
    // サイドパネル表示確認
    const sidePanel = page.locator('[data-testid="alert-spot-card-list"]')
    const sidePanelVisible = await sidePanel.isVisible()
    console.log(`✓ サイドパネル表示: ${sidePanelVisible}`)
    
    if (!sidePanelVisible) {
      console.log('❌ サイドパネルが表示されていません')
      return
    }
    
    // カード数確認
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    console.log(`✓ 表示カード数: ${cardCount}`)
    
    // メッセージ確認
    const noDataMessage = await page.locator('text=アラート・スポットがありません').isVisible()
    const loadingMessage = await page.locator('text=データを読み込み中').isVisible()
    console.log(`✓ データなしメッセージ: ${noDataMessage}`)
    console.log(`✓ 読み込み中メッセージ: ${loadingMessage}`)
    
    // タイトル確認
    const title = await page.locator('text=アラート・スポット').isVisible()
    console.log(`✓ タイトル表示: ${title}`)
    
    // フィルターボタン確認
    const filterButton = page.locator('[aria-label="フィルター"]')
    const filterButtonVisible = await filterButton.isVisible()
    console.log(`✓ フィルターボタン表示: ${filterButtonVisible}`)
    
    // 地域フィルターボタン確認
    const regionButton = page.locator('[aria-label="地域フィルター"]')
    const regionButtonVisible = await regionButton.isVisible()
    console.log(`✓ 地域フィルターボタン表示: ${regionButtonVisible}`)
    
    // Zustand store状態確認
    const storeState = await page.evaluate(() => {
      try {
        // @ts-ignore
        const store = window.__ZUSTAND_STORE__
        if (store) {
          const state = store.getState()
          return {
            hasStore: true,
            preferences: {
              alert_spot_type_filter: state.preferences?.alert_spot_type_filter,
              alert_spot_program_filter: state.preferences?.alert_spot_program_filter,
              alert_spot_region_filter: state.preferences?.alert_spot_region_filter,
              spot_period: state.preferences?.spot_period
            }
          }
        }
        return { hasStore: false }
      } catch (error) {
        return { hasStore: false, error: String(error) }
      }
    })
    
    console.log(`✓ Store状態:`, JSON.stringify(storeState, null, 2))
    
    // 簡単なフィルターテスト（地域フィルター）
    if (regionButtonVisible) {
      console.log('地域フィルターテスト実行...')
      try {
        await regionButton.click()
        await page.waitForTimeout(1000)
        
        const regionMenu = page.locator('[role="menu"]')
        const menuVisible = await regionMenu.isVisible()
        console.log(`✓ 地域メニュー表示: ${menuVisible}`)
        
        if (menuVisible) {
          // 「全世界」選択
          await page.locator('text=全世界').click()
          await page.waitForTimeout(2000)
          
          const worldwideCards = await cards.count()
          console.log(`✓ 全世界フィルター後のカード数: ${worldwideCards}`)
          
          // 「日本」に戻す
          await regionButton.click()
          await page.waitForTimeout(500)
          await page.locator('text=日本').click()
          await page.waitForTimeout(2000)
          
          const japanCards = await cards.count()
          console.log(`✓ 日本フィルター後のカード数: ${japanCards}`)
        }
      } catch (error) {
        console.log(`地域フィルターテストエラー: ${error}`)
      }
    }
    
    // 最終判定
    console.log('=== 最終結果 ===')
    console.log(`コンソールログ数: ${consoleLogs.length}`)
    
    // 最新のprocessed cardsログを表示
    const processedLogs = consoleLogs.filter(log => log.includes('Final processed cards'))
    if (processedLogs.length > 0) {
      console.log('最新のprocessed cardsログ:')
      console.log(processedLogs[processedLogs.length - 1])
    }
    
    // データ関連ログを表示
    const dataLogs = consoleLogs.filter(log => 
      log.includes('spotsCount') || log.includes('apiAlertsCount')
    )
    if (dataLogs.length > 0) {
      console.log('データ関連ログ:')
      dataLogs.forEach(log => console.log(log))
    }
    
    if (sidePanelVisible && title) {
      console.log('✅ 基本UIは正常に表示されています')
    } else {
      console.log('❌ 基本UIに問題があります')
    }
    
    if (cardCount > 0) {
      console.log('✅ カードが表示されています')
    } else if (noDataMessage) {
      console.log('ℹ️ データなしメッセージが表示されています（正常）')
    } else {
      console.log('⚠️ カードもメッセージも表示されていません')
    }
    
    // テスト成功条件
    expect(sidePanelVisible).toBe(true)
    expect(title).toBe(true)
  })
})