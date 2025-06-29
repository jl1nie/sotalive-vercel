import React from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '@/types'

// GPS位置マーカー用のアイコン
const createQTHIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #ffc107;
        width: 30px;
        height: 30px;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: black;
      ">
        📍
      </div>
    `,
    className: 'custom-qth-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })
}

interface QTHMarkerProps {
  position: LatLng
  draggable?: boolean
  onPositionChange?: (newPosition: LatLng) => void
  onMarkerClick?: (position: LatLng) => void
}

const QTHMarker: React.FC<QTHMarkerProps> = ({
  position,
  draggable = true,
  onPositionChange,
  onMarkerClick
}) => {
  const leafletPosition: [number, number] = [position.lat, position.lng]
  const icon = createQTHIcon()

  const handleDragEnd = (event: L.DragEndEvent) => {
    const marker = event.target as L.Marker
    const newPos = marker.getLatLng()
    const newPosition: LatLng = {
      lat: newPos.lat,
      lng: newPos.lng,
      alt: position.alt // 高度情報は保持
    }
    
    if (onPositionChange) {
      onPositionChange(newPosition)
    }
  }

  const handleClick = () => {
    if (onMarkerClick) {
      onMarkerClick(position)
    }
  }

  return (
    <Marker
      position={leafletPosition}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        dragend: handleDragEnd,
        click: handleClick,
      }}
    />
  )
}

export default QTHMarker