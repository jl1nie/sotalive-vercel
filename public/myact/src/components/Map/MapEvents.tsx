import React, { useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import type { PopupInfo } from '@/stores/mapStore'
import type { LatLng } from '@/types'
import { debugLog } from '@/config/debugConfig'

interface MapEventsProps {
  mapRef: React.MutableRefObject<L.Map | null>
}

/**
 * Component to handle map events (click, moveend, zoomend)
 * Uses centralized mapStore for all state management
 * Separated from main LeafletMap for single responsibility
 */
const MapEvents: React.FC<MapEventsProps> = ({ mapRef }) => {
  const { mapCenter, zoom, setMapCenter, setZoom, popupInfo } = useMapStore()
  
  // Access centralized state management functions
  const mapFullyInitialized = useMapStore((state) => state.mapFullyInitialized)
  const isUserInteraction = useMapStore((state) => state.isUserInteraction)
  const debounceStateUpdate = useMapStore((state) => state.debounceStateUpdate)
  const setUniquePopup = useMapStore((state) => state.setUniquePopup)

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
                  setUniquePopup({
                    position: retryPosition,
                    summit: undefined,
                    park: undefined,
                    isGPS: false
                  })
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
      
      // 統一的なポップアップ設定を使用（重複防止）
      setUniquePopup({
        position,
        summit: undefined, // 明示的にsummit情報を除外
        park: undefined, // 明示的にpark情報を除外
        isGPS: false
      })
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
      
      // ユーザー操作かどうか判定
      if (!isUserInteraction()) {
        return
      }
      
      // 状態更新を最小限に抑制 + デバウンス処理
      const currentCenter = mapCenter
      const centerChanged = Math.abs(currentCenter.lat - center.lat) > 0.0001 || 
                           Math.abs(currentCenter.lng - center.lng) > 0.0001
      const zoomChanged = Math.abs(zoom - newZoom) > 0.1
      
      // ポップアップ位置のログ記録（自動クリアはしない）
      const popupActive = Boolean(popupInfo)
      if (popupActive && popupInfo) {
        try {
          const popupLatLng = L.latLng(popupInfo.position.lat, popupInfo.position.lng)
          const isPopupInBounds = bounds.contains(popupLatLng)
          
          debugLog.event('Map moved: Popup position status', {
            popupPosition: popupInfo.position,
            isInBounds: isPopupInBounds,
            mapBounds: {
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest()
            }
          })
          
          if (!isPopupInBounds) {
            debugLog.event('Map moved: Popup is outside bounds but keeping visible (user control)')
          }
        } catch (error) {
          debugLog.event('Error checking popup bounds during map move:', error)
        }
      }
      
      const changeThreshold = popupActive ? 0.001 : 0.0001 // ポップアップ表示中は閾値を10倍に緩和
      
      const significantCenterChange = Math.abs(currentCenter.lat - center.lat) > changeThreshold || 
                                    Math.abs(currentCenter.lng - center.lng) > changeThreshold
      const significantZoomChange = Math.abs(zoom - newZoom) > 0.1
      
      if (significantCenterChange || significantZoomChange) {
        const debounceDelay = popupActive ? 1000 : 300 // ポップアップ表示中は1秒に延長
        
        debounceStateUpdate(() => {
          if (significantCenterChange) {
            setMapCenter({ lat: center.lat, lng: center.lng })
            debugLog.event('Map center updated from user movement:', { 
              lat: center.lat, 
              lng: center.lng,
              popupActive,
              delayUsed: debounceDelay
            })
          }
          if (significantZoomChange) {
            setZoom(newZoom)
            debugLog.event('Map zoom updated from user movement:', newZoom, 'popupActive:', popupActive)
          }
        }, debounceDelay)
      } else {
        debugLog.event('Map movement below threshold, skipping update:', {
          centerChanged: significantCenterChange,
          zoomChanged: significantZoomChange,
          popupActive,
          threshold: changeThreshold
        })
      }
    },
    zoomend: (e) => {
      const map = e.target
      const newZoom = map.getZoom()
      const bounds = map.getBounds()
      
      debugLog.event('Zoom changed to:', newZoom, 'bounds:', {
        min_lat: bounds.getSouth(),
        max_lat: bounds.getNorth(),
        min_lon: bounds.getWest(),
        max_lon: bounds.getEast()
      })
      
      // Note: 状態更新はmoveendハンドラに統一（zoomendはmoveendの後に発生するため）
      // ここでは境界情報のログ記録のみを行い、重複する状態更新は避ける
      debugLog.event('Zoom event processed (state updates handled by moveend)')
    }
  })
  
  // Store map reference for external access
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  
  return null
}

export default MapEvents