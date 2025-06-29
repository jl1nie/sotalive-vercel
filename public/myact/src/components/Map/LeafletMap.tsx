import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, LayersControl, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Box } from '@mui/material'
import { useMapStore } from '@/stores/mapStore'
import { useMapData } from '@/hooks/useMapData'
import { useReverseGeocoding } from '@/hooks/useGeocoding'
import SummitMarker from '../Markers/SummitMarker'
import ParkMarker from '../Markers/ParkMarker'
import QTHMarker from '../Markers/QTHMarker'
import TopoJSONLayer from './TopoJSONLayer'
import APRSLayer from './APRSLayer'
import InfoPopup from './InfoPopup'
import type { Summit, Park, LatLng } from '@/types'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const LeafletMap: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null)
  const [popupInfo, setPopupInfo] = useState<{
    position: LatLng
    summit?: Summit
    park?: Park
    isGPS?: boolean
  } | null>(null)

  const { 
    mapCenter, 
    zoom, 
    currentLocation, 
    preferences,
    setMapCenter,
    setZoom 
  } = useMapStore()

  // Load marker data dynamically based on map position
  const { summits, parks } = useMapData()

  // Get geocoding info for popup position
  const { data: geocodingInfo } = useReverseGeocoding(
    popupInfo ? popupInfo.position : null,
    { enabled: !!popupInfo && !popupInfo.summit && !popupInfo.park }
  )

  const leafletCenter: [number, number] = [mapCenter.lat, mapCenter.lng]

  useEffect(() => {
    // Any map initialization logic can go here
    return () => {
      // Cleanup if needed
    }
  }, [])

  // Component to handle map events
  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        const position: LatLng = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }
        setPopupInfo({ position })
      },
      moveend: (e) => {
        const map = e.target
        const center = map.getCenter()
        const newZoom = map.getZoom()
        setMapCenter({ lat: center.lat, lng: center.lng })
        setZoom(newZoom)
      },
    })
    return null
  }

  const handleSummitClick = (summit: Summit, latlng: [number, number]) => {
    setPopupInfo({
      position: { lat: latlng[0], lng: latlng[1] },
      summit
    })
  }

  const handleParkClick = (park: Park, latlng: [number, number]) => {
    setPopupInfo({
      position: { lat: latlng[0], lng: latlng[1] },
      park
    })
  }

  const handleQTHClick = (position: LatLng) => {
    setPopupInfo({
      position,
      isGPS: true
    })
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={leafletCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <MapEvents />
        
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
          <InfoPopup
            position={popupInfo.position}
            summit={popupInfo.summit}
            park={popupInfo.park}
            geocodingInfo={geocodingInfo}
            isGPS={popupInfo.isGPS}
          />
        )}
      </MapContainer>
    </Box>
  )
}

export default LeafletMap