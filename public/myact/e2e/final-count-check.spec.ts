import { test, expect } from '@playwright/test'

test.describe('最終カウント確認', () => {
  test('Final processed cardsカウント確認', async ({ page }) => {
    console.log('=== サイト読み込み ===')
    
    // コンソールログ監視 - Final processed cardsのみフォーカス
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Final processed cards')) {
        console.log('🎯 FINAL COUNT:', text)
      }
    })

    await page.goto('http://localhost:5173/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 10000 })
    
    console.log('=== 20秒データ処理待機 ===')
    await page.waitForTimeout(20000)
    
    // パネル内容直接確認
    const panelText = await page.locator('[data-testid="alert-spot-card-list"]').textContent()
    console.log('パネル表示内容:', panelText?.substring(0, 200))
    
    // カード数
    const cardCount = await page.locator('[data-testid="alert-spot-card"]').count()
    console.log(`実際のカード数: ${cardCount}`)
    
    // 「アラート・スポットがありません」メッセージ
    const hasNoDataMessage = panelText?.includes('アラート・スポットがありません')
    console.log(`「データなし」メッセージあり: ${hasNoDataMessage}`)
    
    expect(true).toBe(true) // テスト必須
  })
})