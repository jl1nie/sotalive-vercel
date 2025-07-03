import { test, expect } from '@playwright/test'

test('ページ内容デバッグ', async ({ page }) => {
  // アプリケーションにアクセス
  await page.goto('http://localhost:5173/myact/')
  
  // ページタイトル確認
  const title = await page.title()
  console.log('Page title:', title)
  
  // ページのHTML内容を確認
  const bodyContent = await page.locator('body').innerHTML()
  console.log('Page body length:', bodyContent.length)
  
  // React root要素の存在確認
  const reactRoot = await page.locator('#root').count()
  console.log('React root elements:', reactRoot)
  
  // エラーメッセージの確認
  const errorElements = await page.locator('[class*="error"], .error, [role="alert"]').count()
  console.log('Error elements found:', errorElements)
  
  // Leaflet関連要素の確認
  const leafletElements = await page.locator('[class*="leaflet"], .leaflet-container').count()
  console.log('Leaflet elements found:', leafletElements)
  
  // data-testid要素の確認
  const testIdElements = await page.locator('[data-testid]').count()
  console.log('data-testid elements found:', testIdElements)
  
  // スクリーンショット撮影
  await page.screenshot({ path: 'test-results/debug-page-content.png', fullPage: true })
  
  // コンソールログ確認
  page.on('console', msg => {
    console.log('Console:', msg.type(), msg.text())
  })
  
  await page.waitForTimeout(5000) // 5秒待機してコンソールログ収集
})