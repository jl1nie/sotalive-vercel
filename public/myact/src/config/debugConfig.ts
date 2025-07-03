/**
 * 中央集約デバッグ・設定管理システム
 * Centralized Debug Flag and Preference Management System
 * 
 * このファイルはDEBUGフラグ、テスト用設定、本番設定を一括管理します
 * This file provides centralized management for DEBUG flags, test preferences, and production preferences
 */

// 環境判定
export const isTest = typeof window !== 'undefined' && window.location.search.includes('test=true')
export const isPlaywright = typeof window !== 'undefined' && (window as any).playwright !== undefined
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

// デバッグフラグ設定 - Debug Flag Configuration
export interface DebugFlags {
  // コンポーネントレベルデバッグ
  summitMarker: boolean
  leafletMap: boolean
  mapDataLoader: boolean
  spotTimeline: boolean
  alertManager: boolean
  potaLogManager: boolean
  
  // 機能レベルデバッグ
  apiCalls: boolean
  stateChanges: boolean
  eventHandling: boolean
  rendering: boolean
  
  // パフォーマンスデバッグ
  performance: boolean
  memoryUsage: boolean
  
  // テスト支援
  playwrightSupport: boolean
  testDataLogs: boolean
}

// テスト用デバッグフラグ - Test Debug Flags
const TEST_DEBUG_FLAGS: DebugFlags = {
  summitMarker: true,      // サミットマーカーのクリック検証用
  leafletMap: true,        // 地図イベントの詳細ログ
  mapDataLoader: false,    // データロード過程は簡略化
  spotTimeline: false,     // スポットタイムラインは簡略化
  alertManager: false,     // アラート管理は簡略化
  potaLogManager: false,   // POTAログ管理は簡略化
  
  apiCalls: true,          // API呼び出しの詳細監視
  stateChanges: true,      // 状態変化の監視
  eventHandling: true,     // イベント処理の監視
  rendering: false,        // レンダリングは簡略化
  
  performance: false,      // パフォーマンス監視は無効
  memoryUsage: false,      // メモリ使用量監視は無効
  
  playwrightSupport: true, // Playwright用の特別ログ
  testDataLogs: true,      // テストデータの詳細ログ
}

// 本番用デバッグフラグ - Production Debug Flags
const PRODUCTION_DEBUG_FLAGS: DebugFlags = {
  summitMarker: false,
  leafletMap: false,
  mapDataLoader: false,
  spotTimeline: false,
  alertManager: false,
  potaLogManager: false,
  
  apiCalls: false,
  stateChanges: false,
  eventHandling: false,
  rendering: false,
  
  performance: false,
  memoryUsage: false,
  
  playwrightSupport: false,
  testDataLogs: false,
}

// 開発用デバッグフラグ - Development Debug Flags
const DEVELOPMENT_DEBUG_FLAGS: DebugFlags = {
  summitMarker: false,     // 通常は無効（必要時のみ有効化）
  leafletMap: false,       // 通常は無効
  mapDataLoader: false,    // 通常は無効
  spotTimeline: false,     // 通常は無効
  alertManager: false,     // 通常は無効
  potaLogManager: false,   // 通常は無効
  
  apiCalls: false,         // API問題調査時のみ有効化
  stateChanges: false,     // 状態管理問題調査時のみ有効化
  eventHandling: false,    // イベント問題調査時のみ有効化
  rendering: false,        // レンダリング問題調査時のみ有効化
  
  performance: false,      // パフォーマンス調査時のみ有効化
  memoryUsage: false,      // メモリ問題調査時のみ有効化
  
  playwrightSupport: false,
  testDataLogs: false,
}

// 現在のデバッグフラグを決定 - Determine current debug flags
export const DEBUG_FLAGS: DebugFlags = (() => {
  if (isTest || isPlaywright) {
    return TEST_DEBUG_FLAGS
  } else if (isDevelopment) {
    return DEVELOPMENT_DEBUG_FLAGS
  } else {
    return PRODUCTION_DEBUG_FLAGS
  }
})()

// デバッグログ出力関数 - Debug logging functions
export const debugLog = {
  summitMarker: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.summitMarker) {
      console.log(`🔴 SummitMarker: ${message}`, ...args)
    }
  },
  
  leafletMap: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.leafletMap) {
      console.log(`🗺️ LeafletMap: ${message}`, ...args)
    }
  },
  
  mapDataLoader: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.mapDataLoader) {
      console.log(`📊 MapDataLoader: ${message}`, ...args)
    }
  },
  
  spotTimeline: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.spotTimeline) {
      console.log(`📈 SpotTimeline: ${message}`, ...args)
    }
  },
  
  alertManager: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.alertManager) {
      console.log(`🚨 AlertManager: ${message}`, ...args)
    }
  },
  
  potaLogManager: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.potaLogManager) {
      console.log(`📋 POTALogManager: ${message}`, ...args)
    }
  },
  
  api: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.apiCalls) {
      console.log(`🌐 API: ${message}`, ...args)
    }
  },
  
  state: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.stateChanges) {
      console.log(`🔄 State: ${message}`, ...args)
    }
  },
  
  event: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.eventHandling) {
      console.log(`⚡ Event: ${message}`, ...args)
    }
  },
  
  render: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.rendering) {
      console.log(`🎨 Render: ${message}`, ...args)
    }
  },
  
  performance: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.performance) {
      console.log(`⚡ Performance: ${message}`, ...args)
    }
  },
  
  memory: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.memoryUsage) {
      console.log(`💾 Memory: ${message}`, ...args)
    }
  },
  
  playwright: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.playwrightSupport) {
      console.log(`🧪 PLAYWRIGHT: ${message}`, ...args)
    }
  },
  
  testData: (message: string, ...args: any[]) => {
    if (DEBUG_FLAGS.testDataLogs) {
      console.log(`🧪 TEST-DATA: ${message}`, ...args)
    }
  }
}

// プリファレンス設定 - Preference Configuration
export interface TestPreferences {
  // 表示設定
  sota_ref: boolean
  pota_ref: boolean
  jaff_ref: boolean
  show_potaactlog: boolean
  popup_permanent: boolean
  
  // 地図設定
  link_googlemap: boolean
  display_mapcode: boolean
  
  // 機能設定
  enable_emulation: boolean
  enable_alerts: boolean
  
  // テスト用設定
  reduce_animation: boolean
  fast_api_calls: boolean
  simplified_ui: boolean
}

// テスト用プリファレンス - Test Preferences
const TEST_PREFERENCES: TestPreferences = {
  // 全機能を有効化してテスト
  sota_ref: true,
  pota_ref: true,
  jaff_ref: true,
  show_potaactlog: true,
  popup_permanent: false,       // ポップアップは一時表示（テストで検証しやすい）
  
  // 地図設定
  link_googlemap: false,        // GSI地図を優先（テスト安定性）
  display_mapcode: true,
  
  // 機能設定
  enable_emulation: false,      // エミュレーション機能は無効（テスト複雑化回避）
  enable_alerts: true,
  
  // テスト最適化
  reduce_animation: true,       // アニメーション時間短縮
  fast_api_calls: true,         // API呼び出し間隔短縮
  simplified_ui: true,          // UI簡略化
}

// 本番用プリファレンス - Production Preferences
const PRODUCTION_PREFERENCES: TestPreferences = {
  // ユーザー設定に依存（デフォルト値）
  sota_ref: true,
  pota_ref: true,
  jaff_ref: true,
  show_potaactlog: false,       // パフォーマンス考慮でデフォルト無効
  popup_permanent: false,
  
  // 地図設定
  link_googlemap: false,        // GSI地図を優先
  display_mapcode: false,       // デフォルト無効
  
  // 機能設定
  enable_emulation: false,      // デフォルト無効
  enable_alerts: true,
  
  // 本番最適化
  reduce_animation: false,      // 通常アニメーション
  fast_api_calls: false,        // 通常API間隔
  simplified_ui: false,         // フル機能UI
}

// 開発用プリファレンス - Development Preferences
const DEVELOPMENT_PREFERENCES: TestPreferences = {
  // 開発者向け設定
  sota_ref: true,
  pota_ref: true,
  jaff_ref: true,
  show_potaactlog: true,        // 開発時は全機能確認
  popup_permanent: false,
  
  // 地図設定
  link_googlemap: false,
  display_mapcode: true,        // 開発時は詳細情報表示
  
  // 機能設定
  enable_emulation: true,       // 開発時は全機能有効
  enable_alerts: true,
  
  // 開発最適化
  reduce_animation: false,      // 実際のUX確認
  fast_api_calls: true,         // 開発効率向上
  simplified_ui: false,         // フル機能で開発
}

// 現在のプリファレンスを決定 - Determine current preferences
export const TEST_PREFERENCES_CONFIG: TestPreferences = (() => {
  if (isTest || isPlaywright) {
    return TEST_PREFERENCES
  } else if (isDevelopment) {
    return DEVELOPMENT_PREFERENCES
  } else {
    return PRODUCTION_PREFERENCES
  }
})()

// プリファレンス更新関数 - Preference update functions
export const updateTestPreferences = (overrides: Partial<TestPreferences>): TestPreferences => {
  return {
    ...TEST_PREFERENCES_CONFIG,
    ...overrides
  }
}

// 設定情報表示 - Configuration info display
export const getConfigInfo = () => {
  return {
    environment: {
      isTest,
      isPlaywright,
      isDevelopment,
      isProduction
    },
    debugFlags: DEBUG_FLAGS,
    preferences: TEST_PREFERENCES_CONFIG
  }
}

// テスト用ヘルパー - Test helpers
export const testHelpers = {
  // 特定コンポーネントのデバッグを有効化
  enableDebugFor: (components: (keyof DebugFlags)[]) => {
    components.forEach(component => {
      (DEBUG_FLAGS as any)[component] = true
    })
  },
  
  // 全デバッグを無効化
  disableAllDebug: () => {
    Object.keys(DEBUG_FLAGS).forEach(key => {
      (DEBUG_FLAGS as any)[key] = false
    })
  },
  
  // プリファレンス一時変更
  withPreferences: <T>(overrides: Partial<TestPreferences>, fn: () => T): T => {
    const original = { ...TEST_PREFERENCES_CONFIG }
    Object.assign(TEST_PREFERENCES_CONFIG, overrides)
    try {
      return fn()
    } finally {
      Object.assign(TEST_PREFERENCES_CONFIG, original)
    }
  },
  
  // Playwright用特別設定
  enablePlaywrightMode: () => {
    debugLog.playwright('Playwright mode enabled')
    testHelpers.enableDebugFor(['summitMarker', 'leafletMap', 'eventHandling', 'playwrightSupport'])
  }
}

// 初期化時の設定ログ出力
if (DEBUG_FLAGS.testDataLogs || DEBUG_FLAGS.playwrightSupport) {
  console.log('🧪 Debug Configuration Loaded:', getConfigInfo())
}