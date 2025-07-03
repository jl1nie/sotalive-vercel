import { test, expect } from '@playwright/test'

test.describe('地図移動動作検証テスト', () => {
  test('地図の座標とズーム変化を詳細監視', async ({ page }) => {
    // 地図関連のすべてのコンソールログを収集
    const mapLogs: string[] = []
    const apiLogs: string[] = []
    const errorLogs: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('LeafletMap') || text.includes('map view') || text.includes('setView')) {
        mapLogs.push(text)
        console.log('🗺️ MAP LOG:', text)
      }
      if (text.includes('API') || text.includes('/search/brief') || text.includes('searchReference')) {
        apiLogs.push(text)
        console.log('🌐 API LOG:', text)
      }
      if (text.includes('error') || text.includes('Error') || text.includes('Failed')) {
        errorLogs.push(text)
        console.log('❌ ERROR LOG:', text)
      }
    })

    // ネットワークリクエストも監視
    const networkRequests: { url: string; response?: any }[] = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/search/brief')) {
        networkRequests.push({ url })
        console.log('📡 REQUEST:', url)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/search/brief')) {
        try {
          const data = await response.json()
          const request = networkRequests.find(r => r.url === url)
          if (request) {
            request.response = data
            const coords = data?.candidates?.[0]
            console.log('📥 RESPONSE:', url, 'Coords:', coords?.lat, coords?.lon)
          }
        } catch (e) {
          console.log('📥 RESPONSE ERROR:', url, e)
        }
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000) // 地図の初期化を待つ

    console.log('=== 初期状態 ===')
    
    // Zustandストアから初期の地図状態を取得
    const initialMapState = await page.evaluate(() => {
      // @ts-ignore
      return window.__ZUSTAND_STORE__ ? window.__ZUSTAND_STORE__.getState() : null
    })
    console.log('Initial Zustand Store:', initialMapState)

    // カードを探してクリック
    const cards = page.locator('[data-testid="alert-spot-card"]')
    const cardCount = await cards.count()
    console.log(`発見されたカード数: ${cardCount}`)

    if (cardCount > 0) {
      const firstCard = cards.first()
      const cardText = await firstCard.textContent()
      const referenceMatch = cardText?.match(/(JA\/[A-Z]+-\d+|JP-\d+)/)
      const reference = referenceMatch ? referenceMatch[1] : 'unknown'
      
      console.log('=== カードクリック前 ===')
      console.log('クリック対象カード:', cardText?.substring(0, 100))
      console.log('リファレンス:', reference)
      
      // カードをクリック
      console.log('🖱️ カードをクリックします...')
      await firstCard.click()
      
      // APIリクエスト完了を待機
      await page.waitForTimeout(3000)
      
      console.log('=== カードクリック後 ===')
      
      // 最終的なストア状態を確認
      const finalMapState = await page.evaluate(() => {
        // @ts-ignore
        return window.__ZUSTAND_STORE__ ? window.__ZUSTAND_STORE__.getState() : null
      })
      
      console.log('Final Zustand Store:', finalMapState)
      
      // ログ分析
      console.log('=== ログ分析 ===')
      console.log(`地図ログ数: ${mapLogs.length}`)
      console.log(`APIログ数: ${apiLogs.length}`)
      console.log(`エラーログ数: ${errorLogs.length}`)
      console.log(`ネットワークリクエスト数: ${networkRequests.length}`)
      
      // 成功した座標取得を確認
      const successfulRequests = networkRequests.filter(r => 
        r.response && r.response.candidates && r.response.candidates[0]?.lat && r.response.candidates[0]?.lon
      )
      
      if (successfulRequests.length > 0) {
        const coords = successfulRequests[0].response.candidates[0]
        console.log('✅ 座標取得成功:', coords.lat, coords.lon)
        
        // 地図更新ログの確認
        const mapUpdateLogs = mapLogs.filter(log => 
          log.includes('Updating map view from store')
        )
        
        if (mapUpdateLogs.length > 0) {
          console.log('✅ 地図更新ログ確認:', mapUpdateLogs[0])
        } else {
          console.log('⚠️ 地図更新ログが見つかりません')
        }
      } else {
        console.log('❌ 座標取得に失敗しました')
      }
      
      // テスト結果の判定
      expect(networkRequests.length).toBeGreaterThan(0)
      
      if (successfulRequests.length > 0) {
        console.log('✅ 地図移動機能のAPIレスポンス部分は動作しています')
      }
    }
  })

  test('JavaScriptで直接地図オブジェクトにアクセス', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000)

    // Leaflet地図オブジェクトに直接アクセスを試行
    const leafletMapInfo = await page.evaluate(() => {
      // @ts-ignore
      const maps = window.L && window.L._leafletMaps
      if (maps) {
        const mapIds = Object.keys(maps)
        if (mapIds.length > 0) {
          const map = maps[mapIds[0]]
          const center = map.getCenter()
          const zoom = map.getZoom()
          return {
            found: true,
            center: { lat: center.lat, lng: center.lng },
            zoom: zoom,
            mapId: mapIds[0]
          }
        }
      }
      return { found: false }
    })

    console.log('Leaflet Map Info:', leafletMapInfo)

    if (leafletMapInfo.found) {
      console.log('✅ Leaflet地図オブジェクトにアクセス成功')
      console.log('初期座標:', leafletMapInfo.center)
      console.log('初期ズーム:', leafletMapInfo.zoom)

      // カードをクリック
      const cards = page.locator('[data-testid="alert-spot-card"]')
      if (await cards.count() > 0) {
        await cards.first().click()
        await page.waitForTimeout(3000)

        // 地図の最終状態を確認
        const finalMapInfo = await page.evaluate(() => {
          // @ts-ignore
          const maps = window.L && window.L._leafletMaps
          if (maps) {
            const mapIds = Object.keys(maps)
            if (mapIds.length > 0) {
              const map = maps[mapIds[0]]
              const center = map.getCenter()
              const zoom = map.getZoom()
              return {
                center: { lat: center.lat, lng: center.lng },
                zoom: zoom
              }
            }
          }
          return null
        })

        console.log('最終座標:', finalMapInfo?.center)
        console.log('最終ズーム:', finalMapInfo?.zoom)

        // 座標が変更されたかチェック
        if (finalMapInfo && leafletMapInfo.found) {
          const latDiff = Math.abs(finalMapInfo.center.lat - leafletMapInfo.center.lat)
          const lngDiff = Math.abs(finalMapInfo.center.lng - leafletMapInfo.center.lng)
          const zoomDiff = Math.abs(finalMapInfo.zoom - leafletMapInfo.zoom)

          if (latDiff > 0.001 || lngDiff > 0.001 || zoomDiff > 0) {
            console.log('✅ 地図の位置/ズームが変更されました!')
            console.log(`座標変化: lat=${latDiff.toFixed(6)}, lng=${lngDiff.toFixed(6)}`)
            console.log(`ズーム変化: ${zoomDiff}`)
          } else {
            console.log('❌ 地図の位置/ズームに変化がありません')
          }
        }
      }
    } else {
      console.log('❌ Leaflet地図オブジェクトにアクセスできません')
    }
  })

  test('MapContainerのpropsと状態変化を監視', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // React DevToolsの代わりにコンポーネントの状態を確認
    const componentInfo = await page.evaluate(() => {
      // MapContainerやLeafletMapコンポーネントの要素を探す
      const mapContainer = document.querySelector('[data-testid="map-container"]')
      return {
        mapContainerExists: !!mapContainer,
        mapContainerClass: mapContainer?.className,
        mapContainerChildren: mapContainer?.children.length
      }
    })

    console.log('MapContainer Info:', componentInfo)

    // カードクリック後の変化を監視
    const cards = page.locator('[data-testid="alert-spot-card"]')
    if (await cards.count() > 0) {
      console.log('カードをクリックして状態変化を監視...')
      await cards.first().click()
      await page.waitForTimeout(3000)

      // 再度コンポーネント状態を確認
      const updatedComponentInfo = await page.evaluate(() => {
        const mapContainer = document.querySelector('[data-testid="map-container"]')
        return {
          mapContainerExists: !!mapContainer,
          mapContainerClass: mapContainer?.className,
          mapContainerChildren: mapContainer?.children.length
        }
      })

      console.log('Updated MapContainer Info:', updatedComponentInfo)
    }

    console.log('✅ コンポーネント状態監視完了')
  })
})