import { test, expect } from '@playwright/test'

test.describe('クイックAPIテスト', () => {
  test('基本的なAPI動作確認', async ({ page }) => {
    const apiRequests: string[] = []
    const consoleLogs: string[] = []
    
    // APIリクエストを監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/activation/')) {
        apiRequests.push(url)
        console.log('📡 API Request:', url)
      }
    })

    // コンソールログを監視
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('ALERT-SPOT') || text.includes('SPOT-API')) {
        consoleLogs.push(text)
        console.log('📊 LOG:', text)
      }
    })

    // サイトにアクセス
    await page.goto('http://localhost:4173/myact/')
    
    // 地図が表示されるまで待機
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 30000 })
    
    // 30秒待機してAPIリクエストを確認
    await page.waitForTimeout(30000)
    
    console.log('=== テスト結果 ===')
    console.log(`APIリクエスト数: ${apiRequests.length}`)
    console.log(`コンソールログ数: ${consoleLogs.length}`)
    
    // スポットAPIリクエストをチェック
    const spotsRequests = apiRequests.filter(url => url.includes('/activation/spots'))
    const alertsRequests = apiRequests.filter(url => url.includes('/activation/alerts'))
    
    console.log(`スポットAPI: ${spotsRequests.length}件`)
    console.log(`アラートAPI: ${alertsRequests.length}件`)
    
    if (spotsRequests.length > 0) {
      console.log('✅ スポットAPIが正常に動作しています')
    } else {
      console.log('❌ スポットAPIが動作していません')
    }
    
    if (alertsRequests.length > 0) {
      console.log('✅ アラートAPIが正常に動作しています')
    } else {
      console.log('❌ アラートAPIが動作していません')
    }

    // 最低限のAPI動作を確認
    expect(apiRequests.length).toBeGreaterThan(0)
  })
})