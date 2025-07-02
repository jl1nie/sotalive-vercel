import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, LayersControl, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Box } from '@mui/material'
import { useMapStore } from '@/stores/mapStore'
import { APIService } from '@/services/api'
import MapDataLoader from './MapDataLoader'
import { useReverseGeocoder } from '@/hooks/useReverseGeocoder'
import SummitMarker from '../Markers/SummitMarker'
import ParkMarker from '../Markers/ParkMarker'
import QTHMarker from '../Markers/QTHMarker'
import TopoJSONLayer from './TopoJSONLayer'
import APRSLayer from './APRSLayer'
import InfoPopup from './InfoPopup'
import MapDebugInfo from '../Debug/MapDebugInfo'
import APITestButton from '../Debug/APITestButton'
import type { Summit, Park, LatLng, OperationAlert } from '@/types'
import { debugLog } from '@/config/debugConfig'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface LeafletMapProps {
  selectedAlert?: OperationAlert | null
  sidePanelVisible?: boolean
}

const LeafletMap: React.FC<LeafletMapProps> = ({ selectedAlert, sidePanelVisible }) => {
  const mapRef = useRef<L.Map | null>(null)
  const [popupInfo, setPopupInfo] = useState<{
    position: LatLng
    summit?: Summit
    park?: Park
    isGPS?: boolean
  } | null>(null)
  
  // 地図完全初期化状態の管理
  const [mapFullyInitialized, setMapFullyInitialized] = useState(false)
  
  // popupInfo状態変化の監視
  useEffect(() => {
    debugLog.state('popupInfo state changed:', popupInfo)
    if (popupInfo?.summit) {
      debugLog.state('popupInfo contains summit:', popupInfo.summit.summitCode)
    }
    if (popupInfo?.park) {
      debugLog.state('popupInfo contains park:', popupInfo.park.potaCode || popupInfo.park.wwffCode)
    }
  }, [popupInfo])

  const { 
    mapCenter, 
    zoom, 
    currentLocation, 
    preferences,
    setMapCenter,
    setZoom 
  } = useMapStore()

  // Get marker data from store
  const { summits, parks } = useMapStore()
  
  // デバッグ情報
  debugLog.leafletMap('Rendering with preferences.sota_ref:', preferences.sota_ref)
  debugLog.leafletMap('summits.length:', summits.length)
  debugLog.leafletMap('parks.length:', parks.length)
  debugLog.leafletMap('First 3 summits:', summits.slice(0, 3))

  // Get geocoding info for popup position using the correct hook
  const { reverseGeocode } = useReverseGeocoder()
  const [geocodingInfo, setGeocodingInfo] = React.useState<any>(null)
  
  // Get geocoding info when popup position changes (for map clicks only, not for marker clicks)
  React.useEffect(() => {
    if (popupInfo && !popupInfo.summit && !popupInfo.park && !popupInfo.isGPS) {
      // 地図クリック専用のgeocoding処理（マーカークリック時は実行しない）
      const fetchGeocodingInfo = async () => {
        try {
          debugLog.event('Fetching geocoding for map click position:', popupInfo.position)
          const result = await reverseGeocode(
            popupInfo.position.lat, 
            popupInfo.position.lng, 
            true
          )
          setGeocodingInfo(result)
          debugLog.event('Geocoding result received for map click:', result)
        } catch (error) {
          console.error('Geocoding error:', error)
          setGeocodingInfo({ errors: 'ERROR' })
        }
      }
      fetchGeocodingInfo()
    } else {
      // マーカークリック時やGPS位置時はgeocodingInfo をクリア
      setGeocodingInfo(null)
    }
  }, [popupInfo, reverseGeocode])

  const leafletCenter: [number, number] = [mapCenter.lat, mapCenter.lng]

  useEffect(() => {
    // Any map initialization logic can go here
    return () => {
      // Cleanup if needed
    }
  }, [])

  // Handle side panel visibility changes - invalidate map size while preserving center
  useEffect(() => {
    if (mapRef.current) {
      // Wait for panel animation to complete, then resize map
      const timeout = setTimeout(() => {
        const map = mapRef.current
        if (map) {
          // Invalidate size while preserving the current center position
          // The 'pan' option keeps the current center position stable
          map.invalidateSize({
            pan: false,    // Don't pan to maintain position
            debounceMoveend: true // Debounce moveend events to avoid conflicts
          })
          
          const center = map.getCenter()
          const zoom = map.getZoom()
          debugLog.leafletMap('Map size invalidated with position preserved:', {
            center: { lat: center.lat, lng: center.lng },
            zoom: zoom,
            sidePanelVisible
          })
        }
      }, 350) // Slightly longer than the 300ms panel animation
      
      return () => clearTimeout(timeout)
    }
  }, [sidePanelVisible])

  // Update map view when mapCenter or zoom changes from store
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current
      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()
      
      // Check if we need to update the map position
      const centerChanged = Math.abs(currentCenter.lat - mapCenter.lat) > 0.001 || 
                           Math.abs(currentCenter.lng - mapCenter.lng) > 0.001
      const zoomChanged = currentZoom !== zoom
      
      if (centerChanged || zoomChanged) {
        debugLog.leafletMap('Updating map view from store:', {
          from: { lat: currentCenter.lat, lng: currentCenter.lng, zoom: currentZoom },
          to: { lat: mapCenter.lat, lng: mapCenter.lng, zoom }
        })
        
        map.setView([mapCenter.lat, mapCenter.lng], zoom, {
          animate: true,
          duration: 1.0 // Smooth animation over 1 second
        })
      }
    }
  }, [mapCenter, zoom])

  // 地図完全初期化の監視
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current
      
      const checkMapInitialization = () => {
        try {
          // 地図の基本機能が利用可能かチェック
          const center = map.getCenter()
          const size = map.getSize()
          const zoom = map.getZoom()
          const bounds = map.getBounds()
          
          // 座標変換機能のテスト
          const testPoint = map.latLngToContainerPoint([35.6762, 139.6503])
          
          // 地図コンテナのサイズが確定しているかチェック
          const container = map.getContainer()
          const containerSize = container.offsetWidth * container.offsetHeight
          
          // 条件: 全ての値が有効で、座標変換が正常、コンテナサイズが確定
          const isFullyReady = center && size && zoom && bounds && 
                               testPoint && testPoint.x > 0 && testPoint.y > 0 &&
                               containerSize > 0
          
          if (isFullyReady && !mapFullyInitialized) {
            debugLog.leafletMap('Map fully initialized:', {
              center: { lat: center.lat, lng: center.lng },
              size: { x: size.x, y: size.y },
              zoom,
              containerSize,
              testPoint: { x: testPoint.x, y: testPoint.y }
            })
            setMapFullyInitialized(true)
          }
        } catch (error) {
          debugLog.leafletMap('Map initialization check failed:', error)
        }
      }
      
      // 複数のイベントで初期化状態をチェック
      map.on('load', checkMapInitialization)
      map.on('moveend', checkMapInitialization)
      map.on('zoomend', checkMapInitialization)
      map.on('resize', checkMapInitialization)
      
      // 定期チェック（リロード直後の初期化用）
      const initCheckInterval = setInterval(checkMapInitialization, 200)
      
      // 最大5秒で初期化を強制完了
      const forceInitTimeout = setTimeout(() => {
        debugLog.leafletMap('Forcing map initialization completion after 5s')
        setMapFullyInitialized(true)
        clearInterval(initCheckInterval)
      }, 5000)
      
      // 初回チェック
      setTimeout(checkMapInitialization, 100)
      
      return () => {
        map.off('load', checkMapInitialization)
        map.off('moveend', checkMapInitialization)
        map.off('zoomend', checkMapInitialization)
        map.off('resize', checkMapInitialization)
        clearInterval(initCheckInterval)
        clearTimeout(forceInitTimeout)
      }
    }
  }, [mapRef.current, mapFullyInitialized])

  // Component to handle map events
  const MapEvents = () => {
    const map = useMapEvents({
      click: (e) => {
        debugLog.event('Map click detected at', e.latlng.lat, e.latlng.lng)
        debugLog.event('Original event target:', e.originalEvent?.target)
        
        // マーカークリックイベントと地図クリックを確実に分離
        // originalEventのtargetがマーカー要素の場合はスキップ
        if (e.originalEvent?.target) {
          const target = e.originalEvent.target as HTMLElement
          debugLog.event('Target element:', target.tagName, target.className)
          
          // より幅広いマーカー要素を検出（CircleMarker, SVG要素, パス要素含む）
          if (target.classList?.contains('leaflet-interactive') || 
              target.closest('.leaflet-interactive') ||
              target.tagName === 'path' ||
              target.tagName === 'circle' ||
              target.closest('svg') ||
              target.closest('.leaflet-marker-icon') ||
              target.closest('.leaflet-marker-shadow') ||
              // CircleMarkerはpathタグでレンダリングされるため追加検出
              (target.tagName === 'path' && target.closest('.leaflet-overlay-pane'))) {
            debugLog.event('Skipping map click (marker/interactive element detected)')
            return
          }
        }
        
        debugLog.event('Processing as map click (not marker)')
        debugLog.event('Map initialization status:', mapFullyInitialized)
        
        // 地図初期化未完了時の安全対策
        if (!mapFullyInitialized) {
          debugLog.event('Map not fully initialized, applying safety measures')
          
          // 地図サイズと座標変換の強制再計算
          if (mapRef.current) {
            try {
              mapRef.current.invalidateSize({ pan: false, debounceMoveend: true })
              
              // 座標変換テスト
              const testPoint = mapRef.current.latLngToContainerPoint([e.latlng.lat, e.latlng.lng])
              debugLog.event('Coordinate conversion test:', testPoint)
              
              // 異常な座標変換結果の場合は処理を遅延
              if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
                  testPoint.x > 10000 || testPoint.y > 10000) {
                debugLog.event('Abnormal coordinate conversion, delaying popup')
                
                // 500ms後に再試行
                setTimeout(() => {
                  debugLog.event('Retrying map click after coordinate stabilization')
                  if (mapRef.current) {
                    mapRef.current.invalidateSize()
                    
                    // 再度ポップアップ表示（安全な状態で）
                    const retryPosition: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng }
                    setPopupInfo(null)
                    setTimeout(() => {
                      setPopupInfo({
                        position: retryPosition,
                        summit: undefined,
                        park: undefined,
                        isGPS: false
                      })
                    }, 10)
                  }
                }, 500)
                return
              }
            } catch (error) {
              debugLog.event('Error in safety measures:', error)
            }
          }
        }
        
        debugLog.leafletMap('Setting map click popup (no summit/park info)')
        const position: LatLng = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }
        
        // 前のポップアップをクリア（2重ポップアップ防止）
        setPopupInfo(null)
        
        // 地図初期化完了時は通常処理、未完了時は少し長めの遅延
        const delay = mapFullyInitialized ? 10 : 100
        setTimeout(() => {
          setPopupInfo({ 
            position,
            summit: undefined, // 明示的にsummit情報を除外
            park: undefined, // 明示的にpark情報を除外
            isGPS: false
          })
          debugLog.event(`Map click popup set after ${delay}ms delay (initialized: ${mapFullyInitialized})`)
        }, delay)
      },
      moveend: (e) => {
        const map = e.target
        const center = map.getCenter()
        const newZoom = map.getZoom()
        const bounds = map.getBounds()
        
        debugLog.event('Map moved to:', {
          center: { lat: center.lat, lng: center.lng },
          zoom: newZoom,
          bounds: {
            min_lat: bounds.getSouth(),
            max_lat: bounds.getNorth(),
            min_lon: bounds.getWest(),
            max_lon: bounds.getEast()
          }
        })
        
        // 状態更新を最小限に抑制
        const currentCenter = mapCenter
        const centerChanged = Math.abs(currentCenter.lat - center.lat) > 0.001 || 
                             Math.abs(currentCenter.lng - center.lng) > 0.001
        const zoomChanged = zoom !== newZoom
        
        if (centerChanged) {
          setMapCenter({ lat: center.lat, lng: center.lng })
        }
        if (zoomChanged) {
          setZoom(newZoom)
        }
      },
      zoomend: (e) => {
        const map = e.target
        const center = map.getCenter()
        const newZoom = map.getZoom()
        
        const bounds = map.getBounds()
        debugLog.event('Zoom changed to:', newZoom, 'bounds:', {
          min_lat: bounds.getSouth(),
          max_lat: bounds.getNorth(),
          min_lon: bounds.getWest(),
          max_lon: bounds.getEast()
        })
        
        // ズーム変更時のみ状態更新
        if (zoom !== newZoom) {
          setZoom(newZoom)
          setMapCenter({ lat: center.lat, lng: center.lng })
        }
      }
    })
    
    // Store map reference for external access
    useEffect(() => {
      mapRef.current = map
    }, [map])
    
    return null
  }

  const handleSummitClick = React.useCallback(async (summit: Summit, latlng: any) => {
    debugLog.event('handleSummitClick called for summit:', summit.summitCode, 'at', summit.latitude, summit.longitude)
    debugLog.event('handleSummitClick: summit data:', summit)
    debugLog.event('handleSummitClick: map initialization status:', mapFullyInitialized)
    
    // 地図初期化未完了時の安全対策
    if (!mapFullyInitialized && mapRef.current) {
      debugLog.event('Summit click during map initialization, applying safety measures')
      try {
        mapRef.current.invalidateSize({ pan: false, debounceMoveend: true })
        
        // 座標変換テスト
        const testPoint = mapRef.current.latLngToContainerPoint([summit.latitude, summit.longitude])
        debugLog.event('Summit coordinate conversion test:', testPoint)
        
        // 異常な座標変換結果の場合は処理を遅延
        if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
            testPoint.x > 10000 || testPoint.y > 10000) {
          debugLog.event('Abnormal summit coordinate conversion, delaying popup')
          
          // 300ms後に再試行
          setTimeout(() => {
            debugLog.event('Retrying summit click after coordinate stabilization')
            handleSummitClick(summit, latlng)
          }, 300)
          return
        }
      } catch (error) {
        debugLog.event('Error in summit click safety measures:', error)
      }
    }
    
    try {
      // レガシー実装と同じ検索API使用: /sota/summits/search?lat=xxx&lon=xxx&dist=200
      const searchUrl = `https://sotaapp2.sotalive.net/api/v2/sota/summits/search?lat=${summit.latitude}&lon=${summit.longitude}&dist=200`
      debugLog.api('Fetching summit details from:', searchUrl)
      
      const response = await fetch(searchUrl)
      const searchResults = await response.json()
      
      if (searchResults && searchResults.length > 0) {
        // 最も近いサミット（通常は最初の結果）を使用
        const detailedSummit = searchResults[0]
        debugLog.api('Found detailed summit data:', detailedSummit)
        
        // レガシー形式のサミットデータにマップ
        const enrichedSummit = {
          ...summit,
          summitCode: detailedSummit.summitCode,
          summitName: detailedSummit.summitName,
          summitNameJ: detailedSummit.summitNameJ,
          latitude: detailedSummit.latitude,
          longitude: detailedSummit.longitude,
          altM: detailedSummit.altM,
          points: detailedSummit.points,
          bonusPoints: detailedSummit.bonusPoints,
          maidenhead: detailedSummit.maidenhead,
          cityJ: detailedSummit.cityJ,
          activationCount: detailedSummit.activationCount,
          activationDate: detailedSummit.activationDate,
          activationCall: detailedSummit.activationCall
        }
        
        // レガシー実装と同じ：サミット詳細 + リバースジオコーディング
        try {
          const geocodingResult = await reverseGeocode(detailedSummit.latitude, detailedSummit.longitude, true)
          setGeocodingInfo(geocodingResult)
          debugLog.event('handleSummitClick: Geocoding completed for summit')
        } catch (error) {
          console.error('handleSummitClick: Geocoding error:', error)
          setGeocodingInfo({ errors: 'ERROR' })
        }
        
        // 前のポップアップをクリア（2重ポップアップ防止）
        setPopupInfo(null)
        setTimeout(() => {
          setPopupInfo({
            position: { lat: summit.latitude, lng: summit.longitude },
            summit: enrichedSummit,
            park: undefined, // 明示的にpark情報を除外
            isGPS: false
          })
          debugLog.event('handleSummitClick: Detailed summit popup set')
        }, 10)
      } else {
        // API結果が無い場合は基本データを使用
        // 前のポップアップをクリア（2重ポップアップ防止）
        setPopupInfo(null)
        setTimeout(() => {
          setPopupInfo({
            position: { lat: summit.latitude, lng: summit.longitude },
            summit,
            park: undefined,
            isGPS: false
          })
        }, 10)
        debugLog.event('handleSummitClick: Fallback to basic summit data')
      }
    } catch (error) {
      console.error('handleSummitClick: Error fetching detailed summit info:', error)
      // エラー時は基本データを使用
      setPopupInfo({
        position: { lat: summit.latitude, lng: summit.longitude },
        summit,
        park: undefined,
        isGPS: false
      })
      debugLog.event('handleSummitClick: Error fallback to basic summit data')
    }
  }, [setPopupInfo, mapFullyInitialized, reverseGeocode])

  const handleParkClick = async (park: Park, latlng: [number, number]) => {
    debugLog.event('handleParkClick called for park:', park.potaCode || park.wwffCode, 'at', park.latitude, park.longitude)
    debugLog.event('handleParkClick: map initialization status:', mapFullyInitialized)
    
    // 地図初期化未完了時の安全対策
    if (!mapFullyInitialized && mapRef.current) {
      debugLog.event('Park click during map initialization, applying safety measures')
      try {
        mapRef.current.invalidateSize({ pan: false, debounceMoveend: true })
        
        // 座標変換テスト
        const testPoint = mapRef.current.latLngToContainerPoint([latlng[0], latlng[1]])
        debugLog.event('Park coordinate conversion test:', testPoint)
        
        // 異常な座標変換結果の場合は処理を遅延
        if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
            testPoint.x > 10000 || testPoint.y > 10000) {
          debugLog.event('Abnormal park coordinate conversion, delaying popup')
          
          // 300ms後に再試行
          setTimeout(() => {
            debugLog.event('Retrying park click after coordinate stabilization')
            handleParkClick(park, latlng)
          }, 300)
          return
        }
      } catch (error) {
        debugLog.event('Error in park click safety measures:', error)
      }
    }
    
    try {
      const referenceCode = park.potaCode || park.wwffCode
      if (referenceCode) {
        debugLog.api('Fetching park details for:', referenceCode)
        const detailsResponse = await APIService.searchReferenceDetails(referenceCode)
        
        if (detailsResponse?.candidates && detailsResponse.candidates.length > 0) {
          const detailedPark = detailsResponse.candidates[0]
          // Merge the basic park data with detailed API response
          const enrichedPark = {
            ...park,
            ...detailedPark
          }
          debugLog.api('Enriched park details:', enrichedPark)
          
          // 前のポップアップをクリア（2重ポップアップ防止）
          setPopupInfo(null)
          setTimeout(() => {
            setPopupInfo({
              position: { lat: latlng[0], lng: latlng[1] },
              park: enrichedPark,
              summit: undefined, // 明示的にsummit情報を除外
              isGPS: false
            })
          }, 10)
        } else {
          // Fallback to basic park data if API fails
          debugLog.api('No detailed data found, using basic park info')
          // 前のポップアップをクリア（2重ポップアップ防止）
          setPopupInfo(null)
          setTimeout(() => {
            setPopupInfo({
              position: { lat: latlng[0], lng: latlng[1] },
              park,
              summit: undefined, // 明示的にsummit情報を除外
              isGPS: false
            })
          }, 10)
        }
      } else {
        // No reference code available, use basic data
        setPopupInfo({
          position: { lat: latlng[0], lng: latlng[1] },
          park
        })
      }
    } catch (error) {
      debugLog.api('Failed to fetch park details:', error)
      // Fallback to basic park data if API fails
      setPopupInfo({
        position: { lat: latlng[0], lng: latlng[1] },
        park
      })
    }
  }

  const handleQTHClick = (position: LatLng) => {
    debugLog.event('handleQTHClick called at:', position.lat, position.lng)
    debugLog.event('handleQTHClick: map initialization status:', mapFullyInitialized)
    
    // 地図初期化未完了時の安全対策
    if (!mapFullyInitialized && mapRef.current) {
      debugLog.event('QTH click during map initialization, applying safety measures')
      try {
        mapRef.current.invalidateSize({ pan: false, debounceMoveend: true })
        
        // 座標変換テスト
        const testPoint = mapRef.current.latLngToContainerPoint([position.lat, position.lng])
        debugLog.event('QTH coordinate conversion test:', testPoint)
        
        // 異常な座標変換結果の場合は処理を遅延
        if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
            testPoint.x > 10000 || testPoint.y > 10000) {
          debugLog.event('Abnormal QTH coordinate conversion, delaying popup')
          
          // 200ms後に再試行
          setTimeout(() => {
            debugLog.event('Retrying QTH click after coordinate stabilization')
            handleQTHClick(position)
          }, 200)
          return
        }
      } catch (error) {
        debugLog.event('Error in QTH click safety measures:', error)
      }
    }
    
    // 前のポップアップをクリア（2重ポップアップ防止）
    setPopupInfo(null)
    
    // 地図初期化完了時は通常処理、未完了時は少し長めの遅延
    const delay = mapFullyInitialized ? 10 : 50
    setTimeout(() => {
      setPopupInfo({
        position,
        summit: undefined, // 明示的にsummit情報を除外
        park: undefined, // 明示的にpark情報を除外
        isGPS: true
      })
      debugLog.event(`QTH popup set after ${delay}ms delay (initialized: ${mapFullyInitialized})`)
    }, delay)
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Debug info overlay */}
      <MapDebugInfo />
      
      {/* API test button */}
      <APITestButton />
      
      <MapContainer
        center={leafletCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <MapEvents />
        <MapDataLoader />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="地理院地形図">
            <TileLayer
              url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
              attribution='<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
              maxZoom={18}
              maxNativeZoom={18}
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="全国最新写真">
            <TileLayer
              url="https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"
              attribution='<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
              maxZoom={18}
              maxNativeZoom={18}
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="OSM">
            <TileLayer
              url="https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=767750c193e54ceeb3aee08d880bdb90"
              attribution='<a href="https://www.thunderforest.com/">Thunderforest</a>'
              maxZoom={18}
              maxNativeZoom={18}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* TopoJSON Layer for park areas */}
        <TopoJSONLayer />

        {/* APRS tracks */}
        <APRSLayer />

        {/* Summit markers */}
        {preferences.sota_ref && summits.map((summit, index) => (
          <SummitMarker
            key={`summit-${summit.summitCode}-${index}`}
            summit={summit}
            zoom={zoom}
            activationCount={summit.activationCount}
            onMarkerClick={handleSummitClick}
          />
        ))}

        {/* Park markers */}
        {(preferences.pota_ref || preferences.jaff_ref) && parks.map((park, index) => (
          <ParkMarker
            key={`park-${park.potaCode || park.wwffCode}-${index}`}
            park={park}
            showActivatedOnly={preferences.show_potaactlog}
            isPermanentTooltip={preferences.popup_permanent}
            onMarkerClick={handleParkClick}
          />
        ))}

        {/* Current GPS location marker */}
        {currentLocation && (
          <QTHMarker
            position={currentLocation}
            onMarkerClick={handleQTHClick}
            onPositionChange={(newPos) => {
              // TODO: Update current location in store
              console.log('QTH marker moved to:', newPos)
            }}
          />
        )}

        {/* Info popup */}
        {popupInfo && (
          // マーカークリック時は即座に表示、地図クリック時はgeocodingInfo取得後に表示
          (popupInfo.summit || popupInfo.park || popupInfo.isGPS || geocodingInfo) && (
            <InfoPopup
              position={popupInfo.position}
              summit={popupInfo.summit}
              park={popupInfo.park}
              geocodingInfo={geocodingInfo}
              isGPS={popupInfo.isGPS}
            />
          )
        )}
      </MapContainer>
    </Box>
  )
}

export default LeafletMap