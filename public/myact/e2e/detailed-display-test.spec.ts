import { test, expect } from '@playwright/test'

test.describe('詳細表示検証テスト', () => {
  test('APIデータ取得と実際の表示の詳細確認', async ({ page }) => {
    const consoleLogs: string[] = []
    const apiRequests: { url: string; status?: number; response?: any }[] = []
    
    // すべてのコンソールログを監視
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      console.log('CONSOLE:', text)
    })

    // APIリクエストとレスポンスを詳細監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/activation/') || url.includes('sotaapp2.sotalive.net')) {
        apiRequests.push({ url })
        console.log('📡 REQUEST:', url)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/activation/') || url.includes('sotaapp2.sotalive.net')) {
        const request = apiRequests.find(r => r.url === url && !r.status)
        if (request) {
          request.status = response.status()
          try {
            if (response.status() === 200) {
              const responseData = await response.json()
              request.response = responseData
              console.log(`📥 RESPONSE: ${url} - Status: ${response.status()} - Data items: ${Array.isArray(responseData) ? responseData.length : 'not array'}`)
            }
          } catch (error) {
            console.log(`📥 RESPONSE: ${url} - Status: ${response.status()} - Parse error: ${error}`)
          }
        }
      }
    })

    console.log('=== サイトアクセス ===')
    await page.goto('http://localhost:5173/myact/')
    
    console.log('=== 地図表示待機 ===')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    console.log('=== 初期表示確認 ===')
    await page.waitForTimeout(3000)
    
    // DOM要素の詳細確認
    const domInfo = await page.evaluate(() => {
      return {
        // React Root
        reactRoot: document.getElementById('root') ? true : false,
        
        // サイドパネル
        sidePanelExists: document.querySelector('[data-testid="alert-spot-card-list"]') ? true : false,
        sidePanelVisible: document.querySelector('[data-testid="alert-spot-card-list"]')?.offsetParent !== null,
        
        // カード要素
        cardElements: document.querySelectorAll('[data-testid="alert-spot-card"]').length,
        cardContainers: document.querySelectorAll('.MuiCard-root, .card, [class*="card"]').length,
        
        // リスト要素
        listItems: document.querySelectorAll('li, .list-item, [class*="list"]').length,
        
        // メッセージ要素
        noDataMessage: document.body.innerText.includes('アラート・スポットがありません'),
        loadingMessage: document.body.innerText.includes('データを読み込み中') || document.body.innerText.includes('loading'),
        
        // スクロール可能な要素
        scrollableElements: Array.from(document.querySelectorAll('[style*="overflow"]')).length,
        
        // パネル内のテキスト内容
        panelTextContent: document.querySelector('[data-testid="alert-spot-card-list"]')?.textContent?.substring(0, 200) || 'not found'
      }
    })
    
    console.log('=== DOM状態 ===')
    console.log('DOM Info:', JSON.stringify(domInfo, null, 2))
    
    console.log('=== データ待機（30秒） ===')
    await page.waitForTimeout(30000)
    
    // 最終的なカード数確認
    const finalCardCount = await page.locator('[data-testid="alert-spot-card"]').count()
    console.log(`最終カード数: ${finalCardCount}`)
    
    // スクリーンショット撮影
    console.log('=== スクリーンショット撮影 ===')
    await page.screenshot({ 
      path: 'e2e-results/display-debug.png', 
      fullPage: true 
    })
    
    // React state確認
    const reactState = await page.evaluate(() => {
      try {
        // React DevTools風のstate確認
        const root = document.getElementById('root')
        if (root && root._reactInternalFiber) {
          return 'React fiber found'
        }
        
        // Zustand store確認
        // @ts-ignore
        if (window.__ZUSTAND_STORE__) {
          // @ts-ignore
          const state = window.__ZUSTAND_STORE__.getState()
          return {
            storeExists: true,
            preferences: state.preferences ? Object.keys(state.preferences) : 'no preferences'
          }
        }
        
        return 'No React state access'
      } catch (error) {
        return `State access error: ${error}`
      }
    })
    
    console.log('=== React State ===')
    console.log('React State:', JSON.stringify(reactState, null, 2))
    
    // パネルの実際の内容確認
    const panelContent = await page.locator('[data-testid="alert-spot-card-list"]').textContent()
    console.log('=== パネル内容 ===')
    console.log('Panel Content (first 300 chars):', panelContent?.substring(0, 300))
    
    // APIデータと表示の比較
    console.log('=== API vs 表示 比較 ===')
    const spotsAPI = apiRequests.find(r => r.url.includes('/activation/spots'))
    const alertsAPI = apiRequests.find(r => r.url.includes('/activation/alerts'))
    
    if (spotsAPI && spotsAPI.response) {
      console.log(`スポットAPI: ${Array.isArray(spotsAPI.response) ? spotsAPI.response.length : 'not array'} items`)
    }
    
    if (alertsAPI && alertsAPI.response) {
      console.log(`アラートAPI: ${Array.isArray(alertsAPI.response) ? alertsAPI.response.length : 'not array'} items`)
    }
    
    console.log(`表示カード数: ${finalCardCount}`)
    
    // エラーメッセージの存在確認
    const errorMessages = await page.locator('text=Error, text=エラー, text=Failed').count()
    console.log(`エラーメッセージ数: ${errorMessages}`)
    
    // コンソールエラーの確認
    const errorLogs = consoleLogs.filter(log => 
      log.includes('Error') || log.includes('error') || log.includes('Failed') || log.includes('failed')
    )
    
    if (errorLogs.length > 0) {
      console.log('=== エラーログ ===')
      errorLogs.forEach((log, i) => console.log(`Error ${i + 1}: ${log}`))
    }
    
    // processed cardsログの詳細確認
    const processedLogs = consoleLogs.filter(log => log.includes('Final processed cards'))
    if (processedLogs.length > 0) {
      console.log('=== Processed Cards ログ ===')
      processedLogs.forEach((log, i) => console.log(`Processed ${i + 1}: ${log}`))
    }
    
    // 判定
    const hasAPIData = (spotsAPI?.response && Array.isArray(spotsAPI.response) && spotsAPI.response.length > 0) ||
                      (alertsAPI?.response && Array.isArray(alertsAPI.response) && alertsAPI.response.length > 0)
    
    console.log('=== 最終判定 ===')
    console.log(`APIデータ取得: ${hasAPIData}`)
    console.log(`DOM表示: ${finalCardCount > 0}`)
    console.log(`パネル存在: ${domInfo.sidePanelExists}`)
    console.log(`パネル表示: ${domInfo.sidePanelVisible}`)
    
    if (hasAPIData && finalCardCount === 0) {
      console.log('🚨 問題: APIデータはあるが表示されていません')
      
      // 詳細なフィルター状態確認
      const filterState = await page.evaluate(() => {
        try {
          // @ts-ignore
          const store = window.__ZUSTAND_STORE__
          if (store) {
            const state = store.getState()
            return {
              regionFilter: state.preferences?.alert_spot_region_filter,
              typeFilter: state.preferences?.alert_spot_type_filter,
              programFilter: state.preferences?.alert_spot_program_filter,
              spotPeriod: state.preferences?.spot_period
            }
          }
          return null
        } catch (error) {
          return `Error: ${error}`
        }
      })
      
      console.log('フィルター状態:', JSON.stringify(filterState, null, 2))
    }
    
    // テスト成功条件
    expect(domInfo.sidePanelExists).toBe(true)
  })
})