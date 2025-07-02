/**
 * 設定一元管理ファイル
 * 
 * このファイルは全ての設定の単一責任ポイントです。
 * ポート番号、URL、タイムアウト値などの設定は必ずここから参照してください。
 */

// 基本環境設定
export const ENVIRONMENT_CONFIG = {
  // 開発サーバー設定
  DEV_SERVER: {
    PORT: 5173,
    HOST: 'localhost',
    BASE_PATH: '/myact/',
    get URL() {
      return `http://${this.HOST}:${this.PORT}${this.BASE_PATH}`
    },
    get BASE_URL() {
      return `http://${this.HOST}:${this.PORT}`
    }
  },

  // Playwrightテスト設定
  PLAYWRIGHT: {
    get SERVER_URL() {
      return ENVIRONMENT_CONFIG.DEV_SERVER.BASE_URL
    },
    get BASE_URL() {
      return ENVIRONMENT_CONFIG.DEV_SERVER.URL
    },
    TIMEOUT: 30000,
    EXPECT_TIMEOUT: 5000,
    NAVIGATION_TIMEOUT: 10000
  },

  // ビルド設定
  BUILD: {
    OUTDIR: 'dist',
    ASSETS_DIR: 'assets',
    get BASE_PATH() {
      return ENVIRONMENT_CONFIG.DEV_SERVER.BASE_PATH
    }
  },

  // API設定
  API: {
    SOTA_APP_BASE: 'https://sotaapp2.sotalive.net/api/v2',
    GSI_DEM_BASE: 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png',
    GSI_GEOCODE_BASE: 'https://msearch.gsi.go.jp/address-search/AddressSearch',
    YAHOO_GEOCODE_BASE: 'https://map.yahooapis.jp/geocode/V1/geoCoder'
  },

  // タイムアウト設定
  TIMEOUTS: {
    HTTP_REQUEST: 5000,
    SERVER_STARTUP: 15000,
    SERVER_CHECK: 3000,
    DEM_PROCESSING: 10000
  }
} as const

// 型安全性のための型定義
export type EnvironmentConfig = typeof ENVIRONMENT_CONFIG

// よく使われる設定のショートカット
export const {
  DEV_SERVER,
  PLAYWRIGHT,
  BUILD,
  API,
  TIMEOUTS
} = ENVIRONMENT_CONFIG

// デバッグ用：設定の確認
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Config Loaded:', ENVIRONMENT_CONFIG)
}