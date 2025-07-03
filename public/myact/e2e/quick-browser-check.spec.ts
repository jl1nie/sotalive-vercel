import { test, expect } from '@playwright/test'

test.describe('ブラウザ表示確認', () => {
  test('現在のブラウザ状態確認', async ({ page }) => {
    console.log('=== ブラウザアクセス開始 ===')
    
    // コンソールログ監視
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      console.log('BROWSER-CONSOLE:', text)
    })

    await page.goto('http://localhost:5173/myact/')
    
    console.log('=== 地図表示待機 ===')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 10000 })
    
    console.log('=== 15秒データ待機 ===')
    await page.waitForTimeout(15000)
    
    // パネル内容確認
    const panelExists = await page.locator('[data-testid="alert-spot-card-list"]').isVisible()
    console.log(`パネル存在: ${panelExists}`)
    
    if (panelExists) {
      const panelText = await page.locator('[data-testid="alert-spot-card-list"]').textContent()
      console.log('パネル内容:', panelText?.substring(0, 500))
      
      // カード数確認
      const cardCount = await page.locator('[data-testid="alert-spot-card"]').count()
      console.log(`カード数: ${cardCount}`)
      
      // 「アラート・スポットがありません」メッセージ確認
      const noDataMessage = panelText?.includes('アラート・スポットがありません')
      console.log(`「データなし」メッセージ: ${noDataMessage}`)
    }
    
    // APIリクエスト関連ログ
    const spotApiLogs = consoleLogs.filter(log => log.includes('SPOT-API'))
    const alertApiLogs = consoleLogs.filter(log => log.includes('ALERT-SPOT'))
    const apiServiceLogs = consoleLogs.filter(log => log.includes('APIService'))
    
    console.log('=== APIログ統計 ===')
    console.log(`SPOT-API ログ数: ${spotApiLogs.length}`)
    console.log(`ALERT-SPOT ログ数: ${alertApiLogs.length}`)
    console.log(`APIService ログ数: ${apiServiceLogs.length}`)
    
    // 最新のAPIデータ状況
    const latestDataLogs = alertApiLogs.filter(log => 
      log.includes('Final processed cards') || 
      log.includes('Processed arrays')
    ).slice(-3)
    
    console.log('=== 最新データ処理ログ ===')
    latestDataLogs.forEach((log, i) => console.log(`${i + 1}: ${log}`))
    
    // エラーログ確認
    const errorLogs = consoleLogs.filter(log => 
      log.toLowerCase().includes('error') || 
      log.toLowerCase().includes('failed')
    )
    
    if (errorLogs.length > 0) {
      console.log('=== エラーログ ===')
      errorLogs.forEach((log, i) => console.log(`Error ${i + 1}: ${log}`))
    }
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'e2e-results/browser-check.png', 
      fullPage: true 
    })
    
    expect(panelExists).toBe(true)
  })
})