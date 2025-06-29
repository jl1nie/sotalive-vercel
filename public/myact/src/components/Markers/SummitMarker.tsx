import React from 'react'
import { CircleMarker, Tooltip } from 'react-leaflet'
import type { Summit } from '@/types'

interface SummitMarkerProps {
  summit: Summit
  zoom: number
  activationCount: number
  onMarkerClick?: (summit: Summit, latlng: [number, number]) => void
}

const SummitMarker: React.FC<SummitMarkerProps> = ({
  summit,
  zoom,
  activationCount,
  onMarkerClick
}) => {
  // Determine radius based on zoom level
  const getRadius = (z: number) => {
    if (z > 14) return 10
    if (z > 12) return 8
    if (z > 10) return 6
    return 4
  }

  // Determine color based on elevation
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

  const handleClick = () => {
    if (onMarkerClick) {
      onMarkerClick(summit, position)
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
      eventHandlers={{
        click: handleClick,
      }}
    >
      {zoom > 11 && (
        <Tooltip
          permanent
          direction="center"
          className="my-tooltip-label"
          offset={[0, 0]}
        >
          {activationCount.toString()}
        </Tooltip>
      )}
    </CircleMarker>
  )
}

export default SummitMarker