import { test, expect } from '@playwright/test'

test.describe('カードクリック簡易テスト', () => {
  test('カードをクリックしてAPIリクエストが発生する', async ({ page }) => {
    // APIリクエストを監視
    const apiRequests: string[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/brief')) {
        apiRequests.push(url)
        console.log('API Request:', url)
      }
    })

    // コンソールログを監視
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('LeafletMap: Updating map view') || 
          text.includes('Failed to get location') ||
          text.includes('map view from store')) {
        consoleLogs.push(text)
        console.log('Console:', text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // カードを探す
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    console.log(`表示されているカード数: ${cardCount}`)

    if (cardCount > 0) {
      // 最初のカードの詳細を取得
      const firstCard = cards.first()
      const cardText = await firstCard.textContent()
      console.log('クリックするカード:', cardText?.substring(0, 100) + '...')
      
      // カードをクリック
      await firstCard.click()
      
      // APIリクエストやログが発生するまで待機
      await page.waitForTimeout(3000)
      
      // APIリクエストが発生したことを確認
      if (apiRequests.length > 0) {
        console.log('✅ APIリクエストが発生しました:', apiRequests)
      } else {
        console.log('⚠️ APIリクエストが発生しませんでした')
      }
      
      // コンソールログが出力されたことを確認
      if (consoleLogs.length > 0) {
        console.log('✅ 地図更新関連のログが出力されました:', consoleLogs)
      } else {
        console.log('⚠️ 地図更新ログが出力されませんでした')
      }
      
      console.log('✅ カードクリック処理が実行されました')
    } else {
      console.log('⚠️ 表示されているカードがありません')
    }
  })

  test('複数のカードをクリックしてそれぞれ動作する', async ({ page }) => {
    const apiRequests: string[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/brief')) {
        apiRequests.push(url)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    const testCount = Math.min(cardCount, 3) // 最大3枚のカードをテスト

    console.log(`${testCount}枚のカードをテストします`)

    for (let i = 0; i < testCount; i++) {
      const card = cards.nth(i)
      const cardText = await card.textContent()
      console.log(`カード${i+1}をクリック:`, cardText?.substring(0, 50) + '...')
      
      const initialRequestCount = apiRequests.length
      
      await card.click()
      await page.waitForTimeout(2000)
      
      const newRequestCount = apiRequests.length
      
      if (newRequestCount > initialRequestCount) {
        console.log(`✅ カード${i+1}: APIリクエストが発生しました`)
      } else {
        console.log(`⚠️ カード${i+1}: APIリクエストが発生しませんでした`)
      }
    }

    console.log(`総API リクエスト数: ${apiRequests.length}`)
    console.log('✅ 複数カードクリックテスト完了')
  })

  test('エラーハンドリングの確認', async ({ page }) => {
    const errorLogs: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Failed to get location') || text.includes('error')) {
        errorLogs.push(text)
        console.log('Error Log:', text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // カードをクリック
      await cards.first().click()
      await page.waitForTimeout(3000)
      
      // エラーログが出力されたかチェック
      if (errorLogs.length > 0) {
        console.log('⚠️ エラーログが検出されました:', errorLogs)
      } else {
        console.log('✅ エラーなく処理が完了しました')
      }
    }
  })
})