import { test, expect } from '@playwright/test'

test('data-testid追加タイミングテスト', async ({ page }) => {
  console.log('アプリケーションにアクセス中...')
  await page.goto('http://localhost:5173/myact/')
  
  // ページ読み込み完了まで待機
  await page.waitForSelector('#root', { timeout: 10000 })
  console.log('React root loaded')

  // 段階的に確認
  for (let i = 1; i <= 10; i++) {
    const seconds = i
    await page.waitForTimeout(1000) // 1秒待機
    
    const leafletMapTestId = await page.locator('[data-testid="leaflet-map"]').count()
    const reactLeafletMap = await page.locator('.react-leaflet-map').count()
    const leafletContainer = await page.locator('.leaflet-container').count()
    
    console.log(`${seconds}秒後: data-testid="leaflet-map": ${leafletMapTestId}, .react-leaflet-map: ${reactLeafletMap}, .leaflet-container: ${leafletContainer}`)
    
    // data-testidが追加されたら成功
    if (leafletMapTestId > 0) {
      console.log(`✅ data-testid="leaflet-map"が${seconds}秒後に見つかりました！`)
      break
    }
    
    if (i === 10) {
      console.log('❌ 10秒経過してもdata-testid="leaflet-map"が見つかりませんでした')
      
      // 詳細デバッグ情報
      const detailedInfo = await page.evaluate(() => {
        const container = document.querySelector('.leaflet-container')
        if (!container) return 'No leaflet-container found'
        
        return {
          hasDataTestId: container.hasAttribute('data-testid'),
          dataTestIdValue: container.getAttribute('data-testid'),
          className: container.className,
          tagName: container.tagName,
          id: container.id
        }
      })
      console.log('詳細情報:', detailedInfo)
    }
  }
  
  // 最終確認
  const finalCount = await page.locator('[data-testid="leaflet-map"]').count()
  expect(finalCount).toBeGreaterThan(0)
})