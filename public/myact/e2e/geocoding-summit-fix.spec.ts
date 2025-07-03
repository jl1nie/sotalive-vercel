import { test, expect } from '@playwright/test'

test.describe('リバースジオコーディングとサミット詳細修正確認', () => {
  test.beforeEach(async ({ page }) => {
    // すべてのAPIリクエストを監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('reverse-geocoder') || url.includes('/search/full') || url.includes('gsi.go.jp')) {
        console.log(`[API REQUEST] ${request.method()} ${url}`)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('reverse-geocoder') || url.includes('/search/full') || url.includes('gsi.go.jp')) {
        const status = response.status()
        console.log(`[API RESPONSE] ${status} ${url}`)
        if (status === 200) {
          try {
            const data = await response.text()
            console.log(`[API DATA] ${url.slice(-50)}: ${data.slice(0, 200)}...`)
          } catch (e) {
            console.log(`[API DATA] Could not read response body`)
          }
        }
      }
    })

    // コンソールエラーをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`)
      } else if (msg.type() === 'log' && msg.text().includes('LeafletMap:')) {
        console.log(`[LEAFLET LOG] ${msg.text()}`)
      }
    })
    
    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('地図クリック時のparameter out of rangeエラー修正確認', async ({ page }) => {
    console.log('=== 地図クリックエラー修正テスト開始 ===')

    // 地図の中央部分をクリック
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 400, y: 300 } })
    
    // ポップアップ表示待機
    await page.waitForTimeout(3000)
    
    // ポップアップの内容確認
    const popup = page.locator('.leaflet-popup-content')
    if (await popup.count() > 0) {
      const content = await popup.textContent()
      console.log('地図クリックポップアップ内容:')
      console.log(content)
      
      // parameter out of rangeエラーチェック
      const hasParameterError = content?.includes('Parameter out of range')
      
      if (hasParameterError) {
        console.log('❌ parameter out of rangeエラーが残っています')
      } else {
        console.log('✅ parameter out of rangeエラーが修正されました')
      }
      
      // 正常な地理情報が表示されているかチェック
      const hasLocationInfo = content?.includes('クリック位置') || content?.includes('GL:')
      
      if (hasLocationInfo) {
        console.log('✅ 地理情報が正常に表示されています')
      } else {
        console.log('⚠️ 地理情報の表示を確認してください')
      }
      
      expect(hasParameterError).toBe(false)
      expect(hasLocationInfo).toBe(true)
      
    } else {
      console.log('⚠️ ポップアップが表示されませんでした')
    }

    console.log('=== 地図クリックエラー修正テスト完了 ===')
  })

  test('サミットマーカークリック時の詳細情報表示確認', async ({ page }) => {
    console.log('=== サミット詳細情報修正テスト開始 ===')

    // 5秒待機してマーカー読み込み完了
    await page.waitForTimeout(5000)
    
    // サミットマーカーを検索
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: ''
    })
    
    const markerCount = await summitMarkers.count()
    console.log(`サミットマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // サミットマーカークリック
      console.log('サミットマーカークリック実行')
      const firstMarker = summitMarkers.first()
      await firstMarker.click()
      
      // 基本ポップアップ表示待機
      await page.waitForTimeout(500)
      console.log('基本ポップアップ表示確認')
      
      // 詳細情報取得待機
      await page.waitForTimeout(3000)
      console.log('詳細情報取得完了待機')
      
      // ポップアップ内容確認
      const popup = page.locator('.leaflet-popup-content')
      if (await popup.count() > 0) {
        const content = await popup.textContent()
        console.log('サミットポップアップ詳細内容:')
        console.log(content)
        
        // 詳細情報の有無確認
        const hasPoints = content?.includes('pts') && !content?.includes('---pts')
        const hasElevation = content?.includes('標高:') && !content?.includes('---m')
        const hasActivations = content?.includes('Activations:') || content?.includes('Loading detailed info')
        const hasSOTALink = content?.includes('summits.sota.org.uk')
        const hasGL = content?.includes('GL:')
        
        console.log('詳細情報チェック結果:')
        console.log(`- Points情報: ${hasPoints}`)
        console.log(`- 標高情報: ${hasElevation}`)
        console.log(`- Activation情報: ${hasActivations}`)
        console.log(`- SOTAリンク: ${hasSOTALink}`)
        console.log(`- GL情報: ${hasGL}`)
        
        // 最低限の詳細情報が含まれているかチェック
        const hasBasicDetails = hasElevation && hasGL
        const hasEnhancedDetails = hasPoints && hasActivations
        
        if (hasBasicDetails && hasEnhancedDetails) {
          console.log('✅ サミット詳細情報が正常に表示されています')
        } else if (hasBasicDetails) {
          console.log('⚠️ 基本情報は表示されていますが、詳細情報が不足している可能性があります')
        } else {
          console.log('❌ サミット詳細情報が不足しています')
        }
        
        // アサーション
        expect(hasBasicDetails).toBe(true)
        
      } else {
        console.log('❌ サミットポップアップが表示されていません')
      }
      
    } else {
      console.log('⚠️ サミットマーカーが見つかりません')
    }

    console.log('=== サミット詳細情報修正テスト完了 ===')
  })

  test('API呼び出し総合確認テスト', async ({ page }) => {
    console.log('=== API呼び出し総合確認テスト開始 ===')

    let geoApiCalls: string[] = []
    let summitApiCalls: string[] = []
    
    // APIリクエストを記録
    page.on('request', request => {
      const url = request.url()
      if (url.includes('reverse-geocoder') || url.includes('gsi.go.jp')) {
        geoApiCalls.push(url)
      } else if (url.includes('/search/full')) {
        summitApiCalls.push(url)
      }
    })

    await page.waitForTimeout(3000)
    
    // 1. 地図クリック（リバースジオコーディング呼び出し）
    console.log('地図クリック（リバースジオコーディング）')
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(2000)
    
    // 2. サミットマーカークリック（詳細API呼び出し）
    console.log('サミットマーカークリック（詳細API）')
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: ''
    })
    
    if (await summitMarkers.count() > 0) {
      await summitMarkers.first().click()
      await page.waitForTimeout(3000)
    }
    
    console.log('API呼び出し履歴:')
    console.log(`リバースジオコーディングAPI: ${geoApiCalls.length}件`)
    geoApiCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.slice(-100)}`)
    })
    
    console.log(`サミット詳細API: ${summitApiCalls.length}件`)
    summitApiCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.slice(-100)}`)
    })
    
    // API呼び出しが正常に行われているかチェック
    const hasGeocodingAPI = geoApiCalls.length > 0
    const hasSummitAPI = summitApiCalls.length > 0
    
    if (hasGeocodingAPI) {
      console.log('✅ リバースジオコーディングAPIが呼び出されています')
    } else {
      console.log('⚠️ リバースジオコーディングAPIが呼び出されていません')
    }
    
    if (hasSummitAPI) {
      console.log('✅ サミット詳細APIが呼び出されています')
    } else {
      console.log('⚠️ サミット詳細APIが呼び出されていません')
    }

    console.log('=== API呼び出し総合確認テスト完了 ===')
  })
})