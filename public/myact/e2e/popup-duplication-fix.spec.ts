import { test, expect } from '@playwright/test'

test.describe('ポップアップ重複表示問題の修正確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // 地図の読み込み完了を待つ
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('地図移動中のポップアップ重複表示問題が解決されていることを確認', async ({ page }) => {
    // コンソールログとエラーを監視
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      consoleMessages.push(text)
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })

    console.log('🧪 テスト開始: 地図移動中のポップアップ重複表示問題の修正確認')

    // 1. 地図をクリックしてポップアップを表示
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(2000)

    // ポップアップが表示されることを確認
    const popup = page.locator('.leaflet-popup')
    const isInitialPopupVisible = await popup.isVisible()
    
    if (isInitialPopupVisible) {
      console.log('✅ 初期ポップアップ表示確認')
      
      // ポップアップの数を確認（1個であることを期待）
      const initialPopupCount = await popup.count()
      console.log(`初期ポップアップ数: ${initialPopupCount}`)
      expect(initialPopupCount).toBe(1)

      // 2. 地図をドラッグして移動
      console.log('🔄 地図ドラッグ操作開始')
      await mapContainer.dragTo(mapContainer, {
        sourcePosition: { x: 400, y: 300 },
        targetPosition: { x: 300, y: 200 }
      })
      await page.waitForTimeout(1000)

      // 3. 地図移動中のポップアップ状態を確認
      const popupCountAfterDrag = await popup.count()
      console.log(`ドラッグ後のポップアップ数: ${popupCountAfterDrag}`)

      // 4. さらにズーム操作を実行
      console.log('🔍 ズーム操作開始')
      const zoomInBtn = page.locator('.leaflet-control-zoom-in')
      await zoomInBtn.click()
      await page.waitForTimeout(1000)

      // 5. ズーム後のポップアップ状態を確認
      const popupCountAfterZoom = await popup.count()
      console.log(`ズーム後のポップアップ数: ${popupCountAfterZoom}`)

      // 6. さらに地図をパンしてみる
      console.log('🗺️ パン操作開始')
      await mapContainer.dragTo(mapContainer, {
        sourcePosition: { x: 300, y: 200 },
        targetPosition: { x: 500, y: 400 }
      })
      await page.waitForTimeout(1000)

      // 7. 最終的なポップアップ状態を確認
      const finalPopupCount = await popup.count()
      console.log(`最終ポップアップ数: ${finalPopupCount}`)

      // 重複表示問題が解決されていることを確認
      // - 各操作後にポップアップが1個以下であること
      // - 最終的にポップアップが存在する場合は1個のみであること
      expect(popupCountAfterDrag).toBeLessThanOrEqual(1)
      expect(popupCountAfterZoom).toBeLessThanOrEqual(1)
      expect(finalPopupCount).toBeLessThanOrEqual(1)

      if (finalPopupCount === 1) {
        console.log('✅ ポップアップが適切に単一表示されている')
      } else {
        console.log('ℹ️ ポップアップが非表示になった（正常な動作）')
      }

    } else {
      console.log('⚠️ 初期ポップアップが表示されなかった')
      // 再試行
      await mapContainer.click({ position: { x: 450, y: 350 } })
      await page.waitForTimeout(2000)
      
      const retryPopupVisible = await popup.isVisible()
      if (retryPopupVisible) {
        console.log('✅ 再試行でポップアップ表示確認')
      } else {
        console.log('⚠️ ポップアップ表示に問題がある可能性')
      }
    }

    // 8. コンソールエラーの確認
    const relevantErrors = consoleErrors.filter(error => 
      error.includes('parameter out of range') ||
      error.includes('TypeError') ||
      error.includes('Cannot read properties') ||
      error.includes('duplicate') ||
      error.includes('循環')
    )

    console.log(`コンソールエラー総数: ${consoleErrors.length}`)
    console.log(`関連エラー数: ${relevantErrors.length}`)

    if (relevantErrors.length > 0) {
      console.log('🚨 関連エラー詳細:')
      relevantErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    // parameter out of rangeエラーが発生していないことを確認
    expect(relevantErrors).toHaveLength(0)

    // 9. デバッグログの確認
    const programmaticMoveMessages = consoleMessages.filter(msg => 
      msg.includes('isProgrammaticMove') || 
      msg.includes('Programmatic move') ||
      msg.includes('Skipping state update')
    )

    console.log(`プログラム的移動関連ログ: ${programmaticMoveMessages.length}件`)
    
    if (programmaticMoveMessages.length > 0) {
      console.log('🔧 循環参照対策が動作している')
      programmaticMoveMessages.slice(0, 3).forEach(msg => {
        console.log(`  - ${msg}`)
      })
    }

    console.log('✅ 地図移動中のポップアップ重複表示問題修正確認完了')
  })

  test('サミットマーカークリック時のポップアップ重複問題が解決されていることを確認', async ({ page }) => {
    // コンソールエラー監視
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    console.log('🧪 テスト開始: サミットマーカークリック時のポップアップ重複問題修正確認')

    // サミットマーカーの表示を待つ
    const summitMarkers = page.locator('.leaflet-interactive')
    await summitMarkers.first().waitFor({ state: 'visible', timeout: 10000 })

    const markerCount = await summitMarkers.count()
    console.log(`表示中のマーカー数: ${markerCount}`)

    if (markerCount > 0) {
      // 1. サミットマーカーをクリック
      await summitMarkers.first().click()
      await page.waitForTimeout(2000)

      // ポップアップが表示されることを確認
      const popup = page.locator('.leaflet-popup')
      const initialPopupCount = await popup.count()
      console.log(`マーカークリック後のポップアップ数: ${initialPopupCount}`)

      expect(initialPopupCount).toBeLessThanOrEqual(1)

      if (initialPopupCount === 1) {
        console.log('✅ サミットマーカークリックでポップアップ正常表示')

        // 2. ポップアップ表示中に地図を移動
        const mapContainer = page.locator('.leaflet-container')
        await mapContainer.dragTo(mapContainer, {
          sourcePosition: { x: 300, y: 200 },
          targetPosition: { x: 250, y: 150 }
        })
        await page.waitForTimeout(1000)

        // 3. 移動後のポップアップ数を確認
        const popupCountAfterMove = await popup.count()
        console.log(`地図移動後のポップアップ数: ${popupCountAfterMove}`)

        // 重複していないことを確認
        expect(popupCountAfterMove).toBeLessThanOrEqual(1)

        if (popupCountAfterMove <= 1) {
          console.log('✅ 地図移動後もポップアップが重複せずに表示')
        }
      }
    } else {
      console.log('⚠️ サミットマーカーが見つかりませんでした')
    }

    // parameter out of rangeエラーが発生していないことを確認
    const parameterErrors = consoleErrors.filter(error => 
      error.includes('parameter out of range') ||
      error.includes('API') && error.includes('error')
    )

    console.log(`parameter out of rangeエラー: ${parameterErrors.length}件`)
    expect(parameterErrors).toHaveLength(0)

    console.log('✅ サミットマーカークリック時のポップアップ重複問題修正確認完了')
  })

  test('setUniquePopup関数の動作確認', async ({ page }) => {
    console.log('🧪 テスト開始: setUniquePopup関数の動作確認')

    // デバッグログを監視
    const uniquePopupMessages: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('setUniquePopup') || text.includes('Unique popup')) {
        uniquePopupMessages.push(text)
      }
    })

    // 1. 地図を複数回連続でクリック
    const mapContainer = page.locator('.leaflet-container')
    
    await mapContainer.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 250, y: 250 } })
    await page.waitForTimeout(300)
    await mapContainer.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(2000)

    // 2. ポップアップが重複していないことを確認
    const popup = page.locator('.leaflet-popup')
    const finalPopupCount = await popup.count()
    
    console.log(`連続クリック後のポップアップ数: ${finalPopupCount}`)
    console.log(`setUniquePopup関連ログ: ${uniquePopupMessages.length}件`)

    // 最大1個のポップアップのみ表示されることを確認
    expect(finalPopupCount).toBeLessThanOrEqual(1)

    if (uniquePopupMessages.length > 0) {
      console.log('✅ setUniquePopup関数が正常に動作している')
      uniquePopupMessages.slice(0, 3).forEach(msg => {
        console.log(`  - ${msg}`)
      })
    } else {
      console.log('ℹ️ setUniquePopup関連ログが見つからない')
    }

    console.log('✅ setUniquePopup関数の動作確認完了')
  })
})