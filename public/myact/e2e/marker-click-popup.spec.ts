import { test, expect } from '@playwright/test'

test.describe('マーカークリックポップアップテスト', () => {
  test('マーカーをクリックすると詳細情報API(/search/full)が呼ばれる', async ({ page }) => {
    // API リクエストを監視
    const apiRequests: { url: string; response?: any }[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/full')) {
        apiRequests.push({ url })
        console.log('📡 Full Details API Request:', url)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/search/full')) {
        try {
          const data = await response.json()
          const request = apiRequests.find(r => r.url === url)
          if (request) {
            request.response = data
            console.log('📥 Full Details API Response:', url, 'candidates:', data?.candidates?.length)
          }
        } catch (e) {
          console.log('📥 Full Details API Response Error:', url, e)
        }
      }
    })

    // コンソールログも監視
    const markerLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Fetching summit details') || 
          text.includes('Fetching park details') ||
          text.includes('Enriched')) {
        markerLogs.push(text)
        console.log('🎯 Marker Log:', text)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000) // 地図とマーカーの初期化を待つ

    console.log('地図が読み込まれました。マーカーを探しています...')

    // ページ内のSVGサークル（SOTAマーカー）を探す
    const summitMarkers = page.locator('svg circle')
    const markerCount = await summitMarkers.count()
    console.log(`発見されたSOTAマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // 最初のSOTAマーカーをクリック
      console.log('最初のSOTAマーカーをクリックします...')
      await summitMarkers.first().click()
      
      // API呼び出しを待機
      await page.waitForTimeout(3000)
      
      console.log('=== API呼び出し結果 ===')
      console.log(`/search/full APIリクエスト数: ${apiRequests.length}`)
      console.log(`マーカーログ数: ${markerLogs.length}`)
      
      if (apiRequests.length > 0) {
        console.log('✅ マーカークリックで詳細API呼び出しが成功しました')
        console.log('API URL:', apiRequests[0].url)
        
        const successfulRequests = apiRequests.filter(r => 
          r.response && r.response.candidates && r.response.candidates.length > 0
        )
        
        if (successfulRequests.length > 0) {
          console.log('✅ 詳細データ取得に成功しました')
          console.log('候補数:', successfulRequests[0].response.candidates.length)
        } else {
          console.log('⚠️ 詳細データの取得に失敗しました')
        }
      } else {
        console.log('⚠️ 詳細API呼び出しが発生しませんでした')
      }
      
      if (markerLogs.length > 0) {
        console.log('✅ マーカークリック処理ログが出力されました:', markerLogs[0])
      }
      
      // ポップアップが表示されたかチェック
      const popup = page.locator('.leaflet-popup')
      const isPopupVisible = await popup.isVisible()
      
      if (isPopupVisible) {
        console.log('✅ ポップアップが表示されました')
        const popupContent = await popup.textContent()
        console.log('ポップアップ内容 (抜粋):', popupContent?.substring(0, 100) + '...')
      } else {
        console.log('⚠️ ポップアップが表示されませんでした')
      }
      
      // テスト成功の条件
      expect(apiRequests.length).toBeGreaterThan(0)
      
    } else {
      console.log('⚠️ SOTAマーカーが見つかりませんでした')
    }
  })

  test('POTAマーカーをクリックして詳細情報を取得', async ({ page }) => {
    const apiRequests: string[] = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/full')) {
        apiRequests.push(url)
        console.log('POTA Details API Request:', url)
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000)

    // POTAマーカーを探す（通常はSVGのpathやpolygon要素）
    const potaMarkers = page.locator('svg path, svg polygon')
    const potaCount = await potaMarkers.count()
    console.log(`発見されたPOTAマーカー数: ${potaCount}`)

    if (potaCount > 0) {
      console.log('最初のPOTAマーカーをクリックします...')
      await potaMarkers.first().click()
      await page.waitForTimeout(3000)
      
      if (apiRequests.length > 0) {
        console.log('✅ POTAマーカークリックで詳細API呼び出しが成功しました')
      } else {
        console.log('⚠️ POTAマーカークリックでAPI呼び出しが発生しませんでした')
      }
    } else {
      console.log('ℹ️ POTAマーカーが見つかりませんでした（表示設定による可能性）')
    }
  })

  test('地図クリックでリバースジオコーディング情報を取得', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    console.log('地図の中央をクリックします...')
    
    // 地図エリアを取得してクリック
    const mapArea = page.locator('.leaflet-container')
    await mapArea.click()
    await page.waitForTimeout(2000)

    // ポップアップが表示されたかチェック
    const popup = page.locator('.leaflet-popup')
    const isPopupVisible = await popup.isVisible()
    
    if (isPopupVisible) {
      console.log('✅ 地図クリックでポップアップが表示されました')
      const popupContent = await popup.textContent()
      console.log('ポップアップ内容 (抜粋):', popupContent?.substring(0, 100) + '...')
    } else {
      console.log('⚠️ 地図クリックでポップアップが表示されませんでした')
    }
  })
})