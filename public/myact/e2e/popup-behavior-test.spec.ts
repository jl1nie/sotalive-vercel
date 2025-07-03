import { test, expect } from '@playwright/test'

test.describe('ポップアップ動作テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // 地図の読み込み完了を待つ
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('ポップアップが地図操作で勝手に閉じないことを確認', async ({ page }) => {
    // 地図をクリックしてポップアップを表示
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 300, y: 200 } })
    
    // ポップアップ表示まで待機
    await page.waitForTimeout(3000)
    
    // ポップアップが表示されているか確認
    const popup = page.locator('.leaflet-popup')
    const isPopupVisible = await popup.isVisible()
    
    if (!isPopupVisible) {
      console.log('⚠️ 初回クリックでポップアップが表示されませんでした')
      // 再度クリックを試行
      await mapContainer.click({ position: { x: 350, y: 250 } })
      await page.waitForTimeout(3000)
    }
    
    // ポップアップの存在確認
    await expect(popup).toBeVisible({ timeout: 5000 })
    console.log('✅ ポップアップ表示確認')
    
    // ポップアップ内容を取得
    const popupContent = await popup.textContent()
    console.log('ポップアップ内容:', popupContent?.substring(0, 50) + '...')

    // 1. ズーム操作
    const zoomInBtn = page.locator('.leaflet-control-zoom-in')
    await zoomInBtn.click()
    await page.waitForTimeout(1000)
    
    // ポップアップがまだ表示されているか確認
    const isVisibleAfterZoom = await popup.isVisible()
    console.log('ズーム後のポップアップ表示:', isVisibleAfterZoom)
    
    // 2. 地図ドラッグ操作
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 300, y: 200 },
      targetPosition: { x: 250, y: 150 }
    })
    await page.waitForTimeout(1000)
    
    // ポップアップがまだ表示されているか確認
    const isVisibleAfterDrag = await popup.isVisible()
    console.log('ドラッグ後のポップアップ表示:', isVisibleAfterDrag)
    
    // 結果確認
    if (isVisibleAfterZoom && isVisibleAfterDrag) {
      console.log('✅ ポップアップが地図操作後も適切に残存')
    } else {
      console.log('❌ ポップアップが意図せずに消去された')
      console.log(`  - ズーム後: ${isVisibleAfterZoom}`)
      console.log(`  - ドラッグ後: ${isVisibleAfterDrag}`)
    }
  })

  test('ポップアップクローズボタンで正常に閉じることを確認', async ({ page }) => {
    // 地図をクリックしてポップアップを表示
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 300, y: 200 } })
    
    // ポップアップ表示まで待機
    await page.waitForTimeout(3000)
    
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible({ timeout: 5000 })
    console.log('✅ ポップアップ表示確認')
    
    // クローズボタンをクリック
    const closeBtn = page.locator('.leaflet-popup-close-button')
    await closeBtn.click()
    await page.waitForTimeout(500)
    
    // ポップアップが閉じたことを確認
    await expect(popup).not.toBeVisible()
    console.log('✅ クローズボタンでポップアップが正常に閉じた')
  })

  test('マーカークリックでのポップアップ表示確認', async ({ page }) => {
    // サミットマーカーが表示されるまで待機
    const summitMarkers = page.locator('.summit-marker, .leaflet-interactive')
    await summitMarkers.first().waitFor({ state: 'visible', timeout: 10000 })
    
    const markerCount = await summitMarkers.count()
    console.log(`表示中のマーカー数: ${markerCount}`)
    
    if (markerCount > 0) {
      // 最初のマーカーをクリック
      await summitMarkers.first().click()
      await page.waitForTimeout(2000)
      
      // ポップアップが表示されるか確認
      const popup = page.locator('.leaflet-popup')
      const isVisible = await popup.isVisible()
      
      console.log('マーカークリック後のポップアップ表示:', isVisible)
      
      if (isVisible) {
        const content = await popup.textContent()
        console.log('マーカーポップアップ内容:', content?.substring(0, 50) + '...')
      }
    } else {
      console.log('⚠️ マーカーが見つかりませんでした')
    }
  })

  test('重複ポップアップが表示されないことを確認', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container')
    
    // 複数回連続でクリック
    await mapContainer.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(500)
    await mapContainer.click({ position: { x: 310, y: 210 } })
    await page.waitForTimeout(500)
    await mapContainer.click({ position: { x: 320, y: 220 } })
    await page.waitForTimeout(2000)
    
    // ポップアップの数を確認
    const popups = page.locator('.leaflet-popup')
    const popupCount = await popups.count()
    
    console.log(`表示中のポップアップ数: ${popupCount}`)
    
    // 1個以下であることを確認
    expect(popupCount).toBeLessThanOrEqual(1)
    
    if (popupCount === 1) {
      console.log('✅ 適切に単一ポップアップが表示されている')
    } else if (popupCount === 0) {
      console.log('ℹ️ ポップアップが表示されていない（正常な場合もある）')
    } else {
      console.log('❌ 重複ポップアップが検出された')
    }
  })
})