#!/bin/bash
# MyACT サーバー制御スクリプト

# 設定の一元管理（environment.ts から抽出）
SERVER_PORT=5173
SERVER_HOST=localhost
BASE_PATH="/myact/"
SERVER_URL="http://${SERVER_HOST}:${SERVER_PORT}${BASE_PATH}"

ACTION=${1:-"restart"}
FAST_MODE=${2:-"false"}

case $ACTION in
  "stop")
    echo "=== サーバー停止開始 ==="
    
    # 既存プロセス確認
    CURRENT_PIDS=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep | awk '{print $2}')
    
    if [ -z "$CURRENT_PIDS" ]; then
        echo "停止対象のプロセスが見つかりません"
        exit 0
    fi
    
    echo "停止対象プロセス: $CURRENT_PIDS"
    
    # 順次終了
    for pid in $CURRENT_PIDS; do
        echo "プロセス $pid を終了中..."
        kill -TERM $pid 2>/dev/null || true
    done
    
    # 終了待機
    sleep 3
    
    # 強制終了チェック
    REMAINING=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep | awk '{print $2}')
    if [ -n "$REMAINING" ]; then
        echo "強制終了が必要: $REMAINING"
        for pid in $REMAINING; do
            kill -9 $pid 2>/dev/null || true
        done
        sleep 2
    fi
    
    # 最終確認
    FINAL_CHECK=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep | wc -l)
    if [ "$FINAL_CHECK" -eq 0 ]; then
        echo "✅ サーバー停止完了"
    else
        echo "❌ 一部プロセスが残っています:"
        ps aux | grep -E "(npm run dev|vite)" | grep -v grep
    fi
    ;;
    
  "start")
    echo "=== サーバー起動開始 ==="
    
    # 作業ディレクトリ確認
    if [ ! -f "package.json" ]; then
        echo "❌ package.jsonが見つかりません。myactディレクトリで実行してください。"
        exit 1
    fi
    
    # 既存プロセスチェック
    EXISTING=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep | wc -l)
    if [ "$EXISTING" -gt 0 ]; then
        echo "⚠️ 既にサーバーが起動しています:"
        ps aux | grep -E "(npm run dev|vite)" | grep -v grep
        exit 1
    fi
    
    # サーバー起動
    echo "npm run dev を起動中..."
    npm run dev &
    SERVER_PID=$!
    
    echo "サーバーPID: $SERVER_PID"
    
    # テスト用高速モード
    if [ "$FAST_MODE" = "true" ] || [ "$FAST_MODE" = "test" ] || [ "$FAST_MODE" = "fast" ]; then
        echo "起動待機中（テスト用高速：3秒）..."
        sleep 3
        RETRIES=15
        WAIT_TIME=0.5
    else
        echo "起動待機中（5秒）..."
        sleep 5
        RETRIES=10
        WAIT_TIME=1
    fi
    
    # 起動確認
    for i in $(seq 1 $RETRIES); do
        HTTP_STATUS=$(curl -s -w "%{http_code}" --max-time 3 --connect-timeout 2 "$SERVER_URL" -o /dev/null 2>/dev/null || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then
            echo "✅ サーバー正常起動 (HTTP $HTTP_STATUS)"
            echo "URL: $SERVER_URL"
            break
        else
            echo "待機中... (試行 $i/$RETRIES, HTTP $HTTP_STATUS)"
            sleep $WAIT_TIME
        fi
        
        if [ $i -eq $RETRIES ]; then
            echo "❌ サーバー起動失敗"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
    done
    ;;
    
  "restart")
    echo "=== サーバー再起動 ==="
    $0 stop
    sleep 2
    $0 start $FAST_MODE
    ;;
    
  "status")
    echo "=== サーバー状況確認 ==="
    
    # プロセス確認
    PROCESSES=$(ps aux | grep -E "(npm run dev|vite)" | grep -v grep)
    if [ -n "$PROCESSES" ]; then
        echo "動作中のプロセス:"
        echo "$PROCESSES"
    else
        echo "サーバープロセスが見つかりません"
    fi
    
    # HTTP確認
    HTTP_STATUS=$(curl -s -w "%{http_code}" --max-time 3 --connect-timeout 2 "$SERVER_URL" -o /dev/null 2>/dev/null || echo "000")
    echo "HTTPステータス: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ サーバーは正常に動作しています"
        exit 0
    else
        echo "❌ サーバーが応答していません"
        exit 1
    fi
    ;;
    
  *)
    echo "使用方法: $0 {start|stop|restart|status} [fast]"
    echo ""
    echo "  start   - サーバーを起動"
    echo "  stop    - サーバーを停止" 
    echo "  restart - サーバーを再起動（デフォルト）"
    echo "  status  - サーバー状況確認"
    echo ""
    echo "オプション:"
    echo "  fast/test - テスト用高速起動モード（待機時間短縮）"
    echo ""
    echo "例:"
    echo "  $0 start fast      # 高速起動"
    echo "  $0 restart test    # 高速再起動"
    exit 1
    ;;
esac