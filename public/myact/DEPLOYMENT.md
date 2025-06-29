# MyACT デプロイメントガイド

## デプロイメント戦略

### 環境構成
```
Production (main) → Vercel Auto Deploy
  ↑
Staging (develop) → Vercel Preview Deploy  
  ↑
Feature Branches → Vercel Branch Deploy
```

## ローカル開発環境

### セットアップ

```bash
# 1. リポジトリクローン
git clone [repository-url]
cd sotalive-vercel/public/myact

# 2. 依存関係インストール
npm install

# 3. 開発サーバー起動
npm run dev
```

### 開発サーバー設定

**Vite設定** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 5173,
    host: true, // ネットワークアクセス許可
    open: true, // ブラウザ自動起動
  },
  preview: {
    port: 4173,
    host: true,
  }
})
```

**アクセスURL**:
- ローカル: `http://localhost:5173`
- ネットワーク: `http://[YOUR-IP]:5173`

### 環境変数

**開発用設定**:
```bash
# .env.local（ローカル開発用）
VITE_API_BASE_URL=https://sotaapp2.sotalive.net/api/v2
VITE_GSI_API_URL=https://mreversegeocoder.gsi.go.jp
VITE_DEM_API_URL=https://cyberjapandata2.gsi.go.jp
```

**本番用設定**:
```bash
# .env.production（本番用）
VITE_API_BASE_URL=https://sotaapp2.sotalive.net/api/v2
VITE_GSI_API_URL=https://mreversegeocoder.gsi.go.jp
VITE_DEM_API_URL=https://cyberjapandata2.gsi.go.jp
```

## ビルドプロセス

### ローカルビルド

```bash
# 1. 型チェック
npm run type-check

# 2. テスト実行
npm run test:run

# 3. 本番ビルド
npm run build

# 4. ビルド結果確認
npm run preview
```

### ビルド設定

**Vite設定**:
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          leaflet: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
        }
      }
    }
  }
})
```

**TypeScript設定**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Vercelデプロイメント

### 自動デプロイ設定

**vercel.json設定**:
```json
{
  "buildCommand": "cd public/myact && npm run build",
  "outputDirectory": "public/myact/dist",
  "installCommand": "cd public/myact && npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/myact/(.*)",
      "destination": "/myact/$1"
    }
  ]
}
```

### デプロイトリガー

**自動デプロイ**:
- `main`ブランチ → 本番環境
- `develop`ブランチ → ステージング環境
- フィーチャーブランチ → プレビュー環境

**手動デプロイ**:
```bash
# Vercel CLI使用
npm install -g vercel
vercel login
vercel --prod  # 本番デプロイ
vercel         # プレビューデプロイ
```

### 環境変数設定

**Vercel Dashboard**で以下を設定:

**本番環境**:
- `VITE_API_BASE_URL`: `https://sotaapp2.sotalive.net/api/v2`
- `NODE_ENV`: `production`

**プレビュー環境**:
- `VITE_API_BASE_URL`: `https://sotaapp2.sotalive.net/api/v2`
- `NODE_ENV`: `development`

## CI/CDパイプライン

### GitHub Actions設定

**ワークフロー** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
    paths: ['public/myact/**']
  pull_request:
    branches: [main]
    paths: ['public/myact/**']

defaults:
  run:
    working-directory: public/myact

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: public/myact/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:run
    
    - name: Build application
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-${{ matrix.node-version }}
        path: public/myact/dist/

  deploy-vercel:
    if: github.ref == 'refs/heads/main'
    needs: test-and-build
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: public/myact
```

### 品質ゲート

**必須チェック項目**:
- [ ] TypeScript型チェック成功
- [ ] 全テストパス
- [ ] ビルド成功
- [ ] カバレッジ閾値クリア（75%以上）
- [ ] Lint警告無し

**デプロイブロック条件**:
- テスト失敗
- ビルドエラー
- 型エラー
- カバレッジ大幅低下

## デプロイフロー

### 機能開発デプロイ

```bash
# 1. フィーチャーブランチ作成
git checkout -b feature/new-alert-system

# 2. 開発・テスト
npm run dev
npm run test
npm run type-check

# 3. コミット・プッシュ
git add .
git commit -m "feat: add new alert system"
git push origin feature/new-alert-system
# → Vercelプレビューデプロイ自動実行

# 4. プルリクエスト作成
# → GitHub Actions CI実行

# 5. レビュー・マージ
# → develop ブランチにマージ
# → ステージング環境デプロイ

# 6. 本番リリース
git checkout main
git merge develop
git push origin main
# → 本番環境デプロイ
```

### ホットフィックスデプロイ

```bash
# 1. 緊急修正ブランチ作成
git checkout main
git checkout -b hotfix/critical-bug-fix

# 2. 修正・テスト
npm run test:run
npm run build

# 3. 直接本番デプロイ
git push origin hotfix/critical-bug-fix
# → CI通過後、手動で本番マージ
```

## モニタリング・ロールバック

### デプロイ監視

**Vercel Analytics**:
- Core Web Vitals
- パフォーマンス指標
- エラー率
- 地域別パフォーマンス

**カスタム監視**:
```typescript
// パフォーマンス監視
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      // レポート送信
      analytics.track('page_load_time', {
        duration: entry.duration,
        url: window.location.href
      })
    }
  }
})
observer.observe({ entryTypes: ['navigation'] })
```

### エラー監視

**エラーバウンダリ**:
```typescript
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーレポート送信
    analytics.track('react_error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }
}
```

### ロールバック手順

**1. Vercel Dashboard経由**:
- Deployments → 前回成功版選択 → Promote to Production

**2. Git経由**:
```bash
# 前回正常コミットに戻す
git revert [bad-commit-hash]
git push origin main
# → 自動デプロイ実行
```

**3. 緊急時**:
```bash
# 強制的に前バージョンに戻す
git reset --hard [last-good-commit]
git push --force origin main
# → 強制デプロイ
```

## パフォーマンス最適化

### バンドル最適化

**Code Splitting**:
```typescript
// 動的インポート
const AlertManager = lazy(() => import('@/components/Alert/AlertManager'))
const POTALogManager = lazy(() => import('@/components/POTA/POTALogManager'))

// 使用時
<Suspense fallback={<Loading />}>
  <AlertManager />
</Suspense>
```

**Tree Shaking**:
```typescript
// 個別インポート
import { Button } from '@mui/material'
// NG: import * as MUI from '@mui/material'

// ユーティリティ最適化
import { debounce } from 'lodash-es'
// NG: import _ from 'lodash'
```

### キャッシュ戦略

**静的アセット**:
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        const info = assetInfo.name.split('.')
        const ext = info[info.length - 1]
        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
          return `assets/images/[name]-[hash][extname]`
        }
        return `assets/[name]-[hash][extname]`
      }
    }
  }
}
```

**API キャッシュ**:
```typescript
// React Query設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 30 * 60 * 1000,   // 30分
      refetchOnWindowFocus: false,
    },
  },
})
```

## セキュリティ

### ビルド時セキュリティ

**依存関係監査**:
```bash
# 脆弱性チェック
npm audit
npm audit fix

# 自動化
npm install --package-lock-only
npm ci --production
```

**環境変数管理**:
```typescript
// 環境変数検証
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_GSI_API_URL',
] as const

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

### ランタイムセキュリティ

**CSP設定**:
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' fonts.googleapis.com;
               font-src 'self' fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://sotaapp2.sotalive.net https://*.gsi.go.jp;">
```

**API キー保護**:
```typescript
// サーバーサイドプロキシ経由でAPI呼び出し
const fetchWithProxy = async (endpoint: string) => {
  return fetch(`/api/proxy${endpoint}`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
}
```

## トラブルシューティング

### よくある問題

**1. ビルド失敗**:
```bash
Error: Cannot resolve module 'leaflet/dist/leaflet.css'
```
解決策:
```typescript
// vite.config.ts
css: {
  preprocessorOptions: {
    css: {
      charset: false
    }
  }
}
```

**2. 環境変数未読み込み**:
```bash
TypeError: Cannot read property 'VITE_API_BASE_URL' of undefined
```
解決策: `.env`ファイル確認、`VITE_`プレフィックス必須

**3. メモリ不足エラー**:
```bash
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
解決策:
```json
// package.json
"scripts": {
  "build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 vite build"
}
```

### デバッグ方法

**ビルド詳細ログ**:
```bash
npm run build -- --debug
```

**Bundle解析**:
```bash
npm install --save-dev rollup-plugin-visualizer
npm run build
# → dist/stats.html で確認
```

**Vercelログ確認**:
```bash
vercel logs [deployment-url]
```

## 継続的改善

### メトリクス追跡

**パフォーマンス指標**:
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s  
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**ビジネス指標**:
- ページ表示成功率: > 99.9%
- API エラー率: < 1%
- ユーザー満足度: > 4.5/5

### 定期メンテナンス

**月次タスク**:
- [ ] 依存関係更新
- [ ] セキュリティ監査
- [ ] パフォーマンス分析
- [ ] ログ分析

**四半期タスク**:
- [ ] アーキテクチャレビュー
- [ ] キャパシティプランニング
- [ ] 災害復旧テスト
- [ ] ユーザビリティテスト