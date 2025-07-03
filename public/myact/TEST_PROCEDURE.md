# MyACT テスト実行手順

このドキュメントは、MyACTアプリケーションのテスト実行における標準手順を定義します。

## 必須前提条件

- 作業ディレクトリ: `/home/minoru/src/sotalive-vercel/public/myact/`
- Node.js環境が正常に動作していること
- Playwrightがインストールされていること

## 標準テスト実行手順

### 1. サーバー停止

```bash
# 既存のVite/npmプロセスを確認
ps aux | grep -E "(vite|npm)" | grep -v grep

# プロセスが存在する場合は停止（個別にPIDを指定して終了）
# まずPIDを取得
PIDS=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep | awk '{print $2}')

# PIDが存在する場合は順次終了
if [ -n "$PIDS" ]; then
    echo "終了するプロセス: $PIDS"
    for pid in $PIDS; do
        kill -TERM $pid 2>/dev/null || true
    done
    sleep 3
fi

# 強制終了が必要な場合
REMAINING=$(ps aux | grep -E "(vite|npm)" | grep -v grep | awk '{print $2}')
if [ -n "$REMAINING" ]; then
    echo "強制終了: $REMAINING"
    for pid in $REMAINING; do
        kill -9 $pid 2>/dev/null || true
    done
fi

# 停止確認（何も表示されなければOK）
ps aux | grep -E "(vite|npm)" | grep -v grep
```

### 2. サーバー起動

```bash
# myact直下でサーバー起動
cd /home/minoru/src/sotalive-vercel/public/myact/
npm run dev
```

**期待される出力:**
```
> myact@1.0.0 dev
> vite

  VITE v7.0.0  ready in XXXms

  ➜  Local:   http://localhost:5173/myact/
  ➜  Network: use --host to expose
```

### 3. サーバー起動確認

```bash
# HTTPステータス確認（200が期待値）
curl -s -w "%{http_code}" http://localhost:5173/myact/ -o /dev/null

# HTMLコンテンツ確認
curl -s http://localhost:5173/myact/ | grep -E "(React|地図)" | head -3
```

### 4. テスト実行

サーバーが正常に起動していることを確認してから、以下のコマンドでテストを実行:

```bash
# 基本UI表示テスト
npx playwright test e2e/basic-ui-test.spec.ts --timeout=45000 --reporter=line

# フィルター動作テスト
npx playwright test e2e/simple-filter-test.spec.ts --timeout=60000 --reporter=line

# マーカーアセットテスト
npx playwright test e2e/marker-assets-test.spec.ts --timeout=45000 --reporter=line
```

## トラブルシューティング

### サーバー起動失敗

```bash
# ポート競合の場合
lsof -ti:5173 | xargs kill -9

# 依存関係の問題
npm install

# キャッシュクリア
rm -rf node_modules/.vite
npm run dev
```

### テスト失敗

```bash
# スクリーンショット付きテスト実行
npx playwright test --debug

# ヘッドレスモード無効でテスト
npx playwright test --headed
```

## テスト実行チェックリスト

- [ ] 作業ディレクトリが `/home/minoru/src/sotalive-vercel/public/myact/` である
- [ ] 既存サーバープロセスを停止した
- [ ] `npm run dev` でサーバーを起動した
- [ ] `http://localhost:5173/myact/` が200ステータスを返す
- [ ] HTMLにReact関連コンテンツが含まれている
- [ ] テストを実行した
- [ ] テスト結果を確認した

## 自動化スクリプト

以下のスクリプトを使用して手順を自動化できます:

```bash
#!/bin/bash
# test-runner.sh

echo "=== MyACT テスト実行開始 ==="

# 1. サーバー停止
echo "1. サーバー停止中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# 2. 作業ディレクトリに移動
echo "2. 作業ディレクトリに移動..."
cd /home/minoru/src/sotalive-vercel/public/myact/

# 3. サーバー起動
echo "3. サーバー起動中..."
npm run dev &
SERVER_PID=$!
sleep 5

# 4. サーバー確認
echo "4. サーバー確認中..."
HTTP_STATUS=$(curl -s -w "%{http_code}" http://localhost:5173/myact/ -o /dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ サーバー正常起動 (HTTP $HTTP_STATUS)"
else
    echo "❌ サーバー起動失敗 (HTTP $HTTP_STATUS)"
    kill $SERVER_PID
    exit 1
fi

# 5. テスト実行
echo "5. テスト実行中..."
npx playwright test e2e/basic-ui-test.spec.ts --timeout=45000 --reporter=line

echo "=== テスト完了 ==="
echo "サーバーPID: $SERVER_PID (手動で停止してください)"
```

## 注意事項

- サーバーは手動で停止する必要があります（Ctrl+Cまたはプロセス終了）
- テスト実行中はサーバーを停止しないでください
- ネットワークエラーが発生した場合は、API接続を確認してください
- タイムアウトエラーが頻発する場合は、タイムアウト値を増加してください