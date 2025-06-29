# MyACT - React版

SOTA（Summits on the Air）、POTA（Parks on the Air）、WWFF（World Wide Flora and Fauna）のアクティビティロギングとマッピングアプリケーション。

## 概要

MyACTは、アマチュア無線のアワードプログラムであるSOTA、POTA、WWFFをサポートするWebアプリケーションです。バニラJavaScriptからReact + TypeScriptにリファクタリングされ、現代的なWeb技術を使用して構築されています。

## 主な機能

- **インタラクティブ地図表示**: React Leafletを使用した地図上でのSOTAサミット、POTA公園の表示
- **リアルタイムスポット情報**: タイムライン表示とカード表示の切り替え可能
- **運用アラート管理**: 事前運用宣言と管理システム
- **POTAログ管理**: ファイルアップロード、共有、統計表示
- **GPS位置取得**: 現在位置の表示と追跡
- **地理情報統合**: 国土地理院API、DEM標高データ、リバースジオコーダ
- **APRS軌跡表示**: アマチュア無線局の位置追跡

## 技術スタック

### フロントエンド
- **React 19** - UIライブラリ
- **TypeScript** - 静的型付け
- **Vite** - ビルドツール
- **React Leaflet** - 地図表示
- **Material-UI** - UIコンポーネント
- **Recharts** - データ可視化
- **Zustand** - 状態管理
- **React Query** - サーバー状態管理

### テスト
- **Vitest** - テストランナー
- **Testing Library** - コンポーネントテスト
- **jsdom** - DOM環境

### API統合
- **SOTA App API v2** - SOTA/POTAデータ
- **国土地理院API** - DEM、逆ジオコーダ
- **GSI API** - 地理情報サービス

## セットアップ

### 必要条件
- Node.js 18.x以上
- npm 8.x以上

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run preview
```

### テスト

```bash
# テスト実行
npm run test

# テスト実行（ワンショット）
npm run test:run

# カバレッジ付きテスト
npm run test:coverage

# テストUI
npm run test:ui
```

### 型チェック

```bash
npm run type-check
```

## プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
│   ├── Alert/          # アラート管理
│   ├── Charts/         # データ可視化
│   ├── Layout/         # レイアウト
│   ├── Map/            # 地図コンポーネント
│   ├── Markers/        # マーカー
│   ├── POTA/           # POTAログ管理
│   └── SpotCard/       # スポット表示
├── hooks/              # カスタムフック
├── services/           # API通信
├── stores/             # 状態管理
├── test/               # テスト設定・ユーティリティ
└── types/              # TypeScript型定義
```

## 主要コンポーネント

### AlertManager
運用予定の事前宣言と管理システム
- 日時別グループ表示
- 編集・削除機能
- Material-UI DateTimePickerでの日時入力

### SpotCardView
スポット情報の表示切り替え
- タイムライン表示とカード表示
- 時刻による自動スクロール
- アラート情報との連携

### POTALogManager
POTAログファイルの管理
- ファイルアップロード・ダウンロード
- ログ共有・インポート機能
- 統計情報表示

### LeafletMap
React Leafletベースの地図コンポーネント
- SSR対応の動的インポート
- SOTAサミット、POTA公園マーカー
- TopoJSON自然公園レイヤー
- GPS位置取得・表示

## 状態管理

### Zustandストア
- グローバル状態管理
- localStorage連携での設定永続化
- Cookie互換性維持

### React Query
- API通信のキャッシュ・エラーハンドリング
- リアルタイムデータ更新
- オフライン対応

## API統合

### SOTA App API v2
```typescript
// サミット検索
const { data: summits } = useSearchSummits({
  lat: 35.6762,
  lon: 139.6503,
  dist: 10
})

// スポット情報取得
const { data: spots } = useActivationSpots({
  pat_ref: "^(JA|JP-)",
  hours_ago: 12
})
```

### 地理情報API
```typescript
// リバースジオコーダ
const { data: geocoding } = useReverseGeocoding({
  lat: 35.6762,
  lng: 139.6503
})

// 標高データ
const { data: elevation } = useElevation({
  lat: 35.6762,
  lng: 139.6503
})
```

## 新機能

### 🆕 アラート機能
運用予定の事前宣言システム
- 日時指定での運用予定登録
- プログラム別（SOTA/POTA/WWFF）管理
- スポット情報との連携表示

### 🆕 カード表示
スポット情報の詳細表示
- タイムライン代替のカード形式
- 時刻による自動スクロール
- リアルタイム更新対応

### 🆕 POTAログ管理
ログファイルの包括的管理
- ADIF形式ファイルのアップロード
- 共有キーによるログ共有
- Activator/Hunter別管理

## デプロイメント

### Vercel
```bash
# 本番デプロイ
vercel --prod
```

### GitHub Actions
- 自動テスト実行
- ビルド検証
- カバレッジレポート

## 制約事項

- **SSR不可**: React Leafletの制約によりサーバーサイドレンダリング不可
- **バックエンド変更禁止**: `/api/`ディレクトリは変更不可
- **ブラウザ要件**: ES2020+対応ブラウザが必要

## ライセンス

ISC

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## サポート

問題や質問がある場合は、GitHubのIssuesページで報告してください。