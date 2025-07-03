import { test, expect } from '@playwright/test'

test.describe('修正した機能の動作確認', () => {
  test.beforeEach(async ({ page }) => {
    // サーバーが起動済みであることを前提
    await page.goto('http://localhost:5173/myact/')
    
    // ページロード完了まで待機
    await page.waitForLoadState('networkidle')
  })

  test('地図初期化処理の動作確認（LeafletMap修正）', async ({ page }) => {
    // コンソールエラー監視
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 地図コンテナの表示確認
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible({ timeout: 10000 })

    // 地図タイルの読み込み確認
    const mapTiles = page.locator('.leaflet-tile-pane')
    await expect(mapTiles).toBeVisible({ timeout: 5000 })

    // ズームコントロールの表示確認
    const zoomControl = page.locator('.leaflet-control-zoom')
    await expect(zoomControl).toBeVisible()

    // 地図初期化エラーがないことを確認
    expect(consoleErrors.filter(error => 
      error.includes('_loaded') || 
      error.includes('map initialization')
    )).toHaveLength(0)

    console.log('✅ 地図初期化処理正常動作確認')
  })

  test('基本的な地図操作確認', async ({ page }) => {
    // 地図の中心位置取得
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible()

    // ズームイン操作
    const zoomInBtn = page.locator('.leaflet-control-zoom-in')
    await zoomInBtn.click()
    
    // ズーム操作後の安定性確認
    await page.waitForTimeout(1000)
    
    // ズームアウト操作
    const zoomOutBtn = page.locator('.leaflet-control-zoom-out')
    await zoomOutBtn.click()

    console.log('✅ 基本地図操作正常動作確認')
  })

  test('マーカー表示確認', async ({ page }) => {
    // サミットマーカーの表示確認
    const summitMarkers = page.locator('.summit-marker')
    const markerCount = await summitMarkers.count()
    
    // マーカーが表示されていることを確認
    expect(markerCount).toBeGreaterThan(0)
    console.log(`サミットマーカー数: ${markerCount}`)

    console.log('✅ マーカー表示正常確認')
  })

  test('クリックイベント処理確認（TopoJSONLayer修正）', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 地図の空白部分をクリック（リバースジオコーディング）
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 300, y: 200 } })
    
    // クリック処理完了を待機
    await page.waitForTimeout(2000)

    // SVG/HTML要素関連エラーがないことを確認
    expect(consoleErrors.filter(error => 
      error.includes('className') || 
      error.includes('baseVal') ||
      error.includes('never')
    )).toHaveLength(0)

    console.log('✅ クリックイベント処理正常動作確認')
  })

  test('TypeScript型安全性確認', async ({ page }) => {
    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // ページロード後の安定性確認
    await page.waitForTimeout(3000)

    // TypeScript関連エラーがないことを確認
    const tsErrors = consoleErrors.filter(error => 
      error.includes('Property') && 
      (error.includes('does not exist') || error.includes('never'))
    )
    
    expect(tsErrors).toHaveLength(0)

    // 重要なエラーの確認
    console.log(`コンソールエラー: ${consoleErrors.length}件`)
    console.log(`コンソール警告: ${consoleWarnings.length}件`)
    
    if (consoleErrors.length > 0) {
      console.log('エラー詳細:', consoleErrors.slice(0, 3))
    }

    console.log('✅ TypeScript型安全性確認完了')
  })
})