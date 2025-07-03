import React, { useEffect, useState, memo } from 'react'
import { Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import type { Summit, Park, LatLng } from '@/types'

interface GeocodingInfo {
  errors?: string
  prefecture?: string
  municipality?: string
  address?: string
  jccCode?: string
  jccText?: string
  wardCode?: string | null
  jcgCode?: string | null
  jcc?: string
  jcg?: string
  hamlogCode?: string
  maidenhead?: string
  elevation?: string
  hsrc?: string
  mapcode?: string
}

interface InfoPopupProps {
  position: LatLng
  summit?: Summit
  park?: Park
  geocodingInfo?: GeocodingInfo | null
  isGPS?: boolean
  isTopoJSONArea?: boolean
  clickType?: 'left' | 'right'
  onClose?: () => void
}

const InfoPopup: React.FC<InfoPopupProps> = ({
  position,
  summit,
  park,
  geocodingInfo,
  isGPS = false,
  isTopoJSONArea = false,
  clickType = 'left',
  onClose
}) => {
  const { preferences } = useMapStore()
  const map = useMap()

  // ポップアップ位置の境界チェック（表示制御ではなく自動位置調整防止用）
  // Bounds check moved to useEffect to prevent multiple executions during render
  const [isInBounds, setIsInBounds] = useState(true)
  
  useEffect(() => {
    if (!map) return
    
    const checkPositionBounds = () => {
      try {
        const bounds = map.getBounds()
        const popupLatLng = L.latLng(position.lat, position.lng)
        const boundsResult = bounds.contains(popupLatLng)
        
        // Reduced logging to prevent console spam during zoom operations
        if (!boundsResult) {
          console.log('InfoPopup: Position outside bounds, keeping visible for manual close')
        }
        
        setIsInBounds(boundsResult)
      } catch (error) {
        console.warn('InfoPopup: Error checking bounds:', error)
        setIsInBounds(true)
      }
    }
    
    // Initial check
    checkPositionBounds()
    
    // Listen to map move events for bounds updates
    const handleMapMove = () => checkPositionBounds()
    map.on('moveend', handleMapMove)
    map.on('zoomend', handleMapMove)
    
    return () => {
      map.off('moveend', handleMapMove)
      map.off('zoomend', handleMapMove)
    }
  }, [map, position.lat, position.lng])

  // Format coordinates (6 decimal places like original)
  const formatCoordinate = (lat: number, lng: number) => {
    const formattedLat = Math.round(lat * 1000000) / 1000000
    const formattedLng = Math.round(lng * 1000000) / 1000000
    return `${formattedLat},${formattedLng}`
  }

  // Create location URI based on preferences
  const createLocationURI = (lat: number, lng: number, zoom: number = 15) => {
    if (preferences.link_googlemap) {
      return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`
    } else {
      return `https://maps.gsi.go.jp/#${zoom}/${lat}/${lng}`
    }
  }

  const locationURI = createLocationURI(position.lat, position.lng)
  const coordinateText = formatCoordinate(position.lat, position.lng)
  const windyURL = `https://www.windy.com/${position.lat}/${position.lng}/meteogram?rain,${position.lat},${position.lng},11`

  // Generate HTML content based on type
  let htmlContent = ''

  if (summit) {
    /* 
    ================================================================================================
    🏔️ SOTAマーカークリック表示データ - ハンドコーディング用メモ
    ================================================================================================
    
    📊 必要な表示データ（レガシー実装 displayPopup 参照）:
    
    1️⃣ SOTA基本情報 (API: /sota/summits/search?lat=xxx&lon=xxx&dist=200)
       - summitCode: "JA/YN-077"
       - summitName: "Kurokawakeikanzan" 
       - summitNameJ: "黒川鶏冠山"
       - latitude: 35.7885
       - longitude: 138.8356
       - altM: 1716 (標高メートル)
       - points: 10 (SOTA ポイント)
       - bonusPoints: 3 (ボーナスポイント)
       - maidenhead: "PM95ks09" (グリッドロケーター)
       - cityJ: "山梨県甲州市" (市町村名・日本語)
       - activationCount: 50 (アクティベーション回数)
       - activationDate: "09/03/2025" (最終アクティベーション日付)
       - activationCall: "7M4QZE/1" (最終アクティベーション局)
    
    2️⃣ クリック位置詳細情報 (API: local_reverse_geocoder)
       - errors: "OK" | "OUTSIDE_JA" | "ERROR"
       - prefecture: "山梨県" (都道府県)
       - municipality: "甲州市" (市町村)
       - address: "甲州市塩山一ノ瀬高橋" (詳細住所)
       - jccCode: "1713" (JCC番号)
       - jccText: "甲州市" (JCC地名)
       - wardCode: null | string (区番号、あれば表示)
       - jcgCode: null | string (JCG番号、JCCがない場合)
       - hamlogCode: "" (HamLog追加コード)
       - maidenhead: "PM95ks09" (グリッドロケーター)
       - elevation: "1712.3" (標高・小数点付き)
       - hsrc: "国土地理院10m（カメラ）" (標高情報ソース)
       - mapcode: "664 445 229*66" (マップコード)
    
    3️⃣ 表示形式例 (target format):
    ┌─────────────────────────────────────────────────────┐
    │ JA/YN-077 Kurokawakeikanzan                        │  ← summit link
    │                                                     │
    │ 黒川鶏冠山                                           │  ← summitNameJ
    │                                                     │
    │ 山梨県甲州市<JCC#1713>                               │  ← cityJ + jccCode
    │ GL:PM95ks09                                        │  ← maidenhead
    │ 位置:35.7885,138.8356                              │  ← coordinates link
    │ 標高:1716m,10pts (+3)                              │  ← elevation, points, bonus
    │                                                     │
    │ クリック位置: JCC1713                                │  ← click location header
    │ 山梨県甲州市甲州市塩山一ノ瀬高橋                        │  ← full address
    │ GL:PM95ks09                                        │  ← maidenhead (geocoding)
    │ 位置:35.7885,138.8356                              │  ← click coordinates
    │ 標高:1712.3m                                       │  ← elevation (geocoding)
    │                                                     │
    │ 🌤️☁️🌧️                                            │  ← weather link
    │ 📍 664 445 229*66                                  │  ← mapcode (if enabled)
    │                                                     │
    │ Activations: 50                                    │  ← activation stats
    │ Last Activation: 09/03/2025(7M4QZE/1)             │  ← last activation
    └─────────────────────────────────────────────────────┘
    
    🔧 実装する処理フロー:
    1. handleSummitClick で /sota/summits/search API呼び出し
    2. local_reverse_geocoder で位置詳細情報取得
    3. get_mapcode でマップコード取得 (prefs.display_mapcode=true時)
    4. 上記データを組み合わせて HTML 文字列生成
    5. InfoPopup で dangerouslySetInnerHTML として表示
    
    💡 ハンドコーディング時の注意点:
    - JCC番号は <JCC#xxxx> 形式で cityJ に追加
    - 標高は summit.altM (整数) と geocoding.elevation (小数) を使い分け
    - アクティベーション日付は DD/MM/YYYY 形式
    - マップコード表示は preferences.display_mapcode に依存
    - エラー時は "Parameter out of range." 表示
    
    📁 参照ファイル:
    - legacy/index.html 行1098-1228 (displayPopup function)
    - common/js/revgeocoder.js (local_reverse_geocoder)
    ================================================================================================
    */
    
    // Summit data is processed without debug logging to prevent spam
    
    // 🚧 TODO: ハンドコーディングで上記仕様通りに実装
    // レガシー実装と完全に同じ形式でサミット情報を表示
    const summitCode = summit.summitCode || ''
    const summitNameJ = summit.summitNameJ || summit.summitName || ''
    const locationCoords = `${summit.latitude},${summit.longitude}`
    const summitLocationURI = createLocationURI(summit.latitude, summit.longitude)
    
    // レガシー実装の sotamesg 部分に対応
    let sotaInfo = `${summit.cityJ || ''}<br>GL:${summit.maidenhead || ''}`
    sotaInfo += `<br>位置:<a href="${summitLocationURI}" target="_blank">${locationCoords}</a>`
    
    // 標高・ポイント情報の表示
    const elevation = summit.altM || '---'
    const points = summit.points || '---'
    const bonusPoints = summit.bonusPoints || 0
    sotaInfo += `<br>標高:${elevation}m,${points}pts (+${bonusPoints})`
    
    // アクティベーション情報の表示（qsomesg に対応）
    let activationInfo = ''
    if (summit.activationCount !== undefined && summit.activationCount !== null) {
      activationInfo += `<br>Activations: ${summit.activationCount}`
      if (summit.activationCount > 0 && summit.activationDate && summit.activationCall) {
        activationInfo += `<br>Last Activation: ${summit.activationDate}(${summit.activationCall})`
      }
    }
    
    // クリック位置の詳細情報（レガシー実装の mesg 部分に対応）
    let locationInfo = ''
    if (geocodingInfo && geocodingInfo.errors === 'OK') {
      if (geocodingInfo.jccCode) {
        if (geocodingInfo.wardCode) {
          locationInfo = `<br><b>クリック位置: </b>JCC${geocodingInfo.jccCode} 区番号:${geocodingInfo.wardCode}<br>`
          locationInfo += `${geocodingInfo.prefecture || ''}${geocodingInfo.jccText || ''}${geocodingInfo.municipality || ''}<br>`
        } else {
          locationInfo = `<br><b>クリック位置: </b>JCC${geocodingInfo.jccCode}<br>`
          locationInfo += `${geocodingInfo.prefecture || ''}${geocodingInfo.jccText || ''}${geocodingInfo.municipality || ''}<br>`
        }
      } else if (geocodingInfo.jcgCode) {
        locationInfo = `<br><b>クリック位置: </b>JCG${geocodingInfo.jcgCode}${geocodingInfo.hamlogCode || ''}<br>`
        locationInfo += `${geocodingInfo.prefecture || ''}${geocodingInfo.jccText || ''}${geocodingInfo.municipality || ''}<br>`
      }
      
      locationInfo += `GL:${geocodingInfo.maidenhead || ''}<br>`
      locationInfo += `位置:<a href="${locationURI}" target="_blank">${coordinateText}</a><br>`
      locationInfo += `標高:${geocodingInfo.elevation || '---'}m`
      
      // マップコード表示（レガシー実装の weather 部分に含まれる）
      if (preferences.display_mapcode && geocodingInfo.mapcode) {
        locationInfo += `<br>📍 ${geocodingInfo.mapcode}`
      }
    }
    
    // レガシー実装と同じ最終的な構成
    // cnt = '<b>' + cnt + '</b>' + mesg + weather + qsomesg;
    const weather = `&nbsp;&nbsp;<a href="${windyURL}" target="_blank">🌤️☁️🌧️</a>`
    
    htmlContent = `
      <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
        <b><a target="_blank" href="https://summits.sota.org.uk/summit/${summitCode}">${summitCode}</a></b><br>
        <b>${summitNameJ}</b><br><br>
        ${sotaInfo}
        ${weather}
        ${locationInfo}
        ${activationInfo}
        ${preferences.enable_emulation ? '<br><button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
      </div>
    `
  } else if (park) {
    /* 
    ================================================================================================
    🏞️ POTAマーカークリック表示データ - ハンドコーディング用メモ
    ================================================================================================
    
    📊 必要な表示データ（レガシー実装 displayPopup 参照）:
    
    1️⃣ POTA基本情報 (API: /pota/parks/search?pota_code=xxx)
       - potaCode: "JA-0207" (POTA参照番号)
       - wwffCode: "JAFF-0207" (WWFF参照番号)
       - parkNameJ: "養老渓谷奥清澄県立自然公園" (公園名・日本語)
       - parkName: "Yorokeikokuokukiyosumi Prefectural Natural Park" (公園名・英語)
       - latitude: 35.1234 (緯度)
       - longitude: 140.1234 (経度)
       - activations: 15 (アクティベーション回数)
       - attempts: 20 (アクティベーション試行回数)
       - qsos: 450 (QSO数・ログから算出)
    
    2️⃣ クリック位置詳細情報 (API: local_reverse_geocoder)
       - errors: "OK" | "OUTSIDE_JA" | "ERROR"
       - prefecture: "千葉県" (都道府県)
       - municipality: "夷隅郡大多喜町" (市町村)
       - address: "夷隅郡大多喜町粟又" (詳細住所)
       - jccCode: "1218" (JCC番号)
       - jccText: "夷隅郡" (JCC地名)
       - wardCode: null | string (区番号、あれば表示)
       - jcgCode: null | string (JCG番号、JCCがない場合)
       - hamlogCode: "" (HamLog追加コード)
       - maidenhead: "PM95tl28" (グリッドロケーター)
       - elevation: "125.4" (標高・小数点付き)
       - hsrc: "国土地理院10m（カメラ）" (標高情報ソース)
       - mapcode: "156 234 567*89" (マップコード)
    
    3️⃣ 表示形式例 (target format):
    ┌─────────────────────────────────────────────────────┐
    │ JA-0207 / JAFF-0207                               │  ← reference links
    │ 養老渓谷奥清澄県立自然公園                             │  ← parkNameJ
    │                                                     │
    │ 位置:35.1234,140.1234                              │  ← coordinates link
    │ 🌤️☁️🌧️                                            │  ← weather link
    │                                                     │
    │ Activations/Attempts: 15/20                        │  ← activation stats
    │ QSOs: 450                                          │  ← qso count
    │                                                     │
    │ クリック位置: JCC1218                                │  ← click location header
    │ 千葉県夷隅郡夷隅郡大多喜町粟又                          │  ← full address
    │ GL:PM95tl28                                        │  ← maidenhead (geocoding)
    │ 位置:35.1234,140.1234                              │  ← click coordinates
    │ 標高:125.4m                                        │  ← elevation (geocoding)
    │                                                     │
    │ 📍 156 234 567*89                                  │  ← mapcode (if enabled)
    └─────────────────────────────────────────────────────┘
    
    🔧 実装する処理フロー:
    1. handleParkClick で /pota/parks/search API呼び出し
    2. local_reverse_geocoder で位置詳細情報取得
    3. get_mapcode でマップコード取得 (prefs.display_mapcode=true時)
    4. POTAログ統計データ取得 (prefs.show_potalog=true時)
    5. 上記データを組み合わせて HTML 文字列生成
    6. InfoPopup で dangerouslySetInnerHTML として表示
    
    💡 ハンドコーディング時の注意点:
    - 参照番号は POTA / WWFF の両方がある場合は " / " で区切り
    - POTAログが有効な場合のみ Activations/Attempts/QSOs 表示
    - QSO数は POTAログデータベースから算出された値
    - TopoJSONクリックと表示形式は同じ（位置のみ異なる）
    - エラー時は "Parameter out of range." 表示
    
    📁 参照ファイル:
    - legacy/index.html 行1121-1135 (POTA park処理)
    - legacy/index.html 行1128-1134 (POTAログ統計)
    ================================================================================================
    */
    
    // 🚧 TODO: ハンドコーディングで上記仕様通りに実装
    // POTA Park Popup (レガシー実装と同じ詳細情報)
    const potaLink = park.potaCode ? `<a target="_blank" href="https://pota.app/#/park/${park.potaCode}">${park.potaCode}</a>` : ''
    const wwffLink = park.wwffCode ? `<a target="_blank" href="https://wwff.co/directory/?showRef=${park.wwffCode}">${park.wwffCode}</a>` : ''
    const referenceLinks = [potaLink, wwffLink].filter(Boolean).join(' / ')

    // POTA統計情報
    let qsoInfo = ''
    if (preferences.show_potalog && (park.activations || park.attempts || park.qsos)) {
      if (park.attempts) {
        qsoInfo += `<br>Activations/Attempts: ${park.activations || 0}/${park.attempts}`
        qsoInfo += `<br>QSOs: ${park.qsos || 0}<br>`
      } else if (park.qsos) {
        qsoInfo += `<br>QSOs: ${park.qsos}<br>`
      }
    }
    
    // 地理情報も追加表示（クリック位置情報）
    let locationInfo = ''
    if (geocodingInfo) {
      if (geocodingInfo.prefecture && geocodingInfo.municipality) {
        locationInfo = `<br><b>クリック位置: </b>${geocodingInfo.prefecture} ${geocodingInfo.municipality}`
        if (geocodingInfo.jccCode) {
          locationInfo += `<br>JCC${geocodingInfo.jccCode}`
          if (geocodingInfo.wardCode) {
            locationInfo += ` 区番号:${geocodingInfo.wardCode}`
          }
        } else if (geocodingInfo.jcgCode) {
          locationInfo += `<br>JCG${geocodingInfo.jcgCode}${geocodingInfo.hamlogCode || ''}`
        }
        locationInfo += `<br>GL:${geocodingInfo.maidenhead || ''}`
        locationInfo += `<br><i>位置:<a href="${locationURI}" target="_blank">${coordinateText}</a></i>`
        locationInfo += `<br>標高:${geocodingInfo.elevation || '---'}m`
      }
    }

    htmlContent = `
      <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
        <b>${referenceLinks}</b><br>
        ${park.parkNameJ || ''}<br><br>
        位置:<a href="${locationURI}" target="_blank">${coordinateText}</a><br>
        &nbsp;&nbsp;<a href="${windyURL}" target="_blank">🌤️☁️🌧️</a>
        ${qsoInfo}
        ${locationInfo}
        ${preferences.enable_emulation ? '<br><button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
      </div>
    `
  } else if (isGPS) {
    /* 
    ================================================================================================
    📍 QTHマーカークリック表示データ - ハンドコーディング用メモ
    ================================================================================================
    
    📊 必要な表示データ（レガシー実装 GPS位置表示 参照）:
    
    1️⃣ GPS測位情報 (Geolocation API)
       - position.lat: 35.9063 (GPS緯度)
       - position.lng: 139.6239 (GPS経度)
       - position.alt: 18.5 (GPS測位標高・メートル)
       - position.accuracy: 5.0 (GPS精度・メートル)
       - timestamp: 1672531200000 (測位時刻・Unix timestamp)
    
    2️⃣ クリック位置詳細情報 (API: local_reverse_geocoder)
       - errors: "OK" | "OUTSIDE_JA" | "ERROR"
       - prefecture: "埼玉県" (都道府県)
       - municipality: "さいたま市大宮区" (市町村)
       - address: "さいたま市大宮区桜木町" (詳細住所)
       - jccCode: "1007" (JCC番号)
       - jccText: "さいたま市" (JCC地名)
       - wardCode: "07" (区番号、政令指定都市の場合)
       - jcgCode: null | string (JCG番号、JCCがない場合)
       - hamlogCode: "" (HamLog追加コード)
       - maidenhead: "PM95wp72" (グリッドロケーター)
       - elevation: "15.2" (標高・小数点付き・DEM値)
       - hsrc: "国土地理院5m（写真測量）" (標高情報ソース)
       - mapcode: "84 123 456*78" (マップコード)
       - areacode: ["11107"] (エリアコード配列)
    
    3️⃣ 表示形式例 (target format):
    
    🌍 GPS現在地表示 (ドラッグ可能マーカー):
    ┌─────────────────────────────────────────────────────┐
    │ 現在地: 埼玉県さいたま市大宮区                         │  ← GPS location header
    │ JCC1007 区番号:07                                   │  ← jccCode + wardCode
    │ 埼玉県さいたま市さいたま市大宮区桜木町                   │  ← full address
    │ GL:PM95wp72                                        │  ← maidenhead
    │ 位置:35.9063,139.6239                              │  ← coordinates link
    │ 標高:15.2m (GPS測位値:18.5m)                        │  ← DEM + GPS elevation
    │ GPS精度:5.0m                                       │  ← GPS accuracy
    │                                                     │
    │ 🌤️☁️🌧️                                            │  ← weather link
    │ 📍 84 123 456*78                                   │  ← mapcode (if enabled)
    │                                                     │
    │ 📋 ActPaddle                                       │  ← emulation button (if enabled)
    └─────────────────────────────────────────────────────┘
    
    🌏 QTH位置更新時 (ドラッグ移動後):
    ┌─────────────────────────────────────────────────────┐
    │ QTH: 埼玉県さいたま市大宮区                           │  ← QTH location header
    │ JCC1007 区番号:07                                   │  ← jccCode + wardCode
    │ 埼玉県さいたま市さいたま市大宮区桜木町                   │  ← full address
    │ GL:PM95wp72                                        │  ← maidenhead
    │ 位置:35.9063,139.6239                              │  ← coordinates link
    │ 標高:15.2m                                         │  ← DEM elevation only
    │                                                     │
    │ 🌤️☁️🌧️                                            │  ← weather link
    │ 📍 84 123 456*78                                   │  ← mapcode (if enabled)
    │                                                     │
    │ 📋 ActPaddle                                       │  ← emulation button (if enabled)
    └─────────────────────────────────────────────────────┘
    
    🌐 日本国外の場合 (errors="OUTSIDE_JA"):
    ┌─────────────────────────────────────────────────────┐
    │ 現在地: 37.7749,-122.4194                          │  ← coordinates only
    │ GL: FN37hp                                         │  ← maidenhead only
    │ GPS測位値: 25.0m                                   │  ← GPS elevation only
    │ GPS精度: 8.0m                                      │  ← GPS accuracy
    └─────────────────────────────────────────────────────┘
    
    ⚠️ GPS測位エラーの場合:
    ┌─────────────────────────────────────────────────────┐
    │ GPS位置取得に失敗しました                             │  ← error message
    │ [位置情報を許可してください]                           │  ← permission prompt
    └─────────────────────────────────────────────────────┘
    
    🔧 実装する処理フロー:
    1. QTHMarker.onClick でGPS現在地クリック検出
    2. Geolocation API で現在の GPS測位情報取得
    3. local_reverse_geocoder で位置詳細情報取得
    4. get_mapcode でマップコード取得 (prefs.display_mapcode=true時)
    5. GPS測位値とDEM標高値を併記表示
    6. 上記データを組み合わせて HTML 文字列生成
    7. InfoPopup で dangerouslySetInnerHTML として表示
    
    💡 ハンドコーディング時の注意点:
    - GPS測位値は実測値として "GPS測位値:xxx.xm" 形式で表示
    - GPS精度は "GPS精度:x.xm" として併記
    - 初回GPS取得時は "現在地:" ヘッダー使用
    - ドラッグ移動後は "QTH:" ヘッダー使用
    - DEM標高値とGPS標高値は両方表示（可能な場合）
    - 日本国外では簡素表示（座標とGL情報のみ）
    - GPS測位エラー時は適切なエラーメッセージ表示
    - ActPaddleボタンは preferences.enable_emulation=true時のみ表示
    
    📁 参照ファイル:
    - legacy/index.html 行2156-2200 (getCurrentPosition GPS処理)
    - legacy/index.html 行2201-2250 (QTH marker移動処理)
    - common/js/revgeocoder.js (local_reverse_geocoder)
    ================================================================================================
    */
    
    // 🚧 TODO: ハンドコーディングで上記仕様通りに実装
    // GPS Location Popup (レガシー実装と同じ形式)
    let gpsInfo = `<b>現在地: </b>${geocodingInfo?.prefecture || ''} ${geocodingInfo?.municipality || ''}`
    
    if (geocodingInfo?.jccCode) {
      gpsInfo += `<br>JCC${geocodingInfo.jccCode}`
      if (geocodingInfo.wardCode) {
        gpsInfo += ` 区番号:${geocodingInfo.wardCode}`
      }
      gpsInfo += `<br>${geocodingInfo.prefecture || ''}${geocodingInfo.jccText || ''}${geocodingInfo.municipality || ''}`
    } else if (geocodingInfo?.jcgCode) {
      gpsInfo += `<br>JCG${geocodingInfo.jcgCode}${geocodingInfo.hamlogCode || ''}`
      gpsInfo += `<br>${geocodingInfo.prefecture || ''}${geocodingInfo.jccText || ''}${geocodingInfo.municipality || ''}`
    }
    
    gpsInfo += `<br>GL:${geocodingInfo?.maidenhead || ''}`
    gpsInfo += `<br>位置:<a href="${locationURI}" target="_blank">${coordinateText}</a>`
    
    const elevation = geocodingInfo?.elevation ? 
      (position.alt ? `${geocodingInfo.elevation}m (GPS測位値:${position.alt}m)` : `${geocodingInfo.elevation}m`) : 
      '---'
    gpsInfo += `<br>標高:${elevation}`
    
    htmlContent = `
      <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
        ${gpsInfo}
        &nbsp;&nbsp;<a href="${windyURL}" target="_blank">🌤️☁️🌧️</a>
        ${preferences.display_mapcode && geocodingInfo?.mapcode ? `<br>Mapcode: ${geocodingInfo.mapcode}` : ''}
        ${preferences.enable_emulation ? '<br><button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
      </div>
    `
  } else {
    /* 
    ================================================================================================
    🗺️ 地図クリック（空白エリア）表示データ - ハンドコーディング用メモ
    ================================================================================================
    
    📊 必要な表示データ（レガシー実装 displayPopup 参照）:
    
    1️⃣ クリック位置詳細情報 (API: local_reverse_geocoder)
       - errors: "OK" | "OUTSIDE_JA" | "ERROR"
       - prefecture: "埼玉県" (都道府県)
       - municipality: "さいたま市大宮区" (市町村)
       - address: "さいたま市大宮区桜木町" (詳細住所)
       - jccCode: "1007" (JCC番号)
       - jccText: "さいたま市" (JCC地名)
       - wardCode: "07" (区番号、政令指定都市の場合)
       - jcgCode: null | string (JCG番号、JCCがない場合)
       - hamlogCode: "" (HamLog追加コード)
       - maidenhead: "PM95wp72" (グリッドロケーター)
       - elevation: "15.2" (標高・小数点付き)
       - hsrc: "国土地理院5m（写真測量）" (標高情報ソース)
       - mapcode: "84 123 456*78" (マップコード)
       - areacode: ["11107"] (エリアコード配列)
    
    2️⃣ GPS測位値 (isGPS=true時のみ)
       - position.alt: 18.5 (GPS測位標高)
    
    3️⃣ 表示形式例 (target format):
    
    🌍 日本国内の場合 (errors="OK"):
    ┌─────────────────────────────────────────────────────┐
    │ JCC1007 区番号:07                                   │  ← jccCode + wardCode
    │ 埼玉県さいたま市さいたま市大宮区桜木町                   │  ← full address
    │ GL:PM95wp72                                        │  ← maidenhead
    │ 位置:35.9063,139.6239                              │  ← coordinates link
    │ 標高:15.2m [国土地理院5m（写真測量）]                 │  ← elevation + source
    │                                                     │
    │ 🌤️☁️🌧️                                            │  ← weather link
    │ 📍 84 123 456*78                                   │  ← mapcode (if enabled)
    └─────────────────────────────────────────────────────┘
    
    🌏 GPS現在地の場合 (isGPS=true):
    ┌─────────────────────────────────────────────────────┐
    │ 現在地: 埼玉県さいたま市大宮区                         │  ← GPS location header
    │ JCC1007 区番号:07                                   │  ← jccCode + wardCode  
    │ 埼玉県さいたま市さいたま市大宮区桜木町                   │  ← full address
    │ GL:PM95wp72                                        │  ← maidenhead
    │ 位置:35.9063,139.6239                              │  ← coordinates link
    │ 標高:15.2m (GPS測位値:18.5m)                        │  ← DEM + GPS elevation
    │                                                     │
    │ 🌤️☁️🌧️                                            │  ← weather link
    │ 📍 84 123 456*78                                   │  ← mapcode (if enabled)
    └─────────────────────────────────────────────────────┘
    
    🌐 日本国外の場合 (errors="OUTSIDE_JA"):
    ┌─────────────────────────────────────────────────────┐
    │ Pos: 37.7749,-122.4194                            │  ← coordinates only
    │ GL: FN37hp                                         │  ← maidenhead only
    └─────────────────────────────────────────────────────┘
    
    ⚠️ エラーの場合 (errors="ERROR"):
    ┌─────────────────────────────────────────────────────┐
    │ Parameter out of range.                            │  ← error message
    └─────────────────────────────────────────────────────┘
    
    🔧 実装する処理フロー:
    1. map.on('click') で地図クリックイベント取得
    2. local_reverse_geocoder で位置詳細情報取得
    3. get_mapcode でマップコード取得 (prefs.display_mapcode=true時)
    4. エラー状態に応じて適切な表示形式選択
    5. 上記データを組み合わせて HTML 文字列生成
    6. InfoPopup で dangerouslySetInnerHTML として表示
    
    💡 ハンドコーディング時の注意点:
    - JCCとJCGは排他的（どちらか一方のみ表示）
    - 区番号は政令指定都市の場合のみ表示
    - GPS測位値は実測値として併記
    - 標高ソース情報は [] で囲んで表示
    - 日本国外は簡素な表示形式
    - エラー時は "Parameter out of range." のみ表示
    
    📁 参照ファイル:
    - legacy/index.html 行1148-1228 (地図クリック処理)
    - legacy/index.html 行1163-1181 (JCC/JCG分岐)
    ================================================================================================
    */
    
    // 🚧 TODO: ハンドコーディングで上記仕様通りに実装
    // Regular Map Click Popup (useReverseGeocoderのフィールド名に対応)
    let mapClickInfo = ''
    
    // geocodingInfo が null の場合は読み込み中として扱う
    if (!geocodingInfo) {
      mapClickInfo = 'Loading location info...'
    } else if (geocodingInfo.errors === 'OUTSIDE_JA') {
      mapClickInfo = `Pos: ${coordinateText}<br>GL: ${geocodingInfo.maidenhead || ''}`
    } else if (geocodingInfo.errors !== 'OK') {
      mapClickInfo = 'Parameter out of range.'
    } else {
      mapClickInfo = `<b>クリック位置: </b>${geocodingInfo?.municipality || ''}`
      
      if (geocodingInfo?.jcc) {
        mapClickInfo += `<br>JCC${geocodingInfo.jcc}`
      } else if (geocodingInfo?.jcg) {
        mapClickInfo += `<br>JCG${geocodingInfo.jcg}`
      }
      
      mapClickInfo += `<br>GL:${geocodingInfo?.maidenhead || ''}`
      mapClickInfo += `<br><i>位置:<a href="${locationURI}" target="_blank">${coordinateText}</a></i>`
      mapClickInfo += `<br>標高:${geocodingInfo?.elevation || '---'}m`
    }
    
    htmlContent = `
      <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
        ${mapClickInfo}
        &nbsp;&nbsp;<a href="${windyURL}" target="_blank">🌤️☁️🌧️</a>
        ${preferences.display_mapcode && geocodingInfo?.mapcode ? `<br>Mapcode: ${geocodingInfo.mapcode}` : ''}
        ${preferences.enable_emulation ? '<br><button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
      </div>
    `
  }

  return (
    <Popup
      position={[position.lat, position.lng]}
      maxWidth={400}
      // 自動位置調整を無効化（領域外でも地図移動させない）
      autoPan={false}
      // 領域外でもポップアップを表示継続
      keepInView={false}
      eventHandlers={onClose ? {
        remove: onClose,
        popupclose: onClose
      } : undefined}
    >
      <div 
        style={{ 
          fontSize: '12px', 
          lineHeight: '1.4',
          minWidth: '200px',
          maxWidth: '350px'
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </Popup>
  )
}

// React.memo で不要な再描画を防止 - 詳細比較関数付き
export default memo(InfoPopup, (prevProps, nextProps) => {
  // 位置の変更を検出
  if (prevProps.position.lat !== nextProps.position.lat || 
      prevProps.position.lng !== nextProps.position.lng) {
    return false
  }
  
  // サミット情報の変更を検出
  if (prevProps.summit?.summitCode !== nextProps.summit?.summitCode) {
    return false
  }
  
  // 公園情報の変更を検出
  if (prevProps.park?.potaCode !== nextProps.park?.potaCode) {
    return false
  }
  
  // GPS状態の変更を検出
  if (prevProps.isGPS !== nextProps.isGPS) {
    return false
  }
  
  // ジオコーディング情報の変更を検出（主要フィールドのみ）
  if (prevProps.geocodingInfo?.prefecture !== nextProps.geocodingInfo?.prefecture ||
      prevProps.geocodingInfo?.municipality !== nextProps.geocodingInfo?.municipality) {
    return false
  }
  
  // その他の変更がなければ再レンダリングをスキップ
  return true
})