import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Box } from '@mui/material'
import { useMapStore } from '@/stores/mapStore'
import MapDataLoader from './MapDataLoader'
import MapEvents from './MapEvents'
import { useReverseGeocoder } from '@/hooks/useReverseGeocoder'
import { usePopupManager } from '@/hooks/usePopupManager'
import { useMapInitialization } from '@/hooks/useMapInitialization'
import { useMapEventLoop } from '@/hooks/useMapEventLoop'
// useMarkerClickHandlers removed - markers handle events directly
import { useSidePanelIntegration } from '@/hooks/useSidePanelIntegration'
import SummitMarker from '../Markers/SummitMarker'
import ParkMarker from '../Markers/ParkMarker'
import QTHMarker from '../Markers/QTHMarker'
import TopoJSONLayer from './TopoJSONLayer'
import APRSLayer from './APRSLayer'
import InfoPopup from './InfoPopup'
import MapDebugInfo from '../Debug/MapDebugInfo'
import APITestButton from '../Debug/APITestButton'
import type { OperationAlert } from '@/types'
import { debugLog } from '@/config/debugConfig'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface LeafletMapProps {
  selectedAlert?: OperationAlert | null
  sidePanelVisible?: boolean
}

const LeafletMap: React.FC<LeafletMapProps> = ({ selectedAlert, sidePanelVisible }) => {
  const mapRef = useRef<L.Map | null>(null)
  
  // Custom hooks for managing complex state and behavior
  const { popupInfo, setUniquePopup, clearPopup } = usePopupManager()
  const { mapFullyInitialized } = useMapInitialization(mapRef.current)
  const { isProgrammaticMove, isUserInteraction, startProgrammaticMove, debounceStateUpdate } = useMapEventLoop()
  
  // Side panel integration
  useSidePanelIntegration(mapRef, sidePanelVisible)
  
  // popupInfo状態変化の監視
  useEffect(() => {
    debugLog.state('popupInfo state changed:', popupInfo)
    if (popupInfo?.summit) {
      debugLog.state('popupInfo contains summit:', popupInfo.summit.summitCode)
    }
    if (popupInfo?.park) {
      debugLog.state('popupInfo contains park:', popupInfo.park.potaCode || popupInfo.park.wwffCode)
    }
  }, [popupInfo])

  const { 
    mapCenter, 
    zoom, 
    currentLocation, 
    preferences,
    setMapCenter,
    setZoom 
  } = useMapStore()

  // Get marker data from store
  const { summits, parks } = useMapStore()
  
  // Get geocoding info for popup position using the correct hook
  const { reverseGeocode } = useReverseGeocoder()
  const [geocodingInfo, setGeocodingInfo] = useState<{
    errors?: string
    prefecture?: string
    municipality?: string
    address?: string
    jccCode?: string
    jccText?: string
    wardCode?: string | null
    jcgCode?: string | null
    hamlogCode?: string
    maidenhead?: string
    elevation?: string
    hsrc?: string
    mapcode?: string
  } | null>(null)
  
  // Popup close handler (must be outside JSX to follow Rules of Hooks)
  const handlePopupClose = useCallback(() => {
    debugLog.event('Popup closed by user')
    clearPopup()
    setGeocodingInfo(null)
  }, [clearPopup, setGeocodingInfo])
  
  // デバッグ情報
  debugLog.leafletMap('Rendering with preferences.sota_ref:', preferences.sota_ref)
  debugLog.leafletMap('summits.length:', summits.length)
  debugLog.leafletMap('parks.length:', parks.length)
  debugLog.leafletMap('First 3 summits:', summits.slice(0, 3))
  
  // Marker click handlers removed - markers handle clicks directly through mapStore
  
  // Get geocoding info when popup position changes (for map clicks only, not for marker clicks)
  useEffect(() => {
    if (popupInfo && !popupInfo.summit && !popupInfo.park && !popupInfo.isGPS) {
      // 地図クリック専用のgeocoding処理（マーカークリック時は実行しない）
      const fetchGeocodingInfo = async () => {
        try {
          debugLog.event('Fetching geocoding for map click position:', popupInfo.position)
          const result = await reverseGeocode(
            popupInfo.position.lat, 
            popupInfo.position.lng, 
            true
          )
          setGeocodingInfo(result ? { ...result, maidenhead: result.maidenhead || undefined } : null)
          debugLog.event('Geocoding result received for map click:', result)
        } catch (error) {
          console.error('Geocoding error:', error)
          setGeocodingInfo({ errors: 'ERROR' })
        }
      }
      fetchGeocodingInfo()
    } else {
      // マーカークリック時やGPS位置時はgeocodingInfo をクリア
      setGeocodingInfo(null)
    }
  }, [popupInfo, reverseGeocode])

  const leafletCenter: [number, number] = [mapCenter.lat, mapCenter.lng]

  // Sync mapStore state changes with Leaflet map
  useEffect(() => {
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter()
      const currentZoom = mapRef.current.getZoom()
      
      // Check if center or zoom needs updating (avoid unnecessary moves)
      const centerChanged = Math.abs(currentCenter.lat - mapCenter.lat) > 0.0001 || 
                          Math.abs(currentCenter.lng - mapCenter.lng) > 0.0001
      const zoomChanged = Math.abs(currentZoom - zoom) > 0.1
      
      if (centerChanged || zoomChanged) {
        debugLog.leafletMap('Syncing mapStore state to Leaflet map:', {
          from: { center: currentCenter, zoom: currentZoom },
          to: { center: mapCenter, zoom },
          centerChanged,
          zoomChanged
        })
        
        // Use setView to update both center and zoom with animation
        mapRef.current.setView([mapCenter.lat, mapCenter.lng], zoom, {
          animate: true,
          duration: 1.0 // 1 second animation
        })
      }
    }
  }, [mapCenter.lat, mapCenter.lng, zoom]) // React to mapStore changes

  useEffect(() => {
    // Any map initialization logic can go here
    return () => {
      // Cleanup if needed
    }
  }, [])

  // Handle side panel visibility changes - invalidate map size while preserving center
  useEffect(() => {
    if (mapRef.current) {
      // Wait for panel animation to complete, then resize map
      const timeout = setTimeout(() => {
        const map = mapRef.current
        if (map) {
          // Invalidate size while preserving the current center position
          // The 'pan' option keeps the current center position stable
          map.invalidateSize({
            pan: false,    // Don't pan to maintain position
            debounceMoveend: true // Debounce moveend events to avoid conflicts
          })
          
          const center = map.getCenter()
          const zoom = map.getZoom()
          debugLog.leafletMap('Map size invalidated with position preserved:', {
            center: { lat: center.lat, lng: center.lng },
            zoom: zoom,
            sidePanelVisible
          })
        }
      }, 350) // Slightly longer than the 300ms panel animation
      
      return () => clearTimeout(timeout)
    }
  }, [sidePanelVisible])

  // Map center/zoom sync handled by mapStore and useMapEventLoop hook

  // Map initialization handled by useMapInitialization hook

  // Map event handling delegated to separate MapEvents component

  // Marker click handlers from centralized hook (removed duplicate implementation)
  // Now all click handling logic is centralized in mapStore

  // Park and QTH click handlers removed (now handled by centralized hook)

  // All click handlers removed - now using centralized useMarkerClickHandlers hook

  // Component cleanup handled by individual hooks

  // MapContainer の data-testid 属性を手動で追加（React-Leafletがサポートしていないため）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        const container = mapRef.current.getContainer()
        if (container && !container.hasAttribute('data-testid')) {
          container.setAttribute('data-testid', 'leaflet-map')
          debugLog.leafletMap('MapContainer: data-testid attribute added manually')
        }
      }
    }, 1000) // 1秒後に実行（地図初期化完了待ち）
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Debug info overlay */}
      <MapDebugInfo />
      
      {/* API test button */}
      <APITestButton />
      
      <MapContainer
        center={leafletCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        className="react-leaflet-map"
        whenReady={() => {
          // MapContainer準備完了後にdata-testidを追加
          if (mapRef.current) {
            const container = mapRef.current.getContainer()
            container.setAttribute('data-testid', 'leaflet-map')
            debugLog.leafletMap('MapContainer ready: data-testid attribute added')
          }
        }}
      >
        <MapEvents mapRef={mapRef} />
        <MapDataLoader />
        
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

        {/* Summit markers - 安定したキーで不要な再マウントを防止 */}
        {preferences.sota_ref && summits.map((summit) => (
          <SummitMarker
            key={`summit-${summit.summitCode}`}
            summit={summit}
            zoom={zoom}
            activationCount={summit.activationCount}
          />
        ))}

        {/* Park markers - 安定したキーで不要な再マウントを防止 */}
        {(preferences.pota_ref || preferences.jaff_ref) && parks.map((park) => (
          <ParkMarker
            key={`park-${park.potaCode || park.wwffCode}`}
            park={park}
            showActivatedOnly={preferences.show_potaactlog}
            isPermanentTooltip={preferences.popup_permanent}
          />
        ))}

        {/* Current GPS location marker */}
        {currentLocation && (
          <QTHMarker
            position={currentLocation}
            onPositionChange={(newPos) => {
              // TODO: Update current location in store
              console.log('QTH marker moved to:', newPos)
            }}
          />
        )}

        {/* Info popup */}
        {popupInfo && (
          // Show popup when we have summit/park data OR when geocoding info is available for map clicks
          (popupInfo.summit || popupInfo.park || popupInfo.isGPS || 
           (!popupInfo.summit && !popupInfo.park && !popupInfo.isGPS && geocodingInfo && !geocodingInfo?.errors)) && (
            <InfoPopup
              key={`popup-${popupInfo.position.lat}-${popupInfo.position.lng}-${popupInfo.summit?.summitCode || popupInfo.park?.potaCode || 'map'}`}
              position={popupInfo.position}
              summit={popupInfo.summit}
              park={popupInfo.park}
              geocodingInfo={geocodingInfo}
              isGPS={popupInfo.isGPS}
              onClose={handlePopupClose}
            />
          )
        )}
      </MapContainer>
    </Box>
  )
}

export default LeafletMap