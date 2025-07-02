import React, { useEffect, useState } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import type { GeoJsonObject, Feature } from 'geojson'
import type { Park } from '@/types'

// TopoJSON processing utility
const processTopoJSON = async (url: string): Promise<GeoJsonObject | null> => {
  try {
    console.log('🟢 processTopoJSON: Starting to load', url)
    
    // Import topojson dynamically to avoid SSR issues
    const topojson = await import('topojson-client')
    console.log('🟢 processTopoJSON: topojson-client imported successfully')
    
    const response = await fetch(url)
    console.log('🟢 processTopoJSON: Fetch response status:', response.status)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('🟢 processTopoJSON: JSON parsed, object keys:', Object.keys(data.objects || {}))
    
    // Convert TopoJSON to GeoJSON
    const objectKey = Object.keys(data.objects)[0]
    console.log('🟢 processTopoJSON: Using object key:', objectKey)
    
    const geojson = topojson.feature(data, data.objects[objectKey])
    console.log('🟢 processTopoJSON: GeoJSON converted, features count:', (geojson as any).features?.length)
    
    return geojson as GeoJsonObject
  } catch (error) {
    console.error('🔴 processTopoJSON: Failed to load TopoJSON:', error)
    return null
  }
}

const TopoJSONLayer: React.FC = () => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null)
  const { preferences } = useMapStore()

  useEffect(() => {
    console.log('🟢 TopoJSONLayer: display_area preference:', preferences.display_area)
    if (preferences.display_area) {
      console.log('🟢 TopoJSONLayer: Loading TopoJSON data...')
      processTopoJSON('json/jaffpota-annotated-v22.json')
        .then(data => {
          console.log('🟢 TopoJSONLayer: Data loaded successfully:', data ? 'YES' : 'NO')
          if (data) {
            console.log('🟢 TopoJSONLayer: Number of features:', (data as any).features?.length)
            console.log('🟢 TopoJSONLayer: Sample feature properties:', (data as any).features?.[0]?.properties)
            console.log('🟢 TopoJSONLayer: First 3 features:', (data as any).features?.slice(0, 3))
          }
          setGeoJsonData(data)
        })
        .catch(error => {
          console.error('🔴 TopoJSONLayer: Error loading data:', error)
        })
    } else {
      console.log('🟡 TopoJSONLayer: Clearing data (preference disabled)')
      setGeoJsonData(null)
    }
  }, [preferences.display_area])

  if (!geoJsonData) {
    console.log('🟡 TopoJSONLayer: No data, not rendering')
    return null
  }
  
  console.log('🟢 TopoJSONLayer: Rendering GeoJSON layer with data')
  console.log('🟢 TopoJSONLayer: Features count:', (geoJsonData as any).features?.length)

  // Style function for park areas
  const getFeatureStyle = () => ({
    color: "#000",
    opacity: 1,
    weight: 1,
    fillColor: '#9fa8da',
    fillOpacity: 0.3
  })

  /* 
  ================================================================================================
  🏞️ TopoJSONレイヤークリック表示データ - ハンドコーディング用メモ
  ================================================================================================
  
  📊 必要な表示データ（レガシー実装 TopoJSON onEachFeature 参照）:
  
  1️⃣ TopoJSON Feature情報 (ファイル: json/jaffpota-annotated-v22.json)
     - POTA: "JA-0207" (POTA参照番号)
     - JAFF: "JAFF-0207" (JAFF参照番号)
     - NAME: "養老渓谷奥清澄県立自然公園" (公園名・日本語)
     - PID: "12345" (公園ID)
     - UID: "67890" (ユニークID)
     - クリック座標: e.latlng.lat, e.latlng.lng (領域内の任意点)
  
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
  
  3️⃣ POTAログ統計情報 (prefs.show_potalog=true時)
     - activations: 15 (アクティベーション回数)
     - attempts: 20 (アクティベーション試行回数)
     - qsos: 450 (QSO数・ログから算出)
  
  4️⃣ 表示形式例 (target format):
  
  🖱️ 左クリック (通常表示):
  ┌─────────────────────────────────────────────────────┐
  │ JA-0207 / JAFF-0207                               │  ← reference links
  │ 養老渓谷奥清澄県立自然公園                             │  ← parkNameJ
  │                                                     │
  │ 位置:35.1234,140.1234                              │  ← click coordinates link
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
  
  🖱️ 右クリック (デバッグ情報表示):
  ┌─────────────────────────────────────────────────────┐
  │ JA-0207 / JAFF-0207(12345,67890)                  │  ← reference + IDs
  │ 養老渓谷奥清澄県立自然公園                             │  ← parkNameJ
  │                                                     │
  │ 位置:35.1234,140.1234                              │  ← click coordinates link
  │ 🌤️☁️🌧️                                            │  ← weather link
  │                                                     │
  │ [DEBUG] PID:12345 UID:67890                        │  ← debug IDs
  └─────────────────────────────────────────────────────┘
  
  🔧 実装する処理フロー:
  1. GeoJSON layer.on('click') でTopoJSON領域クリック検出
  2. feature.properties から POTA/JAFF/NAME 取得
  3. POTAマーカークリックと同じ displayPopup 呼び出し
  4. local_reverse_geocoder で位置詳細情報取得
  5. get_mapcode でマップコード取得 (prefs.display_mapcode=true時)
  6. POTAログ統計データ取得 (prefs.show_potalog=true時)
  7. 上記データを組み合わせて HTML 文字列生成
  8. L.popup() で直接Leafletポップアップ表示 (React管理外)
  
  💡 ハンドコーディング時の注意点:
  - POTAマーカークリックと表示形式は同一（処理共通化可能）
  - 右クリックは feature.properties の PID/UID をデバッグ表示
  - クリック座標は e.latlng で取得（公園の中心座標ではない）
  - L.DomEvent.stopPropagation(e) でイベント伝播停止必須
  - サミットマーカーとの重複クリック回避ロジック必要
  
  📁 参照ファイル:
  - legacy/index.html 行1647-1690 (TopoJSON onEachFeature)
  - json/jaffpota-annotated-v22.json (2.7MB TopoJSONデータ)
  ================================================================================================
  */

  // Handle feature clicks
  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    console.log('🟢 TopoJSONLayer: onEachFeature called for feature:', feature.properties)
    if (feature.properties) {
      layer.on({
        click: (e) => {
          const DEBUG = true // デバッグ有効化
          if (DEBUG) {
            console.log('🔵 TopoJSONLayer.click CALLED at', e.latlng.lat, e.latlng.lng)
            console.log('🔵 TopoJSON Feature properties:', feature.properties)
          }
          
          // 🚧 TODO: ハンドコーディングで上記仕様通りに実装
          
          // **重要修正**: サミットマーカーとの重複を避けるため、
          // CircleMarkerなどのマーカー要素がクリックされた場合は処理を停止
          if (e.originalEvent?.target) {
            const target = e.originalEvent.target as HTMLElement
            
            // より精密なマーカー検出: TopoJSONレイヤー自体は除外しない
            // HTMLElement と SVGElement の className 処理を分離
            let targetClassName = ''
            if (target.className) {
              if (typeof target.className === 'string') {
                targetClassName = target.className
              } else if ('baseVal' in target.className) {
                targetClassName = (target.className as SVGAnimatedString).baseVal
              }
            }
            if (target.classList?.contains('summit-marker') ||
                target.closest('.summit-marker') ||
                target.classList?.contains('leaflet-marker-icon') ||
                target.closest('.leaflet-marker-icon') ||
                target.classList?.contains('leaflet-marker-shadow') ||
                target.closest('.leaflet-marker-shadow') ||
                // CircleMarkerの特定検出（pathタグでクラス名に"summit-marker"含む場合のみ）
                (target.tagName === 'path' && targetClassName.includes('summit-marker')) ||
                (target.tagName === 'circle' && target.closest('.summit-marker'))) {
              if (DEBUG) console.log('🔵 TopoJSONLayer: Skipping click (summit marker detected)', target.tagName, target.className)
              return // サミットマーカーのクリックの場合は処理しない
            }
          }
          
          if (DEBUG) console.log('🔵 TopoJSONLayer: Processing park area click')
          
          const properties = feature.properties
          const { preferences } = useMapStore.getState()
          
          // Create park object from TopoJSON properties
          const park: Park = {
            potaCode: properties?.POTA || '',
            wwffCode: properties?.JAFF || '',
            parkNameJ: properties?.NAME || '',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            date: null,
            locid: [],
            act: 0,
            qsos: 0,
            activations: 0,
            attempts: 0,
          }

          // Create popup content
          const potaLink = park.potaCode ? `<a target="_blank" href="https://pota.app/#/park/${park.potaCode}">${park.potaCode}</a>` : ''
          const wwffLink = park.wwffCode ? `<a target="_blank" href="https://wwff.co/directory/?showRef=${park.wwffCode}">${park.wwffCode}</a>` : ''
          const referenceLinks = [potaLink, wwffLink].filter(Boolean).join(' / ')
          
          const locationURI = preferences.link_googlemap
            ? `https://www.google.com/maps/search/?api=1&query=${e.latlng.lat}%2C${e.latlng.lng}`
            : `https://maps.gsi.go.jp/#15/${e.latlng.lat}/${e.latlng.lng}`
            
          const coordinateText = `${Math.round(e.latlng.lat * 1000000) / 1000000},${Math.round(e.latlng.lng * 1000000) / 1000000}`
          const windyURL = `https://www.windy.com/${e.latlng.lat}/${e.latlng.lng}/meteogram?rain,${e.latlng.lat},${e.latlng.lng},11`

          const popupContent = `
            <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
              ${referenceLinks}<br>
              ${park.parkNameJ || ''}
              <br><br>
              位置:<a href="${locationURI}" target="_blank">${coordinateText}</a><br>
              🌤️☁️🌧️<a href="${windyURL}" target="_blank">Weather</a><br>
              ${preferences.enable_emulation ? '<button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
            </div>
          `

          layer.bindPopup(popupContent, { maxWidth: 400 }).openPopup()
          L.DomEvent.stopPropagation(e)
        },
        contextmenu: (e) => {
          const properties = feature.properties
          const { preferences } = useMapStore.getState()
          
          // Right-click shows additional debug info
          const jaffInfo = properties?.JAFF ? `${properties.JAFF}(${properties?.PID || ''},${properties?.UID || ''})` : ''
          const potaCode = properties?.POTA || ''
          const parkName = properties?.NAME || ''
          
          const locationURI = preferences.link_googlemap
            ? `https://www.google.com/maps/search/?api=1&query=${e.latlng.lat}%2C${e.latlng.lng}`
            : `https://maps.gsi.go.jp/#15/${e.latlng.lat}/${e.latlng.lng}`
            
          const coordinateText = `${Math.round(e.latlng.lat * 1000000) / 1000000},${Math.round(e.latlng.lng * 1000000) / 1000000}`
          const windyURL = `https://www.windy.com/${e.latlng.lat}/${e.latlng.lng}/meteogram?rain,${e.latlng.lat},${e.latlng.lng},11`

          const referenceLinks = []
          if (potaCode) referenceLinks.push(`<a target="_blank" href="https://pota.app/#/park/${potaCode}">${potaCode}</a>`)
          if (jaffInfo) referenceLinks.push(`<a target="_blank" href="https://wwff.co/directory/?showRef=${properties?.JAFF}">${jaffInfo}</a>`)

          const popupContent = `
            <div style="text-align:center;font-size:12px;line-height:1.4;min-width:200px;max-width:350px;">
              ${referenceLinks.join(' / ')}<br>
              ${parkName}
              <br><br>
              位置:<a href="${locationURI}" target="_blank">${coordinateText}</a><br>
              🌤️☁️🌧️<a href="${windyURL}" target="_blank">Weather</a><br>
              <small>Right-click debug info</small><br>
              ${preferences.enable_emulation ? '<button onclick="console.log(\'ActPaddle clicked\')" style="margin-top:5px;padding:2px 8px;font-size:11px;">📋 ActPaddle</button>' : ''}
            </div>
          `

          layer.bindPopup(popupContent, { maxWidth: 400 }).openPopup()
          L.DomEvent.stopPropagation(e)
        }
      })
    }
  }

  return (
    <GeoJSON
      data={geoJsonData}
      style={getFeatureStyle}
      onEachFeature={onEachFeature}
    />
  )
}

export default TopoJSONLayer