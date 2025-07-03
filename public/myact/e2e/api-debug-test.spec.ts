import { test, expect } from '@playwright/test'

test.describe('API動作デバッグテスト', () => {
  test('詳細なAPI動作確認', async ({ page }) => {
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
      if (text.includes('ALERT-SPOT') || text.includes('SPOT-API') || text.includes('APIService')) {
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
    
    console.log('=== テスト結果 ===')
    console.log(`APIリクエスト数: ${apiRequests.length}`)
    console.log(`コンソールログ数: ${consoleLogs.length}`)
    console.log(`エラーログ数: ${errorLogs.length}`)
    
    // 詳細結果
    apiRequests.forEach((req, i) => {
      console.log(`Request ${i + 1}: ${req.url} (Status: ${req.status || 'pending'})`)
    })
    
    // スポットAPIリクエストをチェック
    const spotsRequests = apiRequests.filter(req => req.url.includes('/activation/spots'))
    const alertsRequests = apiRequests.filter(req => req.url.includes('/activation/alerts'))
    
    console.log(`スポットAPI: ${spotsRequests.length}件`)
    console.log(`アラートAPI: ${alertsRequests.length}件`)
    
    // カード表示を確認
    const cardsList = page.locator('[data-testid="alert-spot-card-list"]')
    const cardsVisible = await cardsList.isVisible()
    const cardsCount = await page.locator('[data-testid="alert-spot-card"]').count()
    
    console.log(`カードリスト表示: ${cardsVisible}`)
    console.log(`表示カード数: ${cardsCount}`)
    
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

    // 最低限の動作確認
    console.log('=== 最終判定 ===')
    if (cardsVisible && (spotsRequests.length > 0 || alertsRequests.length > 0)) {
      console.log('✅ システムは基本的に動作しています')
    } else {
      console.log('⚠️ システムに問題があります')
    }
  })
})