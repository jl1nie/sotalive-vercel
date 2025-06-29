import React from 'react'
import { Polyline, CircleMarker, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useAPRSTracks } from '@/hooks/useSOTAAPI'
import { useMapStore } from '@/stores/mapStore'
import type { APRSTrack } from '@/types'
import type { APRSTracksResponse } from '@/types/api'

// APRS station marker icons
const createAPRSIcon = (ssid: string) => {
  let iconText = '🏠' // Default home icon
  
  if (ssid === '5' || ssid === '7') {
    iconText = '🚶' // Person walking
  } else if (ssid === '9') {
    iconText = '🚗' // Car
  }

  return L.divIcon({
    html: `
      <div style="
        background-color: #ffc107;
        width: 20px;
        height: 20px;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      ">
        ${iconText}
      </div>
    `,
    className: 'custom-aprs-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20],
  })
}

const APRSTrackComponent: React.FC<{ track: APRSTrack }> = ({ track }) => {
  const { properties, geometry } = track
  const coords = geometry.coordinates.map(coord => [coord[0], coord[1]] as [number, number])
  const lastPosition = coords[coords.length - 1]
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  const formatSpotTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  // Create popup message
  let message = `<b>${formatDate(properties.lastseen)} ${properties.callsign} (${properties.distance}m from ${properties.summit})</b>`
  
  if (properties.spot_time && parseInt(properties.distance) < 500) {
    message += `<br><center>${formatSpotTime(properties.spot_time)} ${properties.spot_freq} ${properties.spot_mode} ${properties.spot_summit}<br>${properties.spot_comment}</center>`
  }

  return (
    <>
      {/* Track line */}
      <Polyline
        positions={coords}
        color="#0d47a1"
        opacity={0.4}
        weight={4}
      />
      
      {/* Track points */}
      {coords.map((coord, index) => (
        <CircleMarker
          key={index}
          center={coord}
          radius={2}
          color="#ff1744"
        />
      ))}
      
      {/* Station marker at last position */}
      <Marker
        position={lastPosition}
        icon={createAPRSIcon(properties.ssid)}
      >
        <Popup>
          <div dangerouslySetInnerHTML={{ __html: message }} />
        </Popup>
      </Marker>
    </>
  )
}

const APRSLayer: React.FC = () => {
  const { preferences } = useMapStore()
  
  // Fetch APRS tracks for Japan
  const { data: aprsData } = useAPRSTracks(
    { 
      pat_ref: 'JA',
      hours_ago: 24 
    },
    { 
      enabled: preferences.aprs_track,
      refetchInterval: 3 * 60 * 1000 // 3 minutes
    }
  )

  if (!preferences.aprs_track || !aprsData) {
    return null
  }

  const tracksData = aprsData as APRSTracksResponse

  return (
    <>
      {tracksData.tracks.map((track: APRSTrack, index: number) => (
        <APRSTrackComponent 
          key={`aprs-${track.properties.callsign}-${index}`}
          track={track}
        />
      ))}
    </>
  )
}

export default APRSLayer