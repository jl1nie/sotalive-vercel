import React from 'react'
import { Box, Paper, Typography, Chip, Divider } from '@mui/material'
import { useMapStore } from '@/stores/mapStore'
import { useMapBounds } from '@/hooks/useSOTAAPI'

const MapDebugInfo: React.FC = () => {
  const { 
    mapCenter, 
    zoom, 
    currentLocation, 
    preferences, 
    summits, 
    parks,
    isLoading 
  } = useMapStore()
  
  const bounds = useMapBounds(mapCenter, zoom)

  return (
    <Paper 
      data-testid="map-debug-info"
      sx={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        p: 2, 
        maxWidth: 400,
        zIndex: 500, // Lower z-index to not interfere with map interactions
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        pointerEvents: 'none', // Prevent blocking map clicks
        '& > *': {
          pointerEvents: 'auto' // Re-enable pointer events for child elements
        }
      }}
    >
      <Typography variant="h6" gutterBottom>
        🗺️ Map Debug Info
      </Typography>
      
      <Divider sx={{ mb: 1 }} />
      
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Map Position:</Typography>
        <Typography variant="body2">
          Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
        </Typography>
        <Typography variant="body2">
          Zoom: {zoom}
        </Typography>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">API Bounds:</Typography>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          Lat: {bounds.min_lat.toFixed(4)} ~ {bounds.max_lat.toFixed(4)}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          Lng: {bounds.min_lon.toFixed(4)} ~ {bounds.max_lon.toFixed(4)}
        </Typography>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Markers:</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`SOTA: ${summits.length}`} 
            size="small" 
            color={summits.length > 0 ? 'success' : 'default'}
          />
          <Chip 
            label={`POTA: ${parks.length}`} 
            size="small" 
            color={parks.length > 0 ? 'success' : 'default'}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Preferences:</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`SOTA: ${preferences.sota_ref ? 'ON' : 'OFF'}`} 
            size="small" 
            color={preferences.sota_ref ? 'primary' : 'default'}
          />
          <Chip 
            label={`POTA: ${preferences.pota_ref ? 'ON' : 'OFF'}`} 
            size="small" 
            color={preferences.pota_ref ? 'primary' : 'default'}
          />
          <Chip 
            label={`JAFF: ${preferences.jaff_ref ? 'ON' : 'OFF'}`} 
            size="small" 
            color={preferences.jaff_ref ? 'primary' : 'default'}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Status:</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={isLoading ? 'Store Loading' : 'Store Ready'} 
            size="small" 
            color={isLoading ? 'warning' : 'success'}
          />
          <Chip 
            label="Data via MapDataLoader" 
            size="small" 
            color="info"
          />
        </Box>
      </Box>

      {currentLocation && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">GPS Location:</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </Typography>
        </Box>
      )}

    </Paper>
  )
}

export default MapDebugInfo