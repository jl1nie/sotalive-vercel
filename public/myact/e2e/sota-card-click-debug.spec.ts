import { test, expect } from '@playwright/test'

test.describe('SOTAサミット カードクリック地図移動デバッグ', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを監視
    page.on('console', msg => {
      console.log(`CONSOLE: ${msg.text()}`)
    })

    // API レスポンスを監視
    page.on('response', response => {
      if (response.url().includes('/api/v2/')) {
        console.log(`API RESPONSE: ${response.status()} ${response.url()}`)
      }
    })

    await page.goto('http://localhost:5173/myact/')
    
    // 地図の読み込み完了を待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(2000)
  })

  test('SOTAサミットカードクリック地図移動機能テスト', async ({ page }) => {
    console.log('=== SOTAサミットカードクリック地図移動テスト開始 ===')

    // 1. サイドパネルの表示確認
    const sidePanel = page.locator('[data-testid="collapsible-side-panel"]').first()
    await expect(sidePanel).toBeVisible()
    console.log('✓ サイドパネル表示確認')

    // 2. カード表示モードに切り替え
    const cardModeToggle = page.locator('button').filter({ hasText: 'カード表示' }).first()
    if (await cardModeToggle.isVisible()) {
      await cardModeToggle.click()
      await page.waitForTimeout(1000)
      console.log('✓ カード表示モードに切り替え')
    }

    // 3. SOTAスポットカードを探す
    const spotCards = page.locator('.MuiCard-root')
    const cardCount = await spotCards.count()
    console.log(`スポットカード数: ${cardCount}`)

    if (cardCount === 0) {
      console.log('⚠️ スポットカードが表示されていません')
      
      // デバッグ: API呼び出し状況確認
      await page.evaluate(() => {
        console.log('DEBUG: Current API data in components...')
      })
      
      // APIデータ取得状況を確認
      await page.waitForTimeout(5000)
      return
    }

    // 4. SOTAプログラムのカードを探す
    let sotaCard = null
    for (let i = 0; i < cardCount; i++) {
      const card = spotCards.nth(i)
      const sotaChip = card.locator('.MuiChip-root').filter({ hasText: 'SOTA' })
      
      if (await sotaChip.count() > 0) {
        sotaCard = card
        console.log(`✓ SOTAカードを発見 (インデックス: ${i})`)
        break
      }
    }

    if (!sotaCard) {
      console.log('⚠️ SOTAスポットカードが見つかりません')
      
      // 利用可能なプログラムを表示
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = spotCards.nth(i)
        const programChip = card.locator('.MuiChip-root').first()
        const programText = await programChip.textContent()
        console.log(`カード ${i}: プログラム = ${programText}`)
      }
      return
    }

    // 5. SOTAカード内のリファレンス名を取得（複数のセレクターを試す）
    let referenceName = null
    
    // Try different selectors to find the reference text
    const selectors = [
      '[data-testid="spot-reference"]',
      '.MuiTypography-body1',
      '.MuiCardContent-root .MuiTypography-root',
      'span:contains("JA/")',
      'p:contains("JA/")'
    ]
    
    for (const selector of selectors) {
      try {
        const element = sotaCard.locator(selector).first()
        if (await element.count() > 0) {
          const text = await element.textContent()
          if (text && text.includes('JA/')) {
            referenceName = text
            console.log(`✓ リファレンス名取得成功 (セレクター: ${selector}): ${referenceName}`)
            break
          }
        }
      } catch (e) {
        console.log(`セレクター "${selector}" 失敗: ${e.message}`)
      }
    }
    
    if (!referenceName) {
      console.log('❌ リファレンス名の取得に失敗しました')
      
      // SOTAカード内のすべてのテキスト要素を出力してデバッグ
      const allText = await sotaCard.allTextContents()
      console.log('SOTAカード内の全テキスト:', allText)
      return
    }

    // 6. 地図の現在位置を記録
    const mapContainer = page.locator('.leaflet-container')
    const initialMapHTML = await mapContainer.innerHTML()
    const initialCenter = await page.evaluate(() => {
      const mapElement = document.querySelector('.leaflet-container') as any
      return mapElement._leaflet_map ? {
        lat: mapElement._leaflet_map.getCenter().lat,
        lng: mapElement._leaflet_map.getCenter().lng,
        zoom: mapElement._leaflet_map.getZoom()
      } : null
    })
    
    console.log('初期地図中心座標:', initialCenter)

    // 7. SOTAカードをクリック
    console.log('SOTAカードをクリック...')
    await sotaCard.click()

    // 8. API呼び出しを監視
    const searchAPICall = page.waitForResponse(response => 
      response.url().includes('/search/brief') && response.url().includes(`name=${encodeURIComponent(referenceName || '')}`)
    )

    let apiResponse
    try {
      apiResponse = await searchAPICall
      console.log(`✓ 検索API呼び出し成功: ${apiResponse.status()} ${apiResponse.url()}`)
      
      const responseData = await apiResponse.json()
      console.log('API レスポンスデータ:', JSON.stringify(responseData, null, 2))
    } catch (error) {
      console.log('❌ 検索API呼び出し失敗:', error)
    }

    // 9. 地図の移動を確認
    await page.waitForTimeout(2000)
    
    const finalCenter = await page.evaluate(() => {
      const mapElement = document.querySelector('.leaflet-container') as any
      return mapElement._leaflet_map ? {
        lat: mapElement._leaflet_map.getCenter().lat,
        lng: mapElement._leaflet_map.getCenter().lng,
        zoom: mapElement._leaflet_map.getZoom()
      } : null
    })
    
    console.log('最終地図中心座標:', finalCenter)

    // 10. 地図移動の確認
    if (initialCenter && finalCenter) {
      const latDiff = Math.abs(initialCenter.lat - finalCenter.lat)
      const lngDiff = Math.abs(initialCenter.lng - finalCenter.lng)
      const zoomChanged = initialCenter.zoom !== finalCenter.zoom

      console.log(`地図移動確認:`)
      console.log(`- 緯度変化: ${latDiff}`)
      console.log(`- 経度変化: ${lngDiff}`)
      console.log(`- ズーム変化: ${initialCenter.zoom} → ${finalCenter.zoom}`)

      if (latDiff > 0.001 || lngDiff > 0.001 || zoomChanged) {
        console.log('✅ 地図移動が正常に動作しました')
      } else {
        console.log('❌ 地図移動が検出されませんでした')
      }
    }

    // 11. エラーログの確認
    const errorLogs = await page.evaluate(() => {
      return (window as any).__errorLogs || []
    })
    
    if (errorLogs.length > 0) {
      console.log('エラーログが検出されました:', errorLogs)
    }

    console.log('=== SOTAサミットカードクリック地図移動テスト完了 ===')
  })

  test('SOTA API 詳細検索テスト', async ({ page }) => {
    console.log('=== SOTA API詳細検索テスト開始 ===')

    // テスト用のSOTAリファレンス
    const testReference = 'JA/KN-001'
    
    // API呼び出しをテスト
    const response = await page.evaluate(async (ref) => {
      try {
        const apiResponse = await fetch(`https://sotaapp2.sotalive.net/api/v2/search/brief?name=${encodeURIComponent(ref)}`)
        const data = await apiResponse.json()
        return {
          status: apiResponse.status,
          data: data,
          success: true
        }
      } catch (error) {
        return {
          error: error.message,
          success: false
        }
      }
    }, testReference)

    console.log('API テスト結果:', JSON.stringify(response, null, 2))

    if (response.success && response.data?.candidates) {
      const candidate = response.data.candidates[0]
      if (candidate?.lat && candidate?.lon) {
        console.log(`✅ API正常: ${testReference} の座標 = (${candidate.lat}, ${candidate.lon})`)
      } else {
        console.log(`❌ API異常: 座標データが不正`)
      }
    } else {
      console.log(`❌ API呼び出し失敗:`, response.error)
    }

    console.log('=== SOTA API詳細検索テスト完了 ===')
  })
})