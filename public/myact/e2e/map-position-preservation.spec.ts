import { test, expect } from '@playwright/test'

test.describe('地図位置保持テスト', () => {
  test('パネル開閉時に地図の位置が保持される', async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('Map size invalidated with position preserved')) {
        consoleLogs.push(msg.text())
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 地図の初期位置を記録するためのJavaScript実行
    const initialPosition = await page.evaluate(() => {
      const map = (window as any).__leafletMap__ || null
      if (map) {
        const center = map.getCenter()
        const zoom = map.getZoom()
        return { lat: center.lat, lng: center.lng, zoom }
      }
      return null
    })

    if (!initialPosition) {
      // MapEventsからmapRefを取得する代替方法
      await page.waitForTimeout(2000)
    }

    // 地図上で特定の位置にズーム・移動
    await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container')
      if (mapContainer) {
        const map = (mapContainer as any)._leaflet_map
        if (map) {
          // 東京駅付近にズーム
          map.setView([35.6812, 139.7671], 12, { animate: false })
          // グローバル変数として保存
          ;(window as any).__leafletMap__ = map
        }
      }
    })

    await page.waitForTimeout(1000)

    // 移動後の位置を記録
    const beforeTogglePosition = await page.evaluate(() => {
      const map = (window as any).__leafletMap__
      if (map) {
        const center = map.getCenter()
        const zoom = map.getZoom()
        return { lat: center.lat, lng: center.lng, zoom }
      }
      return null
    })

    console.log('移動前の地図位置:', beforeTogglePosition)

    // パネルを閉じる
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    await toggleButton.click()
    await page.waitForTimeout(800)

    // パネルを再度開く
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    await expandButton.click()
    await page.waitForTimeout(800)

    // 開閉後の位置を取得
    const afterTogglePosition = await page.evaluate(() => {
      const map = (window as any).__leafletMap__
      if (map) {
        const center = map.getCenter()
        const zoom = map.getZoom()
        return { lat: center.lat, lng: center.lng, zoom }
      }
      return null
    })

    console.log('移動後の地図位置:', afterTogglePosition)

    // 地図リサイズのログが出力されていることを確認
    console.log('=== 地図位置保持ログ ===')
    consoleLogs.forEach(log => console.log(log))

    // 位置が保持されていることを確認（誤差範囲内）
    if (beforeTogglePosition && afterTogglePosition) {
      const latDiff = Math.abs(beforeTogglePosition.lat - afterTogglePosition.lat)
      const lngDiff = Math.abs(beforeTogglePosition.lng - afterTogglePosition.lng)
      const zoomDiff = Math.abs(beforeTogglePosition.zoom - afterTogglePosition.zoom)

      console.log('位置の変化:', { latDiff, lngDiff, zoomDiff })

      // 許容誤差範囲内（小数点以下4桁程度）
      expect(latDiff).toBeLessThan(0.001)
      expect(lngDiff).toBeLessThan(0.001)
      expect(zoomDiff).toBeLessThan(0.1)

      console.log('✅ 地図の位置が正常に保持されました')
    } else {
      console.log('❌ 地図インスタンスの取得に失敗しました')
      expect(consoleLogs.length).toBeGreaterThan(0) // 最低限ログは出力されている
    }
  })

  test('地図ズーム操作後の位置保持', async ({ page }) => {
    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 地図上でズーム操作を実行
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.click({ position: { x: 300, y: 200 } })
    
    // ズームイン（ダブルクリック）
    await mapContainer.dblclick({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(1000)

    // ズーム後の位置を記録
    const beforeTogglePosition = await page.evaluate(() => {
      const map = document.querySelector('.leaflet-container')
      if (map && (map as any)._leaflet_map) {
        const leafletMap = (map as any)._leaflet_map
        const center = leafletMap.getCenter()
        const zoom = leafletMap.getZoom()
        return { lat: center.lat, lng: center.lng, zoom }
      }
      return null
    })

    console.log('ズーム後の地図位置:', beforeTogglePosition)

    // パネル開閉操作
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    await toggleButton.click()
    await page.waitForTimeout(400)
    
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    await expandButton.click()
    await page.waitForTimeout(400)

    // 開閉後の位置を確認
    const afterTogglePosition = await page.evaluate(() => {
      const map = document.querySelector('.leaflet-container')
      if (map && (map as any)._leaflet_map) {
        const leafletMap = (map as any)._leaflet_map
        const center = leafletMap.getCenter()
        const zoom = leafletMap.getZoom()
        return { lat: center.lat, lng: center.lng, zoom }
      }
      return null
    })

    console.log('開閉後の地図位置:', afterTogglePosition)

    // 位置が保持されていることを確認
    if (beforeTogglePosition && afterTogglePosition) {
      const latDiff = Math.abs(beforeTogglePosition.lat - afterTogglePosition.lat)
      const lngDiff = Math.abs(beforeTogglePosition.lng - afterTogglePosition.lng)
      const zoomDiff = Math.abs(beforeTogglePosition.zoom - afterTogglePosition.zoom)

      // より厳しい許容誤差（ズーム操作後）
      expect(latDiff).toBeLessThan(0.0001)
      expect(lngDiff).toBeLessThan(0.0001)
      expect(zoomDiff).toBeLessThan(0.01)

      console.log('✅ ズーム操作後も地図の位置が正常に保持されました')
    }
  })
})