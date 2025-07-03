import { test, expect } from '@playwright/test'

test.describe('リロード後初回クリック位置問題の詳細検証', () => {
  test('地図初期化状態と座標変換の関係を調査', async ({ page }) => {
    console.log('🔄 ページリロードによる初期化状態調査開始')
    
    // 地図状態監視用の詳細ログ収集
    await page.addInitScript(() => {
      (window as any).mapInitLog = []
      const originalLog = console.log
      console.log = (...args) => {
        const message = args.join(' ')
        if (message.includes('map') || message.includes('Map') || message.includes('Leaflet')) {
          (window as any).mapInitLog.push({
            timestamp: Date.now(),
            message: message
          })
        }
        originalLog.apply(console, args)
      }
    })

    // 新しいページロード（リロード状態再現）
    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // 地図の初期化進行状況を段階的に確認
    const checkMapState = async (phase: string) => {
      const mapState = await page.evaluate(() => {
        const mapContainer = document.querySelector('.leaflet-container') as HTMLElement
        const mapInstance = (window as any).mapRef?.current
        
        if (!mapContainer || !mapInstance) {
          return { phase: 'no-map', error: 'Map not found' }
        }

        try {
          return {
            phase,
            containerSize: {
              width: mapContainer.offsetWidth,
              height: mapContainer.offsetHeight,
              clientWidth: mapContainer.clientWidth,
              clientHeight: mapContainer.clientHeight
            },
            mapMethods: {
              hasGetSize: typeof mapInstance.getSize === 'function',
              hasGetCenter: typeof mapInstance.getCenter === 'function',
              hasGetZoom: typeof mapInstance.getZoom === 'function',
              hasLatLngToContainerPoint: typeof mapInstance.latLngToContainerPoint === 'function'
            },
            mapValues: mapInstance ? {
              size: mapInstance.getSize ? mapInstance.getSize() : null,
              center: mapInstance.getCenter ? mapInstance.getCenter() : null,
              zoom: mapInstance.getZoom ? mapInstance.getZoom() : null,
              bounds: mapInstance.getBounds ? mapInstance.getBounds() : null
            } : null,
            leafletReady: mapInstance && mapInstance._loaded,
            containerReady: mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0
          }
        } catch (error) {
          return { phase, error: error.toString() }
        }
      })
      
      console.log(`📊 地図状態 (${phase}):`, JSON.stringify(mapState, null, 2))
      return mapState
    }

    // フェーズ1: DOM読み込み直後
    const state1 = await checkMapState('dom-loaded')
    await page.waitForTimeout(500)

    // フェーズ2: 短時間待機後
    const state2 = await checkMapState('short-wait')
    await page.waitForTimeout(1000)

    // フェーズ3: 地図安定化待機後
    const state3 = await checkMapState('stabilized')
    
    // 座標変換テスト - 同じ座標での変換結果を比較
    const testCoordinate = { lat: 35.6762, lng: 139.6503 } // 東京駅
    
    const coordinateTest = async (testPhase: string) => {
      return await page.evaluate((coord) => {
        const mapInstance = (window as any).mapRef?.current
        if (!mapInstance || !mapInstance.latLngToContainerPoint) {
          return { error: 'Map or conversion method not available' }
        }
        
        try {
          const containerPoint = mapInstance.latLngToContainerPoint([coord.lat, coord.lng])
          const mapSize = mapInstance.getSize()
          const mapCenter = mapInstance.getCenter()
          const zoom = mapInstance.getZoom()
          
          return {
            testPhase,
            input: coord,
            output: { x: containerPoint.x, y: containerPoint.y },
            mapSize: { x: mapSize.x, y: mapSize.y },
            mapCenter: { lat: mapCenter.lat, lng: mapCenter.lng },
            zoom: zoom,
            timestamp: Date.now()
          }
        } catch (error) {
          return { error: error.toString(), testPhase }
        }
      }, testCoordinate)
    }

    // 各段階での座標変換テスト
    const coord1 = await coordinateTest('initial')
    await page.waitForTimeout(1000)
    const coord2 = await coordinateTest('after-wait')
    await page.waitForTimeout(2000)
    const coord3 = await coordinateTest('after-long-wait')

    console.log('🧮 座標変換結果:')
    console.log('初期状態:', coord1)
    console.log('1秒後:', coord2)
    console.log('3秒後:', coord3)

    // 座標変換の安定性チェック
    if (coord1.output && coord2.output && coord3.output) {
      const deltaX12 = Math.abs(coord1.output.x - coord2.output.x)
      const deltaY12 = Math.abs(coord1.output.y - coord2.output.y)
      const deltaX23 = Math.abs(coord2.output.x - coord3.output.x)
      const deltaY23 = Math.abs(coord2.output.y - coord3.output.y)
      
      console.log(`📏 座標変換安定性:`)
      console.log(`初期→1秒後: ΔX=${deltaX12}, ΔY=${deltaY12}`)
      console.log(`1秒後→3秒後: ΔX=${deltaX23}, ΔY=${deltaY23}`)
      
      // 大きな座標変化がある場合は不安定と判定
      const isUnstable = deltaX12 > 50 || deltaY12 > 50 || deltaX23 > 50 || deltaY23 > 50
      console.log(`座標変換安定性: ${isUnstable ? '❌ 不安定' : '✅ 安定'}`)
    }

    // 実際のクリックテスト - リロード直後の初回クリック
    console.log('🖱️ リロード直後の初回クリック位置テスト')
    
    const mapBounds = await page.locator('.leaflet-container').boundingBox()
    if (mapBounds) {
      const clickX = mapBounds.x + mapBounds.width / 2
      const clickY = mapBounds.y + mapBounds.height / 2
      
      // クリック前の地図状態記録
      const preClickState = await checkMapState('pre-click')
      
      // クリック実行
      await page.mouse.click(clickX, clickY)
      await page.waitForTimeout(2000) // リバースジオコーディング待機
      
      // ポップアップ位置確認
      const popup = page.locator('.leaflet-popup')
      const popupVisible = await popup.isVisible()
      
      if (popupVisible) {
        const popupBounds = await popup.boundingBox()
        const popupCenterX = popupBounds ? popupBounds.x + popupBounds.width / 2 : 0
        const popupCenterY = popupBounds ? popupBounds.y + popupBounds.height / 2 : 0
        
        const distanceX = Math.abs(popupCenterX - clickX)
        const distanceY = Math.abs(popupCenterY - clickY)
        
        console.log(`🎯 初回クリック結果:`)
        console.log(`クリック座標: (${clickX}, ${clickY})`)
        console.log(`ポップアップ中心: (${popupCenterX}, ${popupCenterY})`)
        console.log(`距離: ΔX=${distanceX}, ΔY=${distanceY}`)
        
        // 異常な距離の場合は問題あり
        const isAbnormalPosition = distanceX > 200 || distanceY > 200
        console.log(`初回クリック位置: ${isAbnormalPosition ? '❌ 異常' : '✅ 正常'}`)
        
        // 2回目のクリックテスト（比較用）
        await page.locator('.leaflet-popup-close-button').click()
        await page.waitForTimeout(500)
        
        // 少し違う位置をクリック
        const click2X = clickX + 50
        const click2Y = clickY + 50
        await page.mouse.click(click2X, click2Y)
        await page.waitForTimeout(2000)
        
        const popup2 = page.locator('.leaflet-popup')
        const popup2Visible = await popup2.isVisible()
        
        if (popup2Visible) {
          const popup2Bounds = await popup2.boundingBox()
          const popup2CenterX = popup2Bounds ? popup2Bounds.x + popup2Bounds.width / 2 : 0
          const popup2CenterY = popup2Bounds ? popup2Bounds.y + popup2Bounds.height / 2 : 0
          
          const distance2X = Math.abs(popup2CenterX - click2X)
          const distance2Y = Math.abs(popup2CenterY - click2Y)
          
          console.log(`🎯 2回目クリック結果:`)
          console.log(`クリック座標: (${click2X}, ${click2Y})`)
          console.log(`ポップアップ中心: (${popup2CenterX}, ${popup2CenterY})`)
          console.log(`距離: ΔX=${distance2X}, ΔY=${distance2Y}`)
          
          const isAbnormalPosition2 = distance2X > 200 || distance2Y > 200
          console.log(`2回目クリック位置: ${isAbnormalPosition2 ? '❌ 異常' : '✅ 正常'}`)
          
          // 初回と2回目の比較
          if (isAbnormalPosition && !isAbnormalPosition2) {
            console.log('🚨 確認: 初回のみ位置異常、2回目は正常 → 地図初期化問題の可能性大')
          }
        }
      }
    }

    // 地図初期化ログの確認
    const initLogs = await page.evaluate(() => (window as any).mapInitLog || [])
    console.log('📋 地図初期化ログ:')
    initLogs.forEach((log: any, index: number) => {
      console.log(`${index + 1}. [+${log.timestamp}ms] ${log.message}`)
    })

    console.log('✅ リロード後初回クリック位置問題調査完了')
  })

  test('地図レディ状態の詳細監視', async ({ page }) => {
    // より詳細な地図準備状態の監視
    await page.addInitScript(() => {
      (window as any).mapReadyStates = []
      
      // Leaflet mapの準備状態を監視
      const checkReadyState = () => {
        const mapInstance = (window as any).mapRef?.current
        const container = document.querySelector('.leaflet-container')
        
        const state = {
          timestamp: Date.now(),
          hasMapRef: !!mapInstance,
          hasContainer: !!container,
          containerSize: container ? `${container.clientWidth}x${container.clientHeight}` : 'none',
          mapLoaded: mapInstance?._loaded,
          mapSize: mapInstance ? mapInstance.getSize?.() : null,
          mapReady: mapInstance && mapInstance._loaded && container && container.clientWidth > 0
        }
        
        ;(window as any).mapReadyStates.push(state)
        return state
      }
      
      // 定期的にチェック
      const interval = setInterval(checkReadyState, 100)
      
      // 10秒後に停止
      setTimeout(() => clearInterval(interval), 10000)
    })

    await page.goto('http://localhost:5173/myact/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForTimeout(5000) // 5秒間状態を監視

    const readyStates = await page.evaluate(() => (window as any).mapReadyStates || [])
    
    console.log('📊 地図準備状態推移:')
    readyStates.forEach((state: any, index: number) => {
      const ready = state.mapReady ? '✅' : '❌'
      console.log(`${index + 1}. [${state.timestamp}] ${ready} Ready:${state.mapReady} Loaded:${state.mapLoaded} Size:${state.containerSize}`)
    })

    // 地図が準備完了になるタイミングを特定
    const readyTime = readyStates.find((state: any) => state.mapReady)?.timestamp
    const firstState = readyStates[0]?.timestamp
    
    if (readyTime && firstState) {
      const initializationTime = readyTime - firstState
      console.log(`⏱️ 地図初期化時間: ${initializationTime}ms`)
      
      if (initializationTime > 2000) {
        console.log('⚠️ 地図初期化が遅い（2秒超過）- 初回クリック問題の原因可能性')
      }
    }
  })
})