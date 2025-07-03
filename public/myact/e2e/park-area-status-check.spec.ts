import { test, expect } from '@playwright/test'

test.describe('公園領域表示状況の確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // 地図の読み込み完了を待つ
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('現在の公園領域表示状況を確認', async ({ page }) => {
    // コンソールログを監視
    const topoJSONMessages: string[] = []
    const networkRequests: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('TopoJSON') || text.includes('GeoJSON') || text.includes('features')) {
        topoJSONMessages.push(text)
      }
    })

    page.on('request', request => {
      const url = request.url()
      if (url.includes('.json') && (url.includes('jaff') || url.includes('pota') || url.includes('topojson'))) {
        networkRequests.push(`REQUEST: ${url}`)
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('.json') && (url.includes('jaff') || url.includes('pota') || url.includes('topojson'))) {
        networkRequests.push(`RESPONSE: ${response.status()} ${url}`)
      }
    })

    console.log('🧪 テスト開始: 公園領域表示状況の確認')

    // 1. 初期状態で5秒間監視
    await page.waitForTimeout(5000)

    // 2. GeoJSONレイヤーの存在確認
    const geoJsonLayers = page.locator('.leaflet-overlay-pane svg')
    const geoJsonCount = await geoJsonLayers.count()
    
    console.log(`📊 結果分析:`)
    console.log(`GeoJSON SVGレイヤー数: ${geoJsonCount}`)
    console.log(`TopoJSON関連ログ: ${topoJSONMessages.length}件`)
    console.log(`ネットワークリクエスト: ${networkRequests.length}件`)

    // 3. TopoJSONログの詳細
    if (topoJSONMessages.length > 0) {
      console.log('📋 TopoJSON関連ログ:')
      topoJSONMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`)
      })
    }

    // 4. ネットワークリクエストの詳細
    if (networkRequests.length > 0) {
      console.log('📋 ネットワークリクエスト:')
      networkRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req}`)
      })
    }

    // 5. 設定状況の確認
    await page.evaluate(() => {
      if ((window as any).useMapStore) {
        const state = (window as any).useMapStore.getState()
        console.log('🔧 設定状況:', {
          display_area: state.preferences.display_area,
          pota_ref: state.preferences.pota_ref,
          jaff_ref: state.preferences.jaff_ref
        })
      }
    })

    // 6. パス状況の確認
    const commonJsonPath = await page.evaluate(async () => {
      try {
        const response = await fetch('/common/json/jaffpota-annotated-v22.json')
        return `${response.status} - ${response.statusText}`
      } catch (error) {
        return `ERROR: ${error}`
      }
    })

    const currentJsonPath = await page.evaluate(async () => {
      try {
        const response = await fetch('json/jaffpota-annotated-v22.json')
        return `${response.status} - ${response.statusText}`
      } catch (error) {
        return `ERROR: ${error}`
      }
    })

    console.log('📁 ファイルパス確認:')
    console.log(`  /common/json/jaffpota-annotated-v22.json: ${commonJsonPath}`)
    console.log(`  json/jaffpota-annotated-v22.json: ${currentJsonPath}`)

    // 7. 公園領域表示の実際の状況判定
    let status = ''
    if (geoJsonCount > 0) {
      status = '✅ 公園領域が表示されている'
    } else if (topoJSONMessages.some(msg => msg.includes('Loading TopoJSON'))) {
      status = '⏳ TopoJSONロード試行中だが表示されていない'
    } else if (topoJSONMessages.some(msg => msg.includes('preference disabled'))) {
      status = '⚙️ display_area設定が無効'
    } else {
      status = '❌ 公園領域が表示されていない'
    }

    console.log(`🎯 判定結果: ${status}`)

    // 8. 修正が必要かどうかの判定
    const needsFix = geoJsonCount === 0 && topoJSONMessages.some(msg => 
      msg.includes('Failed to load') || msg.includes('404') || msg.includes('ERROR')
    )

    if (needsFix) {
      console.log('🔧 修正が必要: TopoJSONファイルの読み込みエラー')
      
      // エラーメッセージの抽出
      const errorMessages = topoJSONMessages.filter(msg => 
        msg.includes('Failed') || msg.includes('ERROR') || msg.includes('🔴')
      )
      
      if (errorMessages.length > 0) {
        console.log('🚨 エラー詳細:')
        errorMessages.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`)
        })
      }
    } else if (geoJsonCount > 0) {
      console.log('✅ 公園領域表示は正常に動作している')
    }

    console.log('✅ 公園領域表示状況確認完了')
  })

  test('公園領域クリック機能の状況確認', async ({ page }) => {
    console.log('🧪 テスト開始: 公園領域クリック機能の状況確認')

    // SVGレイヤーが存在するか確認
    await page.waitForTimeout(3000)
    const svgLayers = page.locator('.leaflet-overlay-pane svg')
    const svgCount = await svgLayers.count()

    if (svgCount > 0) {
      console.log(`✅ SVGレイヤーが${svgCount}個見つかった`)
      
      // SVG内のパス要素（公園領域）を確認
      const paths = page.locator('.leaflet-overlay-pane svg path')
      const pathCount = await paths.count()
      
      console.log(`🎯 公園領域パス数: ${pathCount}`)
      
      if (pathCount > 0) {
        // 最初のパス要素をクリックしてみる
        console.log('🖱️ 公園領域クリックテスト実行中...')
        
        try {
          await paths.first().click()
          await page.waitForTimeout(1000)
          
          // ポップアップが表示されるか確認
          const popup = page.locator('.leaflet-popup')
          const popupVisible = await popup.isVisible()
          
          if (popupVisible) {
            const popupContent = await popup.textContent()
            console.log(`✅ 公園領域クリック成功 - ポップアップ内容: ${popupContent?.substring(0, 50)}...`)
          } else {
            console.log('⚠️ 公園領域クリック後にポップアップが表示されない')
          }
        } catch (error) {
          console.log(`❌ 公園領域クリックエラー: ${error}`)
        }
      }
    } else {
      console.log('❌ SVGレイヤーが見つからない - 公園領域が表示されていない')
    }

    console.log('✅ 公園領域クリック機能状況確認完了')
  })
})