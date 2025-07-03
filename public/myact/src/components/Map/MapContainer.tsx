import React, { useState, useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import type { OperationAlert } from '@/types'

// Dynamic import for SSR compatibility
const DynamicMap = React.lazy(() => import('./LeafletMap'))

interface MapContainerProps {
  selectedAlert?: OperationAlert | null
  sidePanelVisible?: boolean
}

const MapContainer: React.FC<MapContainerProps> = ({ selectedAlert, sidePanelVisible }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <Box 
        sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }} data-testid="map-container">
      <React.Suspense 
        fallback={
          <Box 
            sx={{ 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <DynamicMap selectedAlert={selectedAlert} sidePanelVisible={sidePanelVisible} />
      </React.Suspense>
    </Box>
  )
}

export default MapContainer