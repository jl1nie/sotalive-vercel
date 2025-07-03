import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { debugLog } from '@/config/debugConfig'

/**
 * Custom hook for managing map initialization state
 * Handles complex initialization checks and provides ready state
 */
export const useMapInitialization = (map: L.Map | null) => {
  const [mapFullyInitialized, setMapFullyInitialized] = useState(false)

  // 地図完全初期化の監視
  useEffect(() => {
    if (!map) return

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
  }, [map, mapFullyInitialized])

  // Hook now only provides UI behavior - no complex state management
  return {
    mapFullyInitialized
  }
}