import React, { useState } from 'react'
import { Box } from '@mui/material'
import Navbar from './Navbar'
import MapContainer from '../Map/MapContainer'
import CollapsibleSidePanel from './CollapsibleSidePanel'
import AlertSpotCardList from '../AlertSpot/AlertSpotCardList'
import { useMapStore } from '@/stores/mapStore'
import { APIService } from '@/services/api'
import type { OperationAlert, Spot } from '@/types'

const Layout: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<OperationAlert | null>(null)
  const [sidePanelVisible, setSidePanelVisible] = useState(true)
  const { setMapCenter } = useMapStore()

  const handleAlertClick = async (alert: OperationAlert) => {
    setSelectedAlert(alert)
    
    // Efficient summit/park name search - no wasteful processing
    try {
      console.log('Searching for alert reference:', alert.reference)
      
      // Direct API search by reference name (most efficient approach)
      const searchResults = await APIService.searchReference(alert.reference)
      
      if (searchResults && (searchResults.summits.length > 0 || searchResults.parks.length > 0)) {
        // Prefer summits, then parks
        const candidate = searchResults.summits[0] || searchResults.parks[0]
        if (candidate.latitude && candidate.longitude) {
          const coords = { lat: candidate.latitude, lng: candidate.longitude }
          console.log('Found coordinates for alert:', alert.reference, coords)
          setMapCenter(coords, 15) // Zoom level 15 for detailed view
        } else {
          console.warn('No coordinates in search result for alert:', alert.reference)
        }
      } else {
        console.warn('No candidates found for alert reference:', alert.reference)
      }
    } catch (error) {
      console.error('Failed to search for alert reference:', alert.reference, error)
    }
  }

  const handleSpotClick = async (spot: Spot) => {
    // Efficient summit/park name search - no wasteful processing
    try {
      console.log('Searching for spot reference:', spot.reference)
      
      // Direct API search by reference name (most efficient approach)
      const searchResults = await APIService.searchReference(spot.reference)
      
      if (searchResults && (searchResults.summits.length > 0 || searchResults.parks.length > 0)) {
        // Prefer summits, then parks
        const candidate = searchResults.summits[0] || searchResults.parks[0]
        if (candidate.latitude && candidate.longitude) {
          const coords = { lat: candidate.latitude, lng: candidate.longitude }
          console.log('Found coordinates for spot:', spot.reference, coords)
          setMapCenter(coords, 15) // Zoom level 15 for detailed view
        } else {
          console.warn('No coordinates in search result for spot:', spot.reference)
        }
      } else {
        console.warn('No candidates found for spot reference:', spot.reference)
      }
    } catch (error) {
      console.error('Failed to search for spot reference:', spot.reference, error)
    }
  }

  const handleViewOnMap = async (item: OperationAlert | Spot) => {
    // Show item on map with popup and focus
    if ('operationDate' in item) {
      // It's an alert
      await handleAlertClick(item)
    } else {
      // It's a spot
      await handleSpotClick(item)
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Main Map Area */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <MapContainer selectedAlert={selectedAlert} sidePanelVisible={sidePanelVisible} />
        </Box>
        
        {/* Right Side Panel */}
        <CollapsibleSidePanel
          title=""
          width={400}
          minWidth={320}
          maxWidth={480}
          position="right"
          defaultExpanded={true}
          onVisibilityChange={setSidePanelVisible}
        >
          <AlertSpotCardList
            onAlertClick={handleAlertClick}
            onSpotClick={handleSpotClick}
            onViewOnMap={handleViewOnMap}
            autoRefresh={true}
            refreshInterval={5}
          />
        </CollapsibleSidePanel>
      </Box>
    </Box>
  )
}

export default Layout