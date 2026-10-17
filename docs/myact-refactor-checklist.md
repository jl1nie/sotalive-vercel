# MyACT (`public/myact/index.html`) リファクタ確認項目

リファクタの前後で同じ操作をして、結果を見比べるための表。**リファクタ前に全項目を一度実施して基準(スクリーンショット・Network・Console)を残す**。各 PR の後は、その PR が触れた領域の項目と「共通」を実施する。

対象: 2,274 行 / インラインスクリプト約 45KB / 関数約 45 個。外部 API は `https://sotaapp2.sotalive.net/api/v2`。

## 0. 基準の取り方(最初に1回)

| 項目 | 方法 | 保存するもの |
|---|---|---|
| 0-1 起動 | シークレットウィンドウで開く(Cookie なし) | Console のエラー/警告の一覧、Network の失敗リクエスト一覧 |
| 0-2 初期画面 | 画面幅 PC(1280)とスマホ(390) | スクリーンショット |
| 0-3 読み込みファイル | Network で JS/JSON の一覧 | `jaffpota-annotated-v23.json` が1回だけ読まれていること |
| 0-4 既存利用者 | 通常ウィンドウ(既存 Cookie あり)で開く | 同上。保存済み設定で壊れないこと |

## 1. 共通(毎回必須)

- [ ] C-1 Console にエラーが増えていない(0-1 の基準と比較)
- [ ] C-2 Network に新しい 4xx/5xx がない。API のエンドポイントとクエリが基準と同じ
- [ ] C-3 ページ読み込み時に区域(`jaffpota-annotated-v23.json`)が**1回だけ**取得される
- [ ] C-4 地図のドラッグ/ズームで固まらない
- [ ] C-5 スマホ幅で操作できる(ナビバーのボタン、モーダル)

## 2. 地図と区域

- [ ] M-1 ベースレイヤー切替: 地理院地形図 / 全国最新写真 / OSM が切り替わる
- [ ] M-2 縮尺・ズーム表示(`zoomLabel`)、スケールバーが出る
- [ ] M-3 区域(紫の領域)が最初から表示される(設定不要)
- [ ] M-4 区域の通常クリック → ポップアップに POTA・JAFF・公園名
- [ ] M-5 区域の右クリック(スマホは長押し) → JAFF 欄が `JAFF-xxxx(PID,UID)` 形式
- [ ] M-6 屋久島 → JP-0030 / 桜島・霧島 → JP-0029(別の公園)
- [ ] M-7 沖縄本島北部(やんばる)→ JP-0032 / 慶良間 → JP-0033 / 沖縄海岸国定公園 JP-0156 と境界が重ならない
- [ ] M-8 設定を開閉しても区域が濃く重ならない(重複追加なし)
- [ ] M-9 mypilgrim.sotalive.net ホストのときだけ出る要素(ヤマレコレイヤー、巡礼)は、通常ホストでは出ない

## 3. マーカー(ズーム別)

- [ ] K-1 SOTA サミット: ズームに応じて表示/非表示(閾値は設定の `zoom_threshold`)
- [ ] K-2 サミットのマーカー: 標高・アクティベーション回数に応じた色/形、クリックでポップアップ
- [ ] K-3 POTA 公園マーカー(`placeParkMarker`)
- [ ] K-4 寺マーカー(`placeTempleMarker`、巡礼設定時)
- [ ] K-5 Ham Fair マーカー(`placeHamFairMarker`)
- [ ] K-6 地図を動かしたとき、範囲外のマーカーが残らない/増殖しない
- [ ] K-7 リセット系: `deleteSummitMarker` / `clearSummitMarker`(別の場所を選んだとき古いマーカーが消える)

## 4. ポップアップ(`displayPopup`)

- [ ] P-1 地図の何もないところをクリック → 近傍の SOTA サミット情報(`/sota/summits/search`)
- [ ] P-2 区域をクリック → POTA 情報(`/pota/parks/search?pota_code=`)
- [ ] P-3 ポップアップ内のリンク: pota.app / wwff.co / summits.sota.org.uk が正しい URL
- [ ] P-4 マップコード表示(設定ON時): 表示される/コピーできる(`mapcode_copy_coords`)
- [ ] P-5 Google マップ / 地理院 / Windy へのリンクが正しい座標
- [ ] P-6 「ポップアップ固定」(`popup_permanent`)のON/OFFで挙動が変わる
- [ ] P-7 天気欄が表示される(取得失敗時もポップアップは出る)

## 5. 検索とナビバー

- [ ] N-1 現在位置ボタン(`clickQTHButton`): 許可 → 現在地へ移動、拒否 → エラー表示(`callbkQTHNG`)
- [ ] N-2 現在位置のドラッグ(`QTHdragend`)
- [ ] N-3 参照コード検索(`search_ref`)で SOTA / POTA / JAFF を入れると該当地点へ移動(`showReference`)
- [ ] N-4 地名検索(`/search/brief?name=`、`locate_ref`)
- [ ] N-5 時計(`clock`)が5秒ごとに更新、Kp 指数(`kp_index`)が表示される
- [ ] N-6 ナビバーのロゴ → Mackerel のモーダルが開く

## 6. スポット(最新スポット)

- [ ] S-1 スポット一覧モーダルが開く(`/activation/spots?pat_ref=`)
- [ ] S-2 プログラム切替(SOTA/POTA/…)(`onProgChange`)、期間切替(`onPeriodChange`)
- [ ] S-3 「コールで集計」(`by_call`)の切替
- [ ] S-4 グラフ(Chart.js)が描画される、期間の時間軸が正しい
- [ ] S-5 地図上のスポットマーカーが更新される(`refresh_spots`)

## 7. APRS

- [ ] A-1 設定の「SOTA APRS」ON → 軌跡(`drawAPRSTrack`)が地図に出る(`/activation/aprs/track`)
- [ ] A-2 OFF → 軌跡が消える
- [ ] A-3 一定間隔の自動更新が動く(重複描画しない)

## 8. 設定(`prefs` と Cookie)

**最重要。`prefs` のキーと HTML の要素 ID が暗黙に対応している(キーを足す/消すとき、対応する要素がないとエラーになる)。**

- [ ] R-1 設定を開く/閉じるで画面が更新される(`clickPrefs` → `closePrefs`)
- [ ] R-2 チェックボックス各項目を切り替えて閉じ、リロード後も保持される(Cookie): SOTA/POTA/JAFF 参照、SOTA APRS、ポップアップ固定、Google マップ、マップコード
- [ ] R-3 ズーム閾値スライダー(7〜)を変えると、マーカーの出るズームが変わり、リロード後も保持
- [ ] R-4 値が入力欄のもの(`pemu_*`、`import_uuid`)も保持される
- [ ] R-5 削除した設定「自然公園の領域を表示」が出ないこと、古い Cookie が残っていても壊れない
- [ ] R-6 Cookie 全削除 → 既定値(`sota_ref=true` など)で起動する
- [ ] R-7 `prefs` の全キーと要素 ID の突き合わせ(リファクタ時にテスト化の候補)

## 9. POTA ログ

- [ ] L-1 ログ表示ON、ログファイルのアップロード(`/log/{uuid}` への POST)
- [ ] L-2 アクティベータ/ハンターの切替、反映ボタン
- [ ] L-3 UUID のエクスポート(`export_uuid`)とインポート(`import_uuid`、`/log-share/`)
- [ ] L-4 ログの削除(DELETE)— **本番データに触れるので、テスト用 UUID で**
- [ ] L-5 ログ表示ON時、公園/サミットのポップアップに Activations/Attempts/QSOs が出る
- [ ] L-6 統計モーダル(`stat_db`、`/pota/log-stat`)

## 10. キーヤー(ACT / PEMU)

実機が要るため、可能な範囲で。
- [ ] Y-1 キーヤーのモーダルが開く、`$CALL` `$SOTA` `$POTA` `$JAFF` が置換される
- [ ] Y-2 Wi-Fi 送信(`https://{pemu_host}/play`)の URL とパラメータが基準と同じ(Network で確認)
- [ ] Y-3 シリアル接続(`open_serial`)の許可ダイアログが出る
- [ ] Y-4 パドル/キー、WPM、区域コード(`include_areacode`)の設定が反映される

## 11. リファクタ中に注意する既知の点

- 関数 `getGeoData` が**二重に定義**されている(同じ内容)
- 設定項目は `prefs` と HTML 要素 ID が文字列で結びついている
- 区域データのファイル名は `jaffpota_release.py bump` が `index.html` の正規表現で書き換える。**区域の読み込み箇所は `jaffpota-annotated-vN.json` の形を保つこと**(`tests/test_jaffpota.py` が参照と `loadAreas` の形を検査)
- CDN(unpkg、cdnjs、jsdelivr)に依存。バージョン固定を変えない
- `enable_experimental` は mypilgrim ホストのみ true

## 12. 自動確認(Playwright)

`e2e/` に headless Chromium の画面テストがある(Vercel のビルド対象外。`e2e/package.json` は独立)。

```bash
cd e2e && npm install && npx playwright test
```

広告・解析系はブロックし、`sotaapp2` の API はモックして毎回同じ結果にしている。API の実物は見ない。

| 自動化済み | 項目 |
|---|---|
| 起動にエラーがない、区域が1回だけ取得、1,439 レイヤー | C-1, C-3, M-3 |
| 起動時の API エンドポイントが基準と同じ | C-2 |
| 設定の開閉で区域が重複しない | M-8 |
| 屋久島/霧島/やんばる/慶良間のクリックで POTA と公園名、右クリックで JAFF(PID,UID) | M-4〜M-7 |
| 設定項目の削除、古い Cookie でも壊れない、`prefs` と要素 ID の対応、保持、既定値 | R-2, R-5, R-6, R-7 |

**自動化していない(手動で見る)**: レイヤー切替の見た目、マーカーの表示・色、ポップアップのリンク先、スポットとグラフ、APRS の軌跡、POTA ログ、キーヤー、スマホ幅、現在位置(許可ダイアログ)。リファクタで触れる領域に応じてテストを足していく。

**基準(リファクタ前)**: 起動時 Console エラー 0、区域 1,439 レイヤー、JSON 取得 1 回、API は `/activation/aprs/track` `/propagation/geomag` `/search` の 3 種、`prefs` のうち同名の要素 ID が無いのは `spot_period` `zoom_threshold` のみ。
