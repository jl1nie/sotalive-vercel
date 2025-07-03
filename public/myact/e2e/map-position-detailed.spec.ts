import { test, expect } from '@playwright/test'

test.describe('地図位置保持詳細テスト', () => {
  test('console.logで地図の位置変化を詳細確認', async ({ page }) => {
    // 地図位置のログを詳細に収集
    const positionLogs: any[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Map size invalidated with position preserved')) {
        try {
          // ログから位置情報を抽出
          const match = text.match(/center: Object, zoom: (\d+(?:\.\d+)?), sidePanelVisible: (\w+)/)
          if (match) {
            positionLogs.push({
              zoom: parseFloat(match[1]),
              sidePanelVisible: match[2] === 'true',
              timestamp: new Date().toISOString()
            })
          }
        } catch (e) {
          console.log('ログパース失敗:', text)
        }
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    console.log('=== パネル開閉操作開始 ===')

    // パネルを閉じる
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    await toggleButton.click()
    await page.waitForTimeout(800)

    // パネルを再度開く
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    await expandButton.click()
    await page.waitForTimeout(800)

    // さらにもう一度開閉
    await toggleButton.click()
    await page.waitForTimeout(800)
    await expandButton.click()
    await page.waitForTimeout(800)

    console.log('=== 収集された位置ログ ===')
    positionLogs.forEach((log, index) => {
      console.log(`${index + 1}. ズーム: ${log.zoom}, パネル表示: ${log.sidePanelVisible}, 時刻: ${log.timestamp}`)
    })

    // 最低限のテスト条件
    expect(positionLogs.length).toBeGreaterThanOrEqual(4) // 2回の開閉で4つのログ

    // ズームレベルが一定であることを確認
    if (positionLogs.length >= 2) {
      const firstZoom = positionLogs[0].zoom
      const allSameZoom = positionLogs.every(log => Math.abs(log.zoom - firstZoom) < 0.1)
      
      if (allSameZoom) {
        console.log(`✅ ズームレベル ${firstZoom} が正常に保持されました`)
      } else {
        console.log('❌ ズームレベルが変化しています')
        positionLogs.forEach((log, i) => console.log(`  ${i}: ${log.zoom}`))
      }
      
      expect(allSameZoom).toBe(true)
    }

    console.log('✅ 地図位置保持テストが正常に完了しました')
  })

  test('複数回の開閉での一貫性確認', async ({ page }) => {
    const invalidationCounts = { open: 0, close: 0 }
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Map size invalidated with position preserved')) {
        if (text.includes('sidePanelVisible: true')) {
          invalidationCounts.open++
        } else if (text.includes('sidePanelVisible: false')) {
          invalidationCounts.close++
        }
      }
    })

    await page.goto('/myact/')
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // 5回の開閉を実行
    const toggleButton = page.locator('button:has(i.oi-chevron-right)')
    const expandButton = page.locator('button:has(i.oi-chevron-left)')
    
    for (let i = 0; i < 5; i++) {
      console.log(`=== 開閉サイクル ${i + 1}/5 ===`)
      
      // 閉じる
      await toggleButton.click()
      await page.waitForTimeout(400)
      
      // 開く
      await expandButton.click()
      await page.waitForTimeout(400)
    }

    console.log('=== 開閉回数統計 ===')
    console.log(`パネル閉じる: ${invalidationCounts.close}回`)
    console.log(`パネル開く: ${invalidationCounts.open}回`)

    // 各操作が5回ずつ実行されていることを確認
    expect(invalidationCounts.close).toBe(5)
    expect(invalidationCounts.open).toBe(5)

    console.log('✅ 複数回開閉での一貫性が確認されました')
  })
})