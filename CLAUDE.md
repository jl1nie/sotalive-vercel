# CLAUDE.md

このファイルは、このリポジトリでコードを作業する際のClaude Code（claude.ai/code）に対するガイダンスを提供します。

## 🎯 現在の作業状況
**最終更新**: 2025年7月2日 状況検証・矛盾修正
**現在の状態**: 🚨 開発継続中（重要な問題が発見され修正が必要）
**プロジェクト段階**: React リファクタリング90%完了、重要な修正作業が必要

### 📊 プロジェクト実際の状況
- 🔄 **React リファクタリング**: 90%完了（TypeScriptエラー2件要修正）
- 🔄 **主要機能実装**: 95%完了（基本機能は動作、細部要修正）
- ❌ **ビルド状態**: TypeScriptエラーによりビルド失敗中
- 🔄 **テストスイート**: 126件実装、81%成功率（24件失敗要修正）

### 🚨 緊急修正が必要な問題
1. **TypeScriptコンパイルエラー2件**: ビルド阻害
2. **DEMサービステスト**: タイムアウトエラー多数
3. **React Hookテスト**: act() wrapper警告
4. **大量の未コミット変更**: 30+ファイル変更状態

## 🔄 現在作業中
### 新原則適用・プロセス再検証（2025年7月2日開始）
- **Step 1**: 設定一元管理システム実装（environment.ts作成）
- **Step 2**: TypeScriptエラー段階的修正（LeafletMap.tsx→TopoJSONLayer.tsx）
- **Step 3**: Git変更状態整理（56ファイル分類・コミット）
- **進捗**: 環境検証完了、設定不整合発見、修正準備完了

### 🔍 検証で発見した問題
- ⚠️ **設定分散**: ポート5173が複数ファイルに散在
- ❌ **TypeScriptエラー**: 2件（LeafletMap.tsx, TopoJSONLayer.tsx）
- ⚠️ **Git状態**: 56ファイル変更（整理要）

## ⏳ 未来の作業予定（ユーザー指示待ち）
1. 新機能開発の要望確認
2. 既存機能の改善要望確認
3. パフォーマンス最適化の必要性確認

---

## 📋 プロジェクト概要

### プロジェクト範囲
**public/myactサイトのReactリファクタリングプロジェクト**
- バニラJavaScript → React + TypeScript + React Leaflet への完全移行
- SOTA/WWFF/POTAアクティビティロギングインターフェース

### 技術制約
- **React Leaflet**: クライアントサイドレンダリング
- **TypeScript**: 静的型付け開発
- **Vercel**: 静的サイト構築
- **バックエンド除外**: `/api/` ディレクトリは変更禁止

---

## ✅ 完了済み機能（最新が上）

### 🎯 2025年7月1日 - 緊急修正作業完了
- **サミットマーカークリック問題**: 根本解決完了
  - parameter out of rangeエラー: 100%解消
  - ドラッグモード問題: 100%解消
  - 2重ポップアップ: 100%解消
  - 関連ファイル: `LeafletMap.tsx`, `SummitMarker.tsx`

### 🎯 2025年6月29日 - React リファクタリング完了
- **バニラJSコンポーネントReact移行**: 100%完了
  - `useReverseGeocoder.ts` Hook実装
  - `DEMService.ts` サービス実装
  - `ActivationZone.tsx` コンポーネント実装
  - `ReferenceSearch.tsx` コンポーネント実装
- **包括的テストスイート**: 96件実装、86.5%成功率
- **ドキュメント整備**: TESTING.md作成

### 🎯 主要機能実装完了
#### フェーズ1-4: 基盤構築〜高度機能（全完了）
- **プロジェクト基盤**: Vite + React + TypeScript環境
- **コア地図機能**: React Leaflet統合、マーカー表示
- **API統合**: SOTA App API v2、国土地理院API
- **高度機能**: アラート機能、スポットカード表示、POTAログ管理

---

## 🏗️ 実装済みアーキテクチャ

### コンポーネント構造
```
src/
├── components/
│   ├── Map/              # 地図関連（LeafletMap.tsx他）
│   ├── Markers/          # マーカー（SummitMarker.tsx他）
│   ├── Alert/            # アラート機能（AlertManager.tsx）
│   ├── SpotCard/         # スポット表示（SpotCardList.tsx他）
│   ├── POTA/             # POTAログ管理
│   └── UI/               # 共通UI（ReferenceSearch.tsx他）
├── hooks/                # カスタムフック（useSOTAAPI.ts他）
├── services/             # API通信（api.ts, dem.ts他）
├── stores/               # 状態管理（mapStore.ts）
└── types/                # TypeScript型定義
```

### 技術スタック
- **React 19.1.0** + TypeScript
- **React Leaflet 5.0.0** + Leaflet 1.9.4
- **Material-UI 7.1.2** (UI コンポーネント)
- **React Query 5.81.5** (API状態管理)
- **Zustand 5.0.6** (グローバル状態管理)
- **Vite 7.0.0** (ビルドツール)

---

## 🧪 テスト環境

### テスト構成
- **ユニットテスト**: 96件実装済み（Vitest）
- **E2Eテスト**: 50+件のPlaywright テスト
- **カバレッジ**: ライン80%以上目標

### テスト実行方法
```bash
# 開発サーバー起動
cd public/myact
npm run dev  # http://localhost:5173

# テスト実行
npm run test           # ウォッチモード
npm run test:run       # ワンショット
npm run test:coverage  # カバレッジ付き

# E2Eテスト
npx playwright test
```

---

## 🔧 開発・運用ガイド

### 開発コマンド
```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check
```

### サーバー制御（スクリプト利用）
```bash
./server-control.sh start    # サーバー起動
./server-control.sh status   # 状況確認
./server-control.sh restart  # 再起動
./server-control.sh stop     # 停止
```

### トラブルシューティング
```bash
# プロセス強制終了
pkill -f "vite"

# ポート占有確認・解放
lsof -ti:5173 | xargs kill

# 完全クリーンアップ
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 アーカイブ（詳細な過去記録）

### 実装フェーズ詳細
<details>
<summary>フェーズ1: プロジェクト基盤構築（完了）</summary>

- Vite + React + TypeScript環境構築完了
- ESLint/Prettier設定完了
- 依存関係選定・導入完了
- プロジェクト構造作成完了
</details>

<details>
<summary>フェーズ2: コア地図機能の移行（完了）</summary>

- React LeafletでのMapContainer実装完了
- SSR対応の動的インポート実装完了
- SOTAサミット、POTA公園マーカー表示完了
- GPS位置取得・表示機能完了
- TopoJSON自然公園レイヤー表示完了
</details>

<details>
<summary>フェーズ3: API統合とデータ管理（完了）</summary>

- SOTA App API v2完全統合完了
- React Query導入でキャッシュ・エラーハンドリング完了
- 国土地理院API（DEM、リバースジオコーダ）統合完了
- Zustandグローバル状態管理完了
- Cookie同期機能・設定管理完了
</details>

<details>
<summary>フェーズ4: 高度な機能実装（完了）</summary>

#### 新機能実装完了
- **アラート機能**: 運用予定事前宣言システム
- **スポットカード表示**: タイムライン代替の詳細表示
- **POTAログ管理**: ファイル管理・共有機能

#### リファクタリング完了
- **useReverseGeocoder Hook**: GSI/Yahoo! API統合
- **DEM Service**: Canvas/PNG画像処理
- **ActivationZone Component**: SOTA山頂25m範囲表示
- **ReferenceSearch Component**: Material-UI Autocomplete検索
</details>

### 過去の問題解決記録
<details>
<summary>2025年7月1日 - 緊急修正詳細</summary>

#### 解決した問題
1. **parameter out of rangeエラー**: APIパラメータ問題
2. **ドラッグモード継続問題**: イベントハンドリング問題
3. **2重ポップアップ**: イベント分離問題

#### 解決策
- API呼び出し完全削除: `handleSummitClick`簡素化
- 基本データ優先: summitの基本データのみでポップアップ表示
- イベント分離強化: 地図クリックとマーカークリックの完全分離
</details>

---

## 🚀 今後の拡張可能性

### 未実装機能（優先度順）
1. **EdgeMarker実装**: 地図境界外マーカー矢印表示
2. **RegionFill完全実装**: 領域塗りつぶし処理完全版
3. **パフォーマンス最適化**: 仮想化、コード分割、メモ化
4. **アクセシビリティ対応**: WAI-ARIA準拠、キーボード操作
5. **外部サービス連携**: Mackerel監視、Windy、パドルエミュレータ

### 既存サイト概要
MyACTはSummit On The Air (SOTA)、Parks On The Air (POTA)というアマチュア無線のアワードプログラムを支援するWebサービスです。

**主要機能**:
- 地図上にSOTAサミット、POTA公園の位置を表示
- GPS位置情報表示
- アクティベーション支援ツール
- リアルタイムスポット情報表示
- POTA公園アクティベーション履歴管理
- 位置情報からの地域コード検索
- 地磁気情報表示

---

## 📖 参考情報

### 従来機能の参照基準
**重要**: 実装方針に迷った場合は `./legacy/index.html` を参照
- API エンドポイントの正確なパス確認
- JavaScript関数の実装詳細確認
- HTML要素のID、クラス名の確認

### 開発原則
- **バックエンド変更禁止**: `/api/`ディレクトリは一切変更しない
- **TypeScript優先**: 型安全性を最優先
- **既存資産活用**: 既存データ・CSS・画像の継続使用
- **レスポンシブ対応**: モバイルファースト設計

### 制約事項
- **SSR不可**: React Leafletの制約
- **Vercel環境**: 既存のVercel設定を維持
- **他サイト除外**: myqth、logconvは対象外

---

**💡 このファイルは作業状況に応じて「現在の作業状況」セクションを必ず更新してください**