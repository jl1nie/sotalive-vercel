# sotalive-vercel

[sotalive.net](https://sotalive.net) のフロントエンド（Vercel + Next.js）。

---

## JAFF/POTAアノテーション管理

`jaffpota-annotated-v22.json` は地図上のポリゴンに POTA/JAFF コードと公園名を紐付けるファイル。
**DBが唯一の正**であり、JSONはDBの内容に合わせて手動でパッチする運用。

### patch_jaff.py — 対話式パッチツール

公園統合・廃止など、JSONとDBの間で乖離が生じたときに使う。

#### 前提条件

- [uv](https://docs.astral.sh/uv/) がインストール済み（`pip install uv` または `curl -LsSf https://astral.sh/uv/install.sh | sh`）
- このリポジトリのルートにいること（`jaffpota-annotated-v22.json` への相対パスを参照するため）

#### 実行方法

```bash
# 本番DBに対して実行（デフォルト: https://sotaapp2.fly.dev）
uv run patch_jaff.py

# ローカルサーバーに対して実行（開発・動作確認）
uv run patch_jaff.py --api http://localhost:8080

# ドライラン（JSONは書き換えない。差分の確認のみ）
uv run patch_jaff.py --dry-run
```

#### 動作フロー

1. `public/common/json/jaffpota-annotated-v22.json` を読み込む
2. 全エントリのPOTAコードを `GET /api/v2/pota/parks/{code}` で照合
   - `JA-XXXX` → `JP-XXXX` の正規化が必要なエントリは自動修正（プレフィックス変換のみ）
3. 以下のいずれかに該当するエントリで対話プロンプトを表示：
   - DBに該当コードが存在しない
   - `parkInactive=true`（非表示）
   - wwffCode / parkNameJ がJSONと不一致
4. プロンプトに新しいPOTAコードを入力するか、Enterでスキップ
5. 全確認後、変更内容を表示して `y` で確定 → JSONを上書き保存

#### 操作方法

```
  新しいPOTAコードを入力 (Enterでスキップ、qで終了):
  > JP-2123       ← 正しいコードを入力
  > （Enter）     ← このエントリはスキップ
  > q             ← 中断して終了
```

#### JSONを更新した後

```bash
git diff public/common/json/jaffpota-annotated-v22.json  # 差分確認
git add public/common/json/jaffpota-annotated-v22.json
git commit -m "fix: JAFFアノテーション更新 YYYY-MM-DD"
git push
# → Vercel が自動デプロイ
```

#### DB更新を先に済ませること

JSONパッチの前にDBを正しい状態にしておく。
管理画面（[sotaapp2 admin](https://sotaapp2.fly.dev/admin)）で：
- 廃止公園: `parkInactive` をオン
- 新公園: `wwffCode`（JAFFコード）を設定
- 公園名 (`parkNameJ`) を確認

#### よくある操作例（公園統合）

```
# 例: JP-1432（廃止）と JP-1335（廃止）が JP-2123（新設）に統合された場合
# 1. DB: JP-2123 の wwffCode = 'JAFF-0189' を設定
# 2. DB: JP-1432, JP-1335 の parkInactive = true に設定
# 3. uv run patch_jaff.py --dry-run  で差分を確認
# 4. uv run patch_jaff.py  で JP-2123 を入力して確定
# 5. git commit & push
```
