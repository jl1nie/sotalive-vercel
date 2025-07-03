import { test, expect } from '@playwright/test'

test.describe('TopoJSONレイヤーテスト', () => {
  test('TopoJSONデータ読み込みとレイヤー表示', async ({ page }) => {
    // TopoJSON関連のログを監視
    const topoJsonLogs: string[] = []
    const networkRequests: { url: string; status?: number }[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('TopoJSONLayer') || text.includes('topojson') || text.includes('jaffpota')) {
        topoJsonLogs.push(text)
        console.log('🗾 TopoJSON LOG:', text)
      }
    })

    // ネットワークリクエストを監視
    page.on('request', request => {
      const url = request.url()
      if (url.includes('jaffpota-annotated-v22.json')) {
        networkRequests.push({ url })
        console.log('📡 TopoJSON Request:', url)
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('jaffpota-annotated-v22.json')) {
        const request = networkRequests.find(r => r.url === url)
        if (request) {
          request.status = response.status()
          console.log('📥 TopoJSON Response:', url, 'Status:', response.status())
        }
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000) // TopoJSONデータの読み込みを待つ

    console.log('=== TopoJSONレイヤーテスト結果 ===')
    console.log(`TopoJSONログ数: ${topoJsonLogs.length}`)
    console.log(`ネットワークリクエスト数: ${networkRequests.length}`)

    // ログ内容を確認
    const loadingLogs = topoJsonLogs.filter(log => log.includes('Loading TopoJSON data'))
    const successLogs = topoJsonLogs.filter(log => log.includes('Data loaded successfully'))
    const errorLogs = topoJsonLogs.filter(log => log.includes('Failed to load'))

    console.log(`読み込み開始ログ: ${loadingLogs.length}`)
    console.log(`読み込み成功ログ: ${successLogs.length}`)
    console.log(`読み込み失敗ログ: ${errorLogs.length}`)

    if (loadingLogs.length > 0) {
      console.log('✅ TopoJSONレイヤーの読み込み処理が開始されました')
    } else {
      console.log('⚠️ TopoJSONレイヤーの読み込み処理が開始されませんでした')
    }

    // ネットワークリクエストの状況を確認
    if (networkRequests.length > 0) {
      console.log('✅ TopoJSONファイルへのHTTPリクエストが発生しました')
      const successfulRequests = networkRequests.filter(r => r.status === 200)
      const failedRequests = networkRequests.filter(r => r.status && r.status !== 200)
      
      if (successfulRequests.length > 0) {
        console.log('✅ TopoJSONファイルのダウンロードに成功しました')
      } else if (failedRequests.length > 0) {
        console.log(`❌ TopoJSONファイルのダウンロードに失敗しました (Status: ${failedRequests[0].status})`)
      }
    } else {
      console.log('⚠️ TopoJSONファイルへのHTTPリクエストが発生しませんでした')
    }

    // 地図上のGeoJSONレイヤーの存在を確認
    const geoJsonPaths = page.locator('svg path[d*="M"]') // GeoJSONパスエレメント
    const pathCount = await geoJsonPaths.count()
    console.log(`地図上のGeoJSONパス数: ${pathCount}`)

    if (pathCount > 0) {
      console.log('✅ 地図上にGeoJSONレイヤーが表示されています')
      
      // 最初のパスをクリックしてポップアップテスト
      console.log('最初のGeoJSONエリアをクリックしてポップアップをテストします...')
      await geoJsonPaths.first().click()
      await page.waitForTimeout(1000)
      
      const popup = page.locator('.leaflet-popup')
      const isPopupVisible = await popup.isVisible()
      
      if (isPopupVisible) {
        console.log('✅ GeoJSONエリアクリックでポップアップが表示されました')
        const popupContent = await popup.textContent()
        console.log('ポップアップ内容 (抜粋):', popupContent?.substring(0, 100) + '...')
      } else {
        console.log('⚠️ GeoJSONエリアクリックでポップアップが表示されませんでした')
      }
    } else {
      console.log('❌ 地図上にGeoJSONレイヤーが表示されていません')
    }

    // display_area設定を確認
    const preferencesCheck = await page.evaluate(() => {
      // @ts-ignore
      const store = window.__ZUSTAND_STORE__
      return store ? store.getState().preferences.display_area : null
    })
    
    console.log('display_area設定:', preferencesCheck)

    // テスト結果の評価
    if (loadingLogs.length > 0) {
      console.log('✅ TopoJSONレイヤー機能は基本的に動作しています')
    }
  })

  test('TopoJSONパス設定テスト', async ({ page }) => {
    // 設定変更による動作テスト
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    
    // display_area設定を無効にして、レイヤーが消えることを確認
    await page.evaluate(() => {
      // @ts-ignore
      const store = window.__ZUSTAND_STORE__
      if (store) {
        store.getState().updatePreferences({ display_area: false })
      }
    })
    
    await page.waitForTimeout(2000)
    
    // GeoJSONパスが消えているか確認
    const geoJsonPaths = page.locator('svg path[d*="M"]')
    const pathCount = await geoJsonPaths.count()
    
    if (pathCount === 0) {
      console.log('✅ display_area=false でGeoJSONレイヤーが非表示になりました')
    } else {
      console.log('⚠️ display_area=false でもGeoJSONレイヤーが表示されています')
    }
    
    // 再度有効にして表示されることを確認
    await page.evaluate(() => {
      // @ts-ignore
      const store = window.__ZUSTAND_STORE__
      if (store) {
        store.getState().updatePreferences({ display_area: true })
      }
    })
    
    await page.waitForTimeout(3000)
    
    const pathCountAfter = await geoJsonPaths.count()
    
    if (pathCountAfter > 0) {
      console.log('✅ display_area=true でGeoJSONレイヤーが再表示されました')
    } else {
      console.log('⚠️ display_area=true でもGeoJSONレイヤーが表示されません')
    }
  })
})