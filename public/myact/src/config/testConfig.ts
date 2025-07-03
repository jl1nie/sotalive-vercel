/**
 * テスト設定ファイル - Test Configuration
 * 
 * このファイルはPlaywrightテスト用の設定を提供します
 * This file provides configurations for Playwright tests
 */

import { testHelpers, updateTestPreferences, getConfigInfo } from './debugConfig'

// Playwrightテスト用設定プロファイル - Playwright Test Configuration Profiles
export const testProfiles = {
  // サミットマーカークリックテスト用
  summitMarkerTest: {
    debugFlags: ['summitMarker', 'leafletMap', 'eventHandling', 'playwrightSupport'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: false,        // POTAマーカーを無効化してテスト簡略化
      jaff_ref: false,        // JAFFマーカーを無効化してテスト簡略化
      popup_permanent: false, // ポップアップは一時表示
      reduce_animation: true, // アニメーション短縮
      simplified_ui: true,    // UI簡略化
    })
  },

  // 地図機能全般テスト用
  mapFunctionalityTest: {
    debugFlags: ['leafletMap', 'eventHandling', 'stateChanges', 'playwrightSupport'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      show_potaactlog: false, // パフォーマンス考慮
      reduce_animation: true,
      fast_api_calls: true,
    })
  },

  // APIテスト用
  apiTest: {
    debugFlags: ['apiCalls', 'stateChanges', 'playwrightSupport', 'testDataLogs'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      fast_api_calls: true,
      simplified_ui: true,
    })
  },

  // パフォーマンステスト用
  performanceTest: {
    debugFlags: ['performance', 'memoryUsage', 'playwrightSupport'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      show_potaactlog: true,  // 全機能でパフォーマンス測定
      reduce_animation: false, // 実際のパフォーマンス測定
      fast_api_calls: false,   // 実際のAPI負荷測定
      simplified_ui: false,    // フル機能でパフォーマンス測定
    })
  },

  // 最小デバッグテスト用（プロダクション類似）
  minimalTest: {
    debugFlags: ['playwrightSupport'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      show_potaactlog: false,
      popup_permanent: false,
      reduce_animation: false,
      fast_api_calls: false,
      simplified_ui: false,
    })
  },

  // TopoJSON位置ずれ修正テスト用
  topoJsonPositionTest: {
    debugFlags: ['leafletMap', 'eventHandling', 'apiCalls', 'rendering', 'playwrightSupport'] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      // display_area: true,        // TopoJSON レイヤー表示を有効化 (disabled - not in TestPreferences)
      show_potaactlog: false,    // パフォーマンス考慮
      popup_permanent: false,    // ポップアップは一時表示
      reduce_animation: true,    // アニメーション短縮
      fast_api_calls: true,      // API高速化
      simplified_ui: true,       // UI簡略化
    })
  },

  // デバッグ全有効テスト用（問題調査）
  fullDebugTest: {
    debugFlags: [
      'summitMarker', 'leafletMap', 'mapDataLoader', 'spotTimeline', 
      'alertManager', 'potaLogManager', 'apiCalls', 'stateChanges', 
      'eventHandling', 'rendering', 'playwrightSupport', 'testDataLogs'
    ] as const,
    preferences: updateTestPreferences({
      sota_ref: true,
      pota_ref: true,
      jaff_ref: true,
      show_potaactlog: true,
      popup_permanent: false,
      reduce_animation: true,
      fast_api_calls: true,
      simplified_ui: false,
    })
  }
}

// テスト設定適用関数 - Test configuration application functions
export const applyTestProfile = (profileName: keyof typeof testProfiles) => {
  const profile = testProfiles[profileName]
  
  // デバッグフラグを設定
  testHelpers.disableAllDebug() // 一旦全て無効化
  testHelpers.enableDebugFor([...profile.debugFlags])
  
  // プリファレンスを適用
  Object.assign(profile.preferences, profile.preferences)
  
  console.log(`🧪 Applied test profile: ${profileName}`)
  console.log('🧪 Current configuration:', getConfigInfo())
  
  return profile
}

// Playwrightテスト用ヘルパー関数 - Playwright test helper functions
export const playwrightHelpers = {
  // テスト開始時の設定
  setupTest: (profileName: keyof typeof testProfiles) => {
    console.log(`🧪 PLAYWRIGHT: Setting up test with profile: ${profileName}`)
    const profile = applyTestProfile(profileName)
    testHelpers.enablePlaywrightMode()
    return profile
  },

  // テスト終了時のクリーンアップ
  teardownTest: () => {
    console.log('🧪 PLAYWRIGHT: Tearing down test')
    testHelpers.disableAllDebug()
  },

  // 特定機能のデバッグ有効化
  enableDebugForFeature: (feature: string) => {
    console.log(`🧪 PLAYWRIGHT: Enabling debug for feature: ${feature}`)
    switch (feature) {
      case 'summit-click':
        testHelpers.enableDebugFor(['summitMarker', 'eventHandling'])
        break
      case 'map-events':
        testHelpers.enableDebugFor(['leafletMap', 'eventHandling'])
        break
      case 'api-calls':
        testHelpers.enableDebugFor(['apiCalls', 'stateChanges'])
        break
      case 'topojson-click':
        testHelpers.enableDebugFor(['leafletMap', 'eventHandling', 'apiCalls'])
        break
      case 'map-coordinate':
        testHelpers.enableDebugFor(['leafletMap'])
        break
      case 'popup-position':
        testHelpers.enableDebugFor(['eventHandling', 'rendering'])
        break
      default:
        console.warn(`🧪 PLAYWRIGHT: Unknown feature: ${feature}`)
    }
  },

  // テストデータ検証用
  verifyTestData: (expectedData: any, actualData: any, testName: string) => {
    console.log(`🧪 TEST-DATA-VERIFY: ${testName}`)
    console.log(`🧪 Expected:`, expectedData)
    console.log(`🧪 Actual:`, actualData)
    
    // 簡単な比較（Playwrightテストでは詳細比較はテスト側で実装）
    const match = JSON.stringify(expectedData) === JSON.stringify(actualData)
    console.log(`🧪 Match: ${match}`)
    return match
  },

  // パフォーマンス測定開始
  startPerformanceMeasurement: (measurementName: string) => {
    console.log(`🧪 PERFORMANCE: Starting measurement: ${measurementName}`)
    performance.mark(`${measurementName}-start`)
  },

  // パフォーマンス測定終了
  endPerformanceMeasurement: (measurementName: string) => {
    performance.mark(`${measurementName}-end`)
    performance.measure(measurementName, `${measurementName}-start`, `${measurementName}-end`)
    
    const measurements = performance.getEntriesByName(measurementName)
    const duration = measurements[measurements.length - 1]?.duration || 0
    
    console.log(`🧪 PERFORMANCE: ${measurementName} took ${duration.toFixed(2)}ms`)
    return duration
  }
}

// ブラウザ環境でのグローバル設定 - Global configuration in browser environment
if (typeof window !== 'undefined') {
  // Playwrightからアクセス可能にする
  (window as any).testConfig = {
    applyTestProfile,
    playwrightHelpers,
    testProfiles,
    getConfigInfo
  }
  
  // URL パラメータによる自動設定
  const urlParams = new URLSearchParams(window.location.search)
  const testProfile = urlParams.get('testProfile') as keyof typeof testProfiles
  
  if (testProfile && testProfiles[testProfile]) {
    console.log(`🧪 Auto-applying test profile from URL: ${testProfile}`)
    applyTestProfile(testProfile)
  }
}

// 設定情報のエクスポート
export const currentConfig = getConfigInfo()

// 使用例コメント
/*
使用例 - Usage Examples:

1. Playwrightテストファイル内で:
```typescript
// テスト開始時
await page.evaluate(() => {
  window.testConfig.applyTestProfile('summitMarkerTest')
})

// 特定機能のデバッグ有効化
await page.evaluate(() => {
  window.testConfig.playwrightHelpers.enableDebugForFeature('summit-click')
})
```

2. URLパラメータで設定:
```
http://localhost:5173/myact/?testProfile=summitMarkerTest
```

3. 開発環境での手動設定:
```typescript
import { applyTestProfile } from '@/config/testConfig'
applyTestProfile('fullDebugTest')
```
*/