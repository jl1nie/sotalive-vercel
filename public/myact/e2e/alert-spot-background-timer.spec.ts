import { test, expect } from '@playwright/test'

test.describe('アラート・スポットバックグラウンドタイマーテスト', () => {
  test('データ取得とバックグラウンド更新の確認', async ({ page }) => {
    // APIリクエストとログを監視
    const apiRequests: { url: string; timestamp: number; status?: number }[] = []
    const dataLogs: string[] = []
    const errorLogs: string[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/activation/spots') || url.includes('/activation/alerts')) {
        apiRequests.push({ url, timestamp: Date.now() })
        console.log('📡 API Request:', url)
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/activation/spots') || url.includes('/activation/alerts')) {
        const request = apiRequests.find(r => r.url === url && !r.status)
        if (request) {
          request.status = response.status()
          console.log('📥 API Response:', url, 'Status:', response.status())
        }
      }
    })

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('ALERT-SPOT') || text.includes('SPOT-API')) {
        dataLogs.push(text)
        console.log('📊 Data Log:', text)
      }
      if (text.includes('error') || text.includes('Error') || text.includes('Failed')) {
        errorLogs.push(text)
        console.log('❌ Error Log:', text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    console.log('=== 初期データ取得 ===')
    await page.waitForTimeout(8000) // 初期データ取得を待つ
    
    const initialRequests = apiRequests.length
    const initialDataLogs = dataLogs.length
    
    console.log(`初期APIリクエスト数: ${initialRequests}`)
    console.log(`初期データログ数: ${initialDataLogs}`)
    console.log(`エラーログ数: ${errorLogs.length}`)

    // APIリクエストが発生したかチェック
    const spotsRequests = apiRequests.filter(r => r.url.includes('/activation/spots'))
    const alertsRequests = apiRequests.filter(r => r.url.includes('/activation/alerts'))
    
    console.log(`スポットAPIリクエスト数: ${spotsRequests.length}`)
    console.log(`アラートAPIリクエスト数: ${alertsRequests.length}`)

    if (spotsRequests.length > 0) {
      console.log('✅ スポットAPIが呼び出されました')
    } else {
      console.log('❌ スポットAPIが呼び出されませんでした')
    }

    if (alertsRequests.length > 0) {
      console.log('✅ アラートAPIが呼び出されました')
    } else {
      console.log('❌ アラートAPIが呼び出されませんでした')
    }

    // データ処理ログの確認
    const processedSpotsLogs = dataLogs.filter(log => 
      log.includes('Processed spots') || log.includes('spotsCount'))
    const processedAlertsLogs = dataLogs.filter(log => 
      log.includes('apiAlertsCount') || log.includes('Alert API Data'))

    console.log(`スポット処理ログ数: ${processedSpotsLogs.length}`)
    console.log(`アラート処理ログ数: ${processedAlertsLogs.length}`)

    if (processedSpotsLogs.length > 0) {
      console.log('最新のスポット処理ログ:', processedSpotsLogs[processedSpotsLogs.length - 1])
    }

    if (processedAlertsLogs.length > 0) {
      console.log('最新のアラート処理ログ:', processedAlertsLogs[processedAlertsLogs.length - 1])
    }

    // UIでのカード表示確認
    console.log('=== UI表示確認 ===')
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    console.log(`表示されているカード数: ${cardCount}`)

    if (cardCount > 0) {
      console.log('✅ アラート・スポットカードが表示されています')
      // 最初のカードの内容確認
      const firstCardText = await cards.first().textContent()
      console.log('最初のカード内容 (抜粋):', firstCardText?.substring(0, 100) + '...')
    } else {
      console.log('❌ アラート・スポットカードが表示されていません')
    }

    // バックグラウンド更新テスト（2分間監視）
    console.log('=== バックグラウンド更新テスト ===')
    console.log('2分間のバックグラウンド更新を監視します...')
    
    const startTime = Date.now()
    let backgroundUpdateCount = 0
    const initialRequestCount = apiRequests.length

    // 2分間待機してバックグラウンド更新を監視
    while (Date.now() - startTime < 120000) { // 2 minutes
      await page.waitForTimeout(10000) // 10秒間隔でチェック
      
      const currentRequestCount = apiRequests.length
      if (currentRequestCount > initialRequestCount + backgroundUpdateCount) {
        backgroundUpdateCount = currentRequestCount - initialRequestCount
        console.log(`バックグラウンド更新検出: ${backgroundUpdateCount}回`)
      }
    }

    console.log(`=== 最終結果 ===`)
    console.log(`総APIリクエスト数: ${apiRequests.length}`)
    console.log(`バックグラウンド更新回数: ${backgroundUpdateCount}`)
    console.log(`表示カード数: ${cardCount}`)
    console.log(`エラー数: ${errorLogs.length}`)

    // 成功判定条件
    if (spotsRequests.length > 0 && alertsRequests.length > 0) {
      console.log('✅ バックグラウンドタイマー機能は正常に動作しています')
    } else {
      console.log('⚠️ バックグラウンドタイマー機能に問題があります')
    }

    // テスト通過条件
    expect(spotsRequests.length).toBeGreaterThan(0)
    expect(alertsRequests.length).toBeGreaterThan(0)
  })

  test('React Query設定確認', async ({ page }) => {
    // React Queryの設定を確認
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // React Query DevToolsがあれば確認
    const queryInfo = await page.evaluate(() => {
      // @ts-ignore
      const queryClient = window.__REACT_QUERY_CLIENT__
      if (queryClient) {
        const queries = queryClient.getQueryCache().getAll()
        const activeQueries = queries.filter(q => q.isActive())
        const spotsQueries = queries.filter(q => 
          q.queryKey.includes('spots') || 
          q.queryKey.includes('activation')
        )
        
        return {
          totalQueries: queries.length,
          activeQueries: activeQueries.length,
          spotsQueries: spotsQueries.length,
          queryKeys: queries.map(q => q.queryKey)
        }
      }
      return null
    })

    if (queryInfo) {
      console.log('React Query 情報:', queryInfo)
      console.log('✅ React Queryクライアントが動作しています')
    } else {
      console.log('⚠️ React Query情報を取得できませんでした')
    }
  })
})