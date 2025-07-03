import React from 'react'
import { Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Park } from '@/types'
import { useMapStore } from '@/stores/mapStore'
import { debugLog } from '@/config/debugConfig'
import '@/styles/extramarkers.css'

// Custom marker icon for parks (React標準DivIconで四角形実装)
const createParkIcon = (color: string) => {
  const colorMap: { [key: string]: string } = {
    'red': '#dc3545',
    'yellow': '#ffc107', 
    'orange': '#fd7e14',
    'green-light': '#28a745'
  }
  
  const backgroundColor = colorMap[color] || '#dc3545'
  
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}dd 100%);
        border: 2px solid #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2);
        position: relative;
        cursor: pointer;
      ">
        <i class="fas fa-tree" style="
          color: white; 
          font-size: 18px; 
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
        "></i>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${backgroundColor};
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    className: 'custom-park-marker',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

interface ParkMarkerProps {
  park: Park
  showActivatedOnly?: boolean
  isPermanentTooltip?: boolean
  // Remove onMarkerClick prop - handle directly in component
}

const ParkMarker: React.FC<ParkMarkerProps> = ({
  park,
  showActivatedOnly = false,
  isPermanentTooltip = true
}) => {
  // Direct access to map instance and store actions
  const map = useMap()
  const handleParkClickAction = useMapStore((state) => state.handleParkClick)
  // Determine marker color based on activation status (レガシー実装と同じ)
  // legacy/index.html:1520-1580行 addParkMarkers() のマーカー色分けロジック移植
  // - red: アクティベーション済み（date!=null && locid.length==1 && act>0）
  // - yellow: アクティベーション試行済み（showActivatedOnly時の未完了）
  // - orange: 複数ロケーション（locid.length!=1）
  // - green-light: 未アクティベーション（date==null）
  const getMarkerColor = () => {
    const DEBUG = false // デバッグログ制御
    
    if (DEBUG) {
      console.log('ParkMarker: Color logic for park:', {
        park: park.potaCode || park.wwffCode,
        date: park.date,
        locid: park.locid,
        locidLength: park.locid?.length,
        act: park.act,
        showActivatedOnly
      })
    }
    
    if (park.date != null) {
      if (park.locid && park.locid.length === 1) {
        if (!showActivatedOnly || (park.act && park.act > 0)) {
          if (DEBUG) console.log('ParkMarker: Color -> red')
          return 'red'
        } else {
          if (DEBUG) console.log('ParkMarker: Color -> yellow')
          return 'yellow'
        }
      } else {
        if (DEBUG) console.log('ParkMarker: Color -> orange')
        return 'orange'
      }
    } else {
      if (DEBUG) console.log('ParkMarker: Color -> green-light')
      return 'green-light'
    }
  }

  const position: [number, number] = [park.latitude, park.longitude]
  const markerColor = getMarkerColor()
  const icon = createParkIcon(markerColor)

  const handleClick = async (e: L.LeafletMouseEvent) => {
    debugLog.event('Park marker clicked:', park.potaCode || park.wwffCode)
    debugLog.event('Park marker click event:', e)
    
    // Enhanced event propagation stopping
    e.originalEvent?.stopPropagation()
    e.originalEvent?.stopImmediatePropagation()
    
    if (!park.latitude || !park.longitude) {
      console.error('ParkMarker: Missing coordinates:', park)
      return
    }
    
    debugLog.event('Directly calling mapStore action for park:', park.potaCode || park.wwffCode)
    
    try {
      // Direct call to mapStore action - no intermediate handler layer
      await handleParkClickAction(park, position, map)
      debugLog.event('Park click handled successfully by mapStore')
    } catch (error) {
      console.error('ParkMarker: Error in direct mapStore action call:', error)
    }
  }

  // Create display text for tooltip
  const getDisplayText = () => {
    const parts: string[] = []
    if (park.potaCode) parts.push(park.potaCode)
    if (park.wwffCode) parts.push(park.wwffCode)
    return parts.join('/')
  }

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
      // Ensure park markers have lower z-index than summit markers
      zIndexOffset={-1000}
    >
      <Tooltip
        permanent={isPermanentTooltip}
        direction="center"
        offset={[0, 20]}
      >
        {getDisplayText()}
      </Tooltip>
    </Marker>
  )
}

export default ParkMarker