import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import { useMapStore } from '@/stores/mapStore'
import { APIService } from '@/services/api'
import type { Summit, Park } from '@/types'

// Component that loads map data based on current map view
const MapDataLoader: React.FC = () => {
  const map = useMap()
  const { 
    preferences, 
    setSummits, 
    setParks,
    clearMarkers 
  } = useMapStore()
  
  // 重複実行防止のため、現在の境界を記録
  const lastBoundsRef = useRef<string>('')
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)

  // 境界変更検出関数
  const getBoundsKey = useCallback(() => {
    if (!map) return ''
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    // 小数点3桁で丸めて境界キーを生成（重複検出精度向上）
    return `${bounds.getSouth().toFixed(3)},${bounds.getWest().toFixed(3)},${bounds.getNorth().toFixed(3)},${bounds.getEast().toFixed(3)},${zoom.toFixed(1)}`
  }, [map])

  // データロード関数（メモ化で重複実行防止）
  const loadMapData = useCallback(async () => {
    if (!map || isLoadingRef.current) {
      console.log('MapDataLoader: Skipping load (no map or already loading)')
      return
    }

    const currentBounds = getBoundsKey()
    if (currentBounds === lastBoundsRef.current) {
      console.log('MapDataLoader: Skipping load (same bounds)', currentBounds)
      return
    }

    // ポップアップ表示は独立：マーカーデータ読み込みは通常通り実行
    // （ポップアップ再描画問題は別の箇所で解決）

    isLoadingRef.current = true
    lastBoundsRef.current = currentBounds

    try {
      const bounds = map.getBounds()
      const center = map.getCenter()
      const zoom = map.getZoom()
        
        console.log('MapDataLoader: Loading data for bounds:', {
          min_lat: bounds.getSouth(),
          max_lat: bounds.getNorth(),
          min_lon: bounds.getWest(),
          max_lon: bounds.getEast(),
          zoom
        })

        // Determine elevation and area filters based on zoom level
        let minElev = 0
        let minArea = 0
        
        if (zoom < preferences.zoom_threshold) {
          if (zoom > 9) {
            minElev = 800
            minArea = 1
          } else if (zoom > 8) {
            minElev = 1000
            minArea = 10
          } else if (zoom > 6) {
            minElev = 1500
            minArea = 20
          } else {
            // 日本最高峰は富士山3776m なので4000mでは何も表示されない
            // 低いズームレベルでも主要な山岳（2000m以上）を表示
            minElev = 2000
            minArea = 30
          }
        }

        // Get POTA log ID if needed
        const logId = preferences.show_potalog 
          ? (preferences.show_potaactlog 
            ? preferences.pota_activator_uuid 
            : preferences.pota_hunter_uuid)
          : undefined

        // Check if we should load any data
        const shouldLoadData = preferences.sota_ref || preferences.pota_ref || preferences.jaff_ref
        
        if (!shouldLoadData) {
          console.log('MapDataLoader: No references enabled, clearing markers')
          clearMarkers()
          return
        }

        // Call API
        const apiParams = {
          min_lat: bounds.getSouth(),
          min_lon: bounds.getWest(),
          max_lat: bounds.getNorth(),
          max_lon: bounds.getEast(),
          min_elev: minElev,
          min_area: minArea,
          log_id: logId || undefined,
        }

        console.log('MapDataLoader: Calling API with params:', apiParams)
        const data = await APIService.searchInBounds(apiParams)

        if (data) {
          console.log('MapDataLoader: Received transformed data:', data)
          
          // Filter based on preferences (Anti-Corruption Layer handles transformation)
          const summits = preferences.sota_ref ? data.summits : []
          const parks = data.parks.filter(park => {
            const showPOTA = preferences.pota_ref && park.potaCode
            const showJAFF = preferences.jaff_ref && park.wwffCode
            return showPOTA || showJAFF
          })

          // Update store（React.memoとstable keyによる最適化に委ねる）
          console.log('MapDataLoader: Updating store with summits:', summits.length, 'parks:', parks.length)
          setSummits(summits)
          setParks(parks)
      } else {
        console.log('MapDataLoader: No data received, clearing markers')
        clearMarkers()
      }
    } catch (error) {
      console.error('MapDataLoader: Error loading data:', error)
      clearMarkers()
    } finally {
      isLoadingRef.current = false
    }
  }, [map, preferences, setSummits, setParks, clearMarkers, getBoundsKey])

  // デバウンス付きロード関数
  const debouncedLoadData = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }
    loadTimeoutRef.current = setTimeout(loadMapData, 500) // 500ms debounce
  }, [loadMapData])

  // 地図イベント監視
  useEffect(() => {
    if (!map) return

    console.log('MapDataLoader: Setting up map event listeners')

    // 初回ロード
    debouncedLoadData()

    // イベントリスナー設定
    map.on('moveend', debouncedLoadData)
    map.on('zoomend', debouncedLoadData)

    return () => {
      console.log('MapDataLoader: Cleaning up map event listeners')
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
      map.off('moveend', debouncedLoadData)
      map.off('zoomend', debouncedLoadData)
    }
  }, [map, debouncedLoadData])

  // プリファレンス変更時の処理（イベント発火を避けて直接ロード）
  useEffect(() => {
    if (!map) return
    
    console.log('MapDataLoader: Preferences changed, forcing reload')
    // 境界キーをクリアして強制再ロード
    lastBoundsRef.current = ''
    debouncedLoadData()
  }, [preferences.sota_ref, preferences.pota_ref, preferences.jaff_ref, preferences.zoom_threshold, preferences.show_potalog, preferences.show_potaactlog, debouncedLoadData])

  return <div data-testid="map-data-loader" style={{ display: 'none' }} />
}

export default MapDataLoader