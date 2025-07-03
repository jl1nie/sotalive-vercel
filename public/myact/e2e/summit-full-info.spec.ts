import { test, expect } from '@playwright/test'

test.describe('サミットマーカー詳細情報表示確認', () => {
  test.beforeEach(async ({ page }) => {
    // ネットワークリクエストを監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/full') || url.includes('/search/brief')) {
        console.log(`[API REQUEST] ${request.method()} ${url}`)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/search/full') || url.includes('/search/brief')) {
        const status = response.status()
        console.log(`[API RESPONSE] ${status} ${url}`)
        if (status === 200) {
          try {
            const data = await response.json()
            console.log(`[API DATA] Response data:`, JSON.stringify(data, null, 2).slice(0, 500))
          } catch (e) {
            console.log(`[API DATA] Could not parse JSON response`)
          }
        }
      }
    })
    
    await page.goto('http://localhost:5174/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(3000)
  })

  test('サミットマーカークリック時の詳細情報取得確認', async ({ page }) => {
    console.log('=== サミット詳細情報取得テスト開始 ===')

    // 5秒待機してマーカー読み込み完了
    await page.waitForTimeout(5000)
    
    // サミットマーカーを検索
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: '' // CircleMarkerを対象
    })
    
    const markerCount = await summitMarkers.count()
    console.log(`サミットマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // 1. サミットマーカークリック
      console.log('サミットマーカークリック実行')
      const firstMarker = summitMarkers.first()
      await firstMarker.click()
      
      // 2. ポップアップ表示確認
      await page.waitForTimeout(500) // 基本ポップアップ表示待機
      const basicPopup = await page.locator('.leaflet-popup').count()
      console.log(`基本ポップアップ表示: ${basicPopup}`)
      
      // 3. 詳細情報取得待機（API呼び出し）
      await page.waitForTimeout(2000) // full API呼び出し待機
      
      // 4. ポップアップ内容確認
      const popup = page.locator('.leaflet-popup-content')
      if (await popup.count() > 0) {
        const content = await popup.textContent()
        console.log('ポップアップ内容（詳細）:')
        console.log(content?.slice(0, 500))
        
        // 詳細情報の有無確認
        const hasActivationCount = content?.includes('Activations:')
        const hasPoints = content?.includes('pts')
        const hasElevation = content?.includes('標高:')
        const hasCityInfo = content?.includes('GL:')
        const hasLinks = content?.includes('summits.sota.org.uk')
        
        console.log('詳細情報チェック:')
        console.log(`- Activation情報: ${hasActivationCount}`)
        console.log(`- Points情報: ${hasPoints}`)
        console.log(`- 標高情報: ${hasElevation}`)
        console.log(`- GL情報: ${hasCityInfo}`)
        console.log(`- SOTAリンク: ${hasLinks}`)
        
        // 従来レベルの詳細情報が含まれているかチェック
        const hasDetailedInfo = hasPoints && hasElevation && hasCityInfo
        
        if (hasDetailedInfo) {
          console.log('✅ 詳細情報が正常に表示されています')
        } else {
          console.log('⚠️ 詳細情報が不足している可能性があります')
        }
        
        // アサーション
        expect(hasPoints).toBe(true)
        expect(hasElevation).toBe(true)
        expect(hasCityInfo).toBe(true)
        
      } else {
        console.log('❌ ポップアップが表示されていません')
      }
      
    } else {
      console.log('⚠️ サミットマーカーが見つかりません')
    }

    console.log('=== サミット詳細情報取得テスト完了 ===')
  })

  test('API呼び出し順序確認テスト', async ({ page }) => {
    console.log('=== API呼び出し順序確認テスト開始 ===')

    let apiCalls: string[] = []
    
    // APIリクエストを記録
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/')) {
        const endpoint = url.includes('/search/full') ? 'FULL' : 
                        url.includes('/search/brief') ? 'BRIEF' : 'OTHER'
        const params = new URL(url).searchParams
        const name = params.get('name')
        apiCalls.push(`${endpoint}: ${name}`)
        console.log(`[API] ${endpoint} search for: ${name}`)
      }
    })

    await page.waitForTimeout(3000)
    
    // サミットマーカークリック
    const summitMarkers = page.locator('.leaflet-interactive').filter({
      hasText: ''
    })
    
    if (await summitMarkers.count() > 0) {
      await summitMarkers.first().click()
      
      // API呼び出し完了を待機
      await page.waitForTimeout(3000)
      
      console.log('API呼び出し履歴:')
      apiCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call}`)
      })
      
      // FULL APIが呼ばれていることを確認
      const hasFullCall = apiCalls.some(call => call.startsWith('FULL:'))
      
      if (hasFullCall) {
        console.log('✅ FULL APIが正常に呼び出されています')
      } else {
        console.log('❌ FULL APIが呼び出されていません')
      }
      
      expect(hasFullCall).toBe(true)
    }

    console.log('=== API呼び出し順序確認テスト完了 ===')
  })
})