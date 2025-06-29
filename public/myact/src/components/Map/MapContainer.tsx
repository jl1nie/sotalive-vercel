import React, { useState, useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'

// Dynamic import for SSR compatibility
const DynamicMap = React.lazy(() => import('./LeafletMap'))

const MapContainer: React.FC = () => {
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
    <Box sx={{ height: '100%', width: '100%' }}>
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
        <DynamicMap />
      </React.Suspense>
    </Box>
  )
}

export default MapContainer