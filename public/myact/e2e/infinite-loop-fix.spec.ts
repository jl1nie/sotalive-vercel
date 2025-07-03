import { test, expect } from '@playwright/test'

test.describe('無限ループ問題の修正確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/myact/')
    await page.waitForLoadState('networkidle')
    
    // 地図の読み込み完了を待つ
    await page.locator('.leaflet-container').waitFor({ state: 'visible' })
  })

  test('MapDataLoaderとTopoJSONLayerの無限ループが解決されていることを確認', async ({ page }) => {
    // コンソールログを監視
    const mapDataLoaderMessages: string[] = []
    const topoJSONMessages: string[] = []
    const allMessages: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      allMessages.push(text)
      
      if (text.includes('MapDataLoader:')) {
        mapDataLoaderMessages.push(text)
      }
      if (text.includes('TopoJSONLayer:')) {
        topoJSONMessages.push(text)
      }
    })

    console.log('🧪 テスト開始: 無限ループ問題の修正確認')

    // 1. 初期状態で10秒間監視
    console.log('⏱️ 初期状態を10秒間監視中...')
    await page.waitForTimeout(10000)

    // 2. 地図操作を実行
    console.log('🗺️ 地図操作を実行中...')
    const mapContainer = page.locator('.leaflet-container')
    
    // ドラッグ操作
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 300, y: 200 },
      targetPosition: { x: 350, y: 250 }
    })
    await page.waitForTimeout(2000)

    // ズーム操作
    const zoomInBtn = page.locator('.leaflet-control-zoom-in')
    await zoomInBtn.click()
    await page.waitForTimeout(2000)

    // ズームアウト操作
    const zoomOutBtn = page.locator('.leaflet-control-zoom-out')
    await zoomOutBtn.click()
    await page.waitForTimeout(2000)

    // 3. さらに5秒間監視
    console.log('⏱️ 操作後の状態を5秒間監視中...')
    await page.waitForTimeout(5000)

    // 4. ログ分析
    console.log('📊 ログ分析結果:')
    console.log(`総メッセージ数: ${allMessages.length}`)
    console.log(`MapDataLoaderメッセージ数: ${mapDataLoaderMessages.length}`)
    console.log(`TopoJSONLayerメッセージ数: ${topoJSONMessages.length}`)

    // MapDataLoaderの重複チェック
    const apiCallMessages = mapDataLoaderMessages.filter(msg => 
      msg.includes('Loading data for bounds') || 
      msg.includes('Received data')
    )
    console.log(`API呼び出し関連メッセージ: ${apiCallMessages.length}件`)

    // TopoJSONLayerの重複チェック
    const renderingMessages = topoJSONMessages.filter(msg => 
      msg.includes('Rendering GeoJSON layer') ||
      msg.includes('Features count')
    )
    console.log(`TopoJSONレンダリング関連メッセージ: ${renderingMessages.length}件`)

    // 5. 無限ループ検出
    const recentMapDataMessages = mapDataLoaderMessages.slice(-20) // 最近の20件
    const recentTopoMessages = topoJSONMessages.slice(-20) // 最近の20件

    // 同じメッセージが5回以上連続で出現していないか確認
    const isMapDataLooping = hasRepeatingPattern(recentMapDataMessages, 5)
    const isTopoLooping = hasRepeatingPattern(recentTopoMessages, 5)

    console.log('🔍 無限ループ検出結果:')
    console.log(`MapDataLoader無限ループ: ${isMapDataLooping ? '❌ 検出' : '✅ なし'}`)
    console.log(`TopoJSONLayer無限ループ: ${isTopoLooping ? '❌ 検出' : '✅ なし'}`)

    // 6. 成功基準の確認
    // - API呼び出しが適切な回数（地図操作に応じて数回程度）
    // - TopoJSONレンダリングが1-2回程度
    // - 無限ループが検出されない
    
    expect(apiCallMessages.length).toBeLessThan(20) // API呼び出しが20回未満
    expect(renderingMessages.length).toBeLessThan(10) // レンダリングが10回未満
    expect(isMapDataLooping).toBe(false) // MapDataLoaderの無限ループなし
    expect(isTopoLooping).toBe(false) // TopoJSONLayerの無限ループなし

    // 7. 詳細ログ出力（デバッグ用）
    if (apiCallMessages.length > 0) {
      console.log('📋 API呼び出しメッセージ（最初の3件）:')
      apiCallMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`)
      })
    }

    if (renderingMessages.length > 0) {
      console.log('📋 レンダリングメッセージ（最初の3件）:')
      renderingMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`)
      })
    }

    // 8. パフォーマンス確認
    const boundsSkipMessages = mapDataLoaderMessages.filter(msg => 
      msg.includes('Skipping load (same bounds)')
    )
    console.log(`境界重複スキップ: ${boundsSkipMessages.length}件`)

    if (boundsSkipMessages.length > 0) {
      console.log('✅ 重複実行防止機能が正常に動作している')
    }

    console.log('✅ 無限ループ問題修正確認完了')
  })

  test('地図の基本機能が正常に動作することを確認', async ({ page }) => {
    console.log('🧪 テスト開始: 地図基本機能の動作確認')

    // 地図要素の確認
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible()

    // タイルレイヤーの確認
    const tilePane = page.locator('.leaflet-tile-pane')
    await expect(tilePane).toBeVisible()

    // コントロールの確認
    const zoomControl = page.locator('.leaflet-control-zoom')
    await expect(zoomControl).toBeVisible()

    // マーカーの表示確認
    await page.waitForTimeout(3000) // データロード完了を待つ
    
    const interactiveElements = page.locator('.leaflet-interactive')
    const elementCount = await interactiveElements.count()
    
    console.log(`インタラクティブ要素数: ${elementCount}`)
    expect(elementCount).toBeGreaterThan(0)

    console.log('✅ 地図基本機能正常動作確認完了')
  })
})

// ヘルパー関数: 繰り返しパターンの検出
function hasRepeatingPattern(messages: string[], threshold: number = 5): boolean {
  if (messages.length < threshold) return false

  // 最後のメッセージと同じメッセージが閾値以上連続しているかチェック
  const lastMessage = messages[messages.length - 1]
  let consecutiveCount = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] === lastMessage) {
      consecutiveCount++
    } else {
      break
    }
  }

  return consecutiveCount >= threshold
}