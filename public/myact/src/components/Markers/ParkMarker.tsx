import React from 'react'
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { Park } from '@/types'

// Custom marker icon for parks (replacing ExtraMarkers functionality)
const createParkIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 25px;
        height: 25px;
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
      ">
        🏞️
      </div>
    `,
    className: 'custom-park-marker',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25],
  })
}

interface ParkMarkerProps {
  park: Park
  showActivatedOnly?: boolean
  isPermanentTooltip?: boolean
  onMarkerClick?: (park: Park, latlng: [number, number]) => void
}

const ParkMarker: React.FC<ParkMarkerProps> = ({
  park,
  showActivatedOnly = false,
  isPermanentTooltip = true,
  onMarkerClick
}) => {
  // Determine marker color based on activation status
  const getMarkerColor = () => {
    if (park.date != null) {
      if (park.locid && park.locid.length === 1) {
        if (!showActivatedOnly || (park.act && park.act > 0)) {
          return '#dc3545' // red
        } else {
          return '#ffc107' // yellow
        }
      } else {
        return '#fd7e14' // orange
      }
    } else {
      return '#28a745' // green-light
    }
  }

  const position: [number, number] = [park.latitude, park.longitude]
  const markerColor = getMarkerColor()
  const icon = createParkIcon(markerColor)

  const handleClick = () => {
    if (onMarkerClick) {
      onMarkerClick(park, position)
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