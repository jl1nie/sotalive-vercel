import React from 'react'
import { Popup } from 'react-leaflet'
import { Box, Typography, Link, Button, Divider } from '@mui/material'
import type { Summit, Park, LatLng } from '@/types'

interface InfoPopupProps {
  position: LatLng
  summit?: Summit
  park?: Park
  geocodingInfo?: any // TODO: Define proper type
  isGPS?: boolean
}

const InfoPopup: React.FC<InfoPopupProps> = ({
  position,
  summit,
  park,
  geocodingInfo,
  isGPS = false
}) => {
  // Format coordinates
  const formatCoordinate = (lat: number, lng: number) => {
    const formattedLat = Math.round(lat * 1000000) / 1000000
    const formattedLng = Math.round(lng * 1000000) / 1000000
    return `${formattedLat}, ${formattedLng}`
  }

  // Create location URI (GSI or Google Maps)
  const createLocationURI = (lat: number, lng: number, zoom: number = 15) => {
    // TODO: Use preferences to determine which service to use
    const useGoogleMaps = false // This should come from preferences
    
    if (useGoogleMaps) {
      return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`
    } else {
      return `https://maps.gsi.go.jp/#${zoom}/${lat}/${lng}`
    }
  }

  // Format reference display
  const formatReference = (summit?: Summit, park?: Park) => {
    if (summit) {
      return (
        <Box>
          <Link 
            href={`https://summits.sota.org.uk/summit/${summit.summitCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {summit.summitCode} {summit.summitName}
          </Link>
        </Box>
      )
    }
    
    if (park) {
      const parts: React.ReactNode[] = []
      
      if (park.potaCode) {
        parts.push(
          <Link 
            key="pota"
            href={`https://pota.app/#/park/${park.potaCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {park.potaCode}
          </Link>
        )
      }
      
      if (park.wwffCode) {
        if (parts.length > 0) parts.push(' / ')
        parts.push(
          <Link 
            key="wwff"
            href={`https://wwff.co/directory/?showRef=${park.wwffCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {park.wwffCode}
          </Link>
        )
      }
      
      return <Box>{parts}</Box>
    }
    
    return null
  }

  const locationURI = createLocationURI(position.lat, position.lng)
  const coordinateText = formatCoordinate(position.lat, position.lng)

  return (
    <Popup
      position={[position.lat, position.lng]}
      maxWidth={400}
    >
      <Box sx={{ p: 1, minWidth: 250 }}>
        {/* Reference information */}
        {(summit || park) && (
          <>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="h6" component="div">
                {formatReference(summit, park)}
              </Typography>
              {(summit?.summitNameJ || park?.parkNameJ) && (
                <Typography variant="body2" color="text.secondary">
                  {summit?.summitNameJ || park?.parkNameJ}
                </Typography>
              )}
            </Box>
            <Divider sx={{ mb: 1 }} />
          </>
        )}

        {/* SOTA Summit details */}
        {summit && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              {summit.cityJ && `${summit.cityJ}`}<br />
              GL: {summit.maidenhead}<br />
              <Link href={locationURI} target="_blank" rel="noopener noreferrer">
                位置: {coordinateText}
              </Link><br />
              標高: {summit.altM}m, {summit.points}pts (+{summit.bonusPoints})<br />
              Activations: {summit.activationCount}
              {summit.activationCount > 0 && summit.activationDate && (
                <>
                  <br />Last Activation: {summit.activationDate} ({summit.activationCall})
                </>
              )}
            </Typography>
          </Box>
        )}

        {/* POTA Park details */}
        {park && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              <Link href={locationURI} target="_blank" rel="noopener noreferrer">
                位置: {coordinateText}
              </Link>
              {park.qsos && (
                <>
                  <br />QSOs: {park.qsos}
                </>
              )}
              {park.activations && park.attempts && (
                <>
                  <br />Activations/Attempts: {park.activations}/{park.attempts}
                </>
              )}
            </Typography>
          </Box>
        )}

        {/* GPS location info */}
        {isGPS && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              現在地:
            </Typography>
          </Box>
        )}

        {/* Geocoding information */}
        {geocodingInfo && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              {geocodingInfo.prefecture && `${geocodingInfo.prefecture} `}
              {geocodingInfo.municipality}<br />
              {geocodingInfo.jccCode && `JCC${geocodingInfo.jccCode} `}
              {geocodingInfo.jcgCode && `JCG${geocodingInfo.jcgCode} `}
              {geocodingInfo.maidenhead && `GL: ${geocodingInfo.maidenhead}`}<br />
              {geocodingInfo.elevation && `標高: ${geocodingInfo.elevation}m`}
              {position.alt && ` (GPS測位値: ${position.alt}m)`}
            </Typography>
          </Box>
        )}

        {/* Weather link */}
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Link
            href={`https://www.windy.com/${position.lat}/${position.lng}/meteogram?rain,${position.lat},${position.lng},11`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textDecoration: 'none' }}
          >
            🌤️ 気象情報
          </Link>
        </Box>

        {/* Action buttons */}
        {(summit || park) && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => {
                // TODO: Implement paddle emulator functionality
                console.log('Paddle emulator clicked for:', summit || park)
              }}
            >
              📋 ActPaddle
            </Button>
          </Box>
        )}
      </Box>
    </Popup>
  )
}

export default InfoPopup