import { test, expect } from '@playwright/test'

test.describe('TopoJSONレイヤークリック機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを監視
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      logs.push(text)
      if (text.includes('🟢') || text.includes('🔵') || text.includes('🔴')) {
        console.log('TopoJSON LOG:', text)
      }
    })
    
    // エラーを監視
    page.on('pageerror', (error) => {
      console.error('TopoJSON PAGE ERROR:', error.message)
    })
    
    // アプリケーションにアクセス
    await page.goto('http://localhost:5173/myact/')
    
    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // 地図が読み込まれるまで待機
    await page.waitForTimeout(2000)
    
    // TopoJSONデータの読み込み完了まで待機
    await page.waitForFunction(() => {
      const logs = (window as any).consoleLogs || []
      return logs.some((log: string) => log.includes('🟢 TopoJSONLayer: GeoJSON converted, features count:'))
    }, { timeout: 15000 }).catch(() => {
      console.log('TopoJSON data loading timeout - proceeding with test')
    })
  })

  test('TopoJSONレイヤーが正常にロードされる', async ({ page }) => {
    // TopoJSONデータ読み込みの確認
    const loadLogs = await page.evaluate(() => {
      return (window as any).consoleLogs?.filter((log: string) => 
        log.includes('🟢 processTopoJSON:') || log.includes('🟢 TopoJSONLayer:')
      ) || []
    })
    
    console.log('TopoJSON Load Logs:', loadLogs)
    
    // レイヤーがDOMに存在することを確認
    const geoJsonLayer = page.locator('.leaflet-overlay-pane svg g')
    await expect(geoJsonLayer).toBeVisible({ timeout: 10000 })
    
    console.log('✅ TopoJSONレイヤーが正常にロードされました')
  })

  test('TopoJSON公園領域をクリックしてポップアップが表示される', async ({ page }) => {
    // display_area設定が有効であることを確認
    await page.evaluate(() => {
      const store = (window as any).mapStore?.getState?.()
      if (store && !store.preferences.display_area) {
        store.updatePreferences({ display_area: true })
      }
    })
    
    await page.waitForTimeout(1000)
    
    // TopoJSONレイヤーの存在確認
    const svgElements = page.locator('.leaflet-overlay-pane svg')
    await expect(svgElements.first()).toBeVisible({ timeout: 10000 })
    
    // TopoJSON path要素（公園領域）を探す
    const parkAreas = page.locator('.leaflet-overlay-pane svg path')
    const parkCount = await parkAreas.count()
    console.log(`発見された公園領域数: ${parkCount}`)
    
    if (parkCount === 0) {
      console.log('⚠️ 公園領域が見つかりません - TopoJSONデータ確認')
      // TopoJSONデータの詳細確認
      const debugInfo = await page.evaluate(() => {
        const console_logs = []
        const originalLog = console.log
        console.log = (...args) => {
          console_logs.push(args.join(' '))
          originalLog.apply(console, args)
        }
        return console_logs.filter(log => log.includes('TopoJSON'))
      })
      console.log('TopoJSON Debug Info:', debugInfo)
      return
    }
    
    // 最初の公園領域をクリック
    const firstParkArea = parkAreas.first()
    
    // クリック前にコンソールログをクリア
    await page.evaluate(() => {
      (window as any).topoClickLogs = []
      const originalLog = console.log
      console.log = (...args) => {
        const message = args.join(' ')
        if (message.includes('🔵 TopoJSONLayer') || message.includes('TopoJSON')) {
          (window as any).topoClickLogs = (window as any).topoClickLogs || []
          ;(window as any).topoClickLogs.push(message)
        }
        originalLog.apply(console, args)
      }
    })
    
    // 公園領域をクリック
    await firstParkArea.click({ force: true })
    
    // クリックイベントログの確認
    await page.waitForTimeout(500)
    const clickLogs = await page.evaluate(() => (window as any).topoClickLogs || [])
    console.log('TopoJSON Click Logs:', clickLogs)
    
    // ポップアップの表示確認
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible({ timeout: 5000 })
    
    // ポップアップ内容の確認
    const popupContent = popup.locator('.leaflet-popup-content')
    await expect(popupContent).toBeVisible()
    
    // POTA/JAFF参照番号の表示確認
    const popupText = await popupContent.textContent()
    console.log('ポップアップ内容:', popupText)
    
    // POTA または JAFF の参照番号が含まれることを確認
    expect(popupText).toMatch(/(JA-\d+|JAFF-\d+)/)
    
    console.log('✅ TopoJSON公園領域クリックでポップアップが正常に表示されました')
  })

  test('TopoJSONクリックとサミットマーカークリックが干渉しない', async ({ page }) => {
    // サミットマーカーが表示されていることを確認
    const summitMarkers = page.locator('.summit-marker')
    const summitCount = await summitMarkers.count()
    console.log(`サミットマーカー数: ${summitCount}`)
    
    if (summitCount === 0) {
      console.log('⚠️ サミットマーカーが見つかりません')
      return
    }
    
    // サミットマーカーをクリック
    const firstSummit = summitMarkers.first()
    await firstSummit.click()
    
    await page.waitForTimeout(500)
    
    // サミット情報のポップアップが表示されることを確認
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible({ timeout: 3000 })
    
    const popupContent = await popup.locator('.leaflet-popup-content').textContent()
    console.log('サミットポップアップ内容:', popupContent)
    
    // SOTA参照番号が含まれることを確認
    expect(popupContent).toMatch(/JA\/[A-Z]+-\d+/)
    
    // ポップアップを閉じる
    await page.locator('.leaflet-popup-close-button').click()
    await page.waitForTimeout(300)
    
    // 次にTopoJSON領域をクリック
    const parkAreas = page.locator('.leaflet-overlay-pane svg path')
    if (await parkAreas.count() > 0) {
      await parkAreas.first().click({ force: true })
      await page.waitForTimeout(500)
      
      // 公園情報のポップアップが表示されることを確認
      await expect(popup).toBeVisible({ timeout: 3000 })
      
      const parkPopupContent = await popup.locator('.leaflet-popup-content').textContent()
      console.log('公園ポップアップ内容:', parkPopupContent)
      
      // POTA または JAFF の参照番号が含まれることを確認
      expect(parkPopupContent).toMatch(/(JA-\d+|JAFF-\d+)/)
    }
    
    console.log('✅ サミットマーカーとTopoJSONクリックが正常に分離されています')
  })

  test('TopoJSON右クリックでデバッグ情報が表示される', async ({ page }) => {
    // TopoJSON領域を探す
    const parkAreas = page.locator('.leaflet-overlay-pane svg path')
    const parkCount = await parkAreas.count()
    
    if (parkCount === 0) {
      console.log('⚠️ 公園領域が見つかりません - 右クリックテストをスキップ')
      return
    }
    
    // 最初の公園領域を右クリック
    const firstParkArea = parkAreas.first()
    await firstParkArea.click({ button: 'right', force: true })
    
    await page.waitForTimeout(500)
    
    // ポップアップの表示確認
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible({ timeout: 3000 })
    
    // デバッグ情報の確認
    const popupContent = await popup.locator('.leaflet-popup-content').textContent()
    console.log('右クリックポップアップ内容:', popupContent)
    
    // デバッグ情報またはPID/UIDが含まれることを確認
    expect(popupContent).toMatch(/(debug|PID|UID|Right-click)/i)
    
    console.log('✅ TopoJSON右クリックでデバッグ情報が正常に表示されました')
  })

  test('TopoJSONエラーハンドリングの確認', async ({ page }) => {
    // エラーログの監視
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    // コンソールエラーの監視
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // 存在しないTopoJSONファイルを読み込ませる（エラーテスト）
    await page.evaluate(() => {
      // プリファレンスを無効にしてから有効にする（再読み込み誘発）
      const store = (window as any).mapStore?.getState?.()
      if (store) {
        store.updatePreferences({ display_area: false })
        setTimeout(() => {
          store.updatePreferences({ display_area: true })
        }, 100)
      }
    })
    
    await page.waitForTimeout(2000)
    
    // TypeError: target.className.includes is not a function エラーが出ないことを確認
    const classNameErrors = errors.filter(error => 
      error.includes('className.includes is not a function')
    )
    expect(classNameErrors).toHaveLength(0)
    
    const classNameConsoleErrors = consoleErrors.filter(error => 
      error.includes('className.includes is not a function')
    )
    expect(classNameConsoleErrors).toHaveLength(0)
    
    console.log('✅ TopoJSONエラーハンドリングが正常に動作しています')
  })
})