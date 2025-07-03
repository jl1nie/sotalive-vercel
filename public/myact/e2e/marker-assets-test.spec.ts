import { test, expect } from '@playwright/test'

test.describe('マーカーアセットテスト', () => {
  test('マーカー画像の読み込み確認', async ({ page }) => {
    // ネットワークリクエストを監視
    const imageRequests: { url: string; status?: number }[] = []
    const failedRequests: { url: string; error: string }[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('marker') || url.includes('.png')) {
        imageRequests.push({ url })
        console.log('🖼️ Image Request:', url)
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('marker') || url.includes('.png')) {
        const request = imageRequests.find(r => r.url === url && !r.status)
        if (request) {
          request.status = response.status()
          console.log('📷 Image Response:', url, 'Status:', response.status())
        }
      }
    })

    page.on('requestfailed', request => {
      const url = request.url()
      if (url.includes('marker') || url.includes('.png')) {
        failedRequests.push({ url, error: request.failure()?.errorText || 'Unknown error' })
        console.log('❌ Image Failed:', url, request.failure()?.errorText)
      }
    })

    // サイトにアクセス
    await page.goto('http://localhost:5173/myact/')
    
    // 地図が表示されるまで待機
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    // マーカー画像の読み込みを待機
    await page.waitForTimeout(10000)
    
    console.log('=== マーカーアセットテスト結果 ===')
    console.log(`画像リクエスト数: ${imageRequests.length}`)
    console.log(`失敗リクエスト数: ${failedRequests.length}`)
    
    // 詳細結果
    imageRequests.forEach((req, i) => {
      console.log(`Request ${i + 1}: ${req.url} (Status: ${req.status || 'pending'})`)
    })
    
    failedRequests.forEach((req, i) => {
      console.log(`Failed ${i + 1}: ${req.url} (Error: ${req.error})`)
    })

    // CSS背景画像のテスト
    console.log('CSS背景画像のテスト実行中...')
    
    // 開発者ツールでCSS背景画像の状態を確認
    const cssImageInfo = await page.evaluate(() => {
      const extraMarkerElements = document.querySelectorAll('.extra-marker')
      const results: { element: string; backgroundImage: string; computed: string }[] = []
      
      extraMarkerElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element)
        results.push({
          element: `extra-marker-${index}`,
          backgroundImage: styles.backgroundImage,
          computed: styles.getPropertyValue('background-image')
        })
      })
      
      return results
    })
    
    console.log('CSS背景画像情報:', cssImageInfo)

    // 画像パス直接テスト
    const testPaths = [
      '/myact/common/img/markers_default.png',
      '/common/img/markers_default.png',
      'common/img/markers_default.png'
    ]
    
    console.log('画像パス直接テスト実行中...')
    for (const path of testPaths) {
      try {
        const response = await page.goto(`http://localhost:5173${path}`)
        console.log(`Path: ${path} - Status: ${response?.status() || 'no response'}`)
      } catch (error) {
        console.log(`Path: ${path} - Error: ${error}`)
      }
    }

    // サイトに戻る
    await page.goto('http://localhost:5173/myact/')
    
    if (failedRequests.length === 0) {
      console.log('✅ すべてのマーカー画像が正常に読み込まれました')
    } else {
      console.log('⚠️ マーカー画像の読み込みに問題があります')
    }
  })
})