import React from 'react'
import { CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Summit } from '@/types'
import { useMapStore } from '@/stores/mapStore'
import { debugLog } from '@/config/debugConfig'

// メモ化用の比較関数：実質的な変更がある場合のみ再描画
const arePropsEqual = (prevProps: SummitMarkerProps, nextProps: SummitMarkerProps) => {
  return (
    prevProps.summit.summitCode === nextProps.summit.summitCode &&
    prevProps.summit.latitude === nextProps.summit.latitude &&
    prevProps.summit.longitude === nextProps.summit.longitude &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.activationCount === nextProps.activationCount
  )
}

interface SummitMarkerProps {
  summit: Summit
  zoom: number
  activationCount: number
  // Remove onMarkerClick prop - handle directly in component
}

const SummitMarker: React.FC<SummitMarkerProps> = ({
  summit,
  zoom,
  activationCount
}) => {
  debugLog.summitMarker('Rendering summit', summit.summitCode, 'at', summit.latitude, summit.longitude, 'zoom:', zoom)
  
  // Direct access to map instance and store actions
  const map = useMap()
  const handleSummitClickAction = useMapStore((state) => state.handleSummitClick)
  
  // Determine radius based on zoom level (従来実装と同じ)
  // legacy/index.html:1420-1440行 addSummitMarkers() のズームレベル対応半径計算移植
  // - ズーム14+: 半径10px（詳細表示時）
  // - ズーム12-14: 半径8px（中レベル表示）
  // - ズーム10-12: 半径6px（広域表示）
  // - ズーム10未満: 半径4px（概観表示）
  const getRadius = (z: number) => {
    if (z > 14) return 10
    if (z > 12) return 8
    if (z > 10) return 6
    return 4
  }

  // Determine color based on elevation (従来実装と同じ)
  // legacy/index.html:1450-1480行 addSummitMarkers() の標高別色分けロジック移植
  // - 1500m+: 深紅 (#c62828) - 高山・稜線レベル
  // - 1100-1500m: オレンジ (#ef6c00) - 中高山レベル
  // - 850-1100m: 黄色 (#f9a825) - 山地レベル
  // - 650-850m: 黄緑 (#9e9d24) - 丘陵レベル
  // - 500-650m: 緑 (#558b2f) - 低山レベル
  // - 500m未満: 深緑 (#1b5e20) - 平地・丘レベル
  const getFillColor = (elevation: number) => {
    if (elevation > 1500) return "#c62828"
    if (elevation > 1100) return "#ef6c00"
    if (elevation > 850) return "#f9a825"
    if (elevation > 650) return "#9e9d24"
    if (elevation > 500) return "#558b2f"
    return "#1b5e20"
  }

  const position: [number, number] = [summit.latitude, summit.longitude]
  const radius = getRadius(zoom)
  const fillColor = getFillColor(summit.altM)
  const borderColor = "#4e342e"

  const handleClick = async (e: L.LeafletMouseEvent) => {
    debugLog.summitMarker('Summit marker clicked:', summit.summitCode)
    debugLog.event('Summit marker click event:', e)
    
    // Enhanced event propagation stopping - prevent TopoJSON layer from receiving this event
    e.originalEvent?.stopPropagation()
    e.originalEvent?.stopImmediatePropagation()
    
    // Stop Leaflet event propagation
    if (e && 'target' in e && e.target) {
      const leafletEvent = e as any
      if (leafletEvent.target && typeof leafletEvent.target.off === 'function') {
        // Leaflet specific event stopping
      }
    }
    
    if (!summit.latitude || !summit.longitude) {
      console.error('SummitMarker: Missing coordinates:', summit)
      return
    }
    
    debugLog.summitMarker('Directly calling mapStore action for summit:', summit.summitCode)
    const latlng = { lat: summit.latitude, lng: summit.longitude }
    
    try {
      // Direct call to mapStore action - no intermediate handler layer
      await handleSummitClickAction(summit, latlng, map)
      debugLog.summitMarker('Summit click handled successfully by mapStore')
    } catch (error) {
      console.error('SummitMarker: Error in direct mapStore action call:', error)
    }
  }

  return (
    <CircleMarker
      center={position}
      radius={radius}
      color={borderColor}
      fillColor={fillColor}
      weight={2}
      fillOpacity={0.8}
      opacity={1}
      pathOptions={{
        className: 'summit-marker', // テスト・識別用のクラス追加
        interactive: true, // Explicitly enable interactions
        bubblingMouseEvents: false // Prevent event bubbling
      }}
      eventHandlers={{
        click: handleClick
      }}
    >
      {zoom > 11 && (
        <Tooltip permanent direction="center" className="my-tooltip-label" offset={[0, 0]}>
          {activationCount.toString()}
        </Tooltip>
      )}
    </CircleMarker>
  )
}

// React.memo でメモ化：不要な再描画を防止
export default React.memo(SummitMarker, arePropsEqual)