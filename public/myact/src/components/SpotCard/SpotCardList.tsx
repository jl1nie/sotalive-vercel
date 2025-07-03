import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import { useActivationSpots } from '@/hooks/useSOTAAPI'
import { useMapStore } from '@/stores/mapStore'
import type { Spot } from '@/types'

interface SpotCardListProps {
  height?: number
  onSpotClick?: (spot: Spot) => void
  scrollToTime?: string | null // ISO time string to scroll to
}

interface ProcessedSpot extends Spot {
  timeFromNow: number // minutes from now (negative = past, positive = future)
  isRecent: boolean
  isPast: boolean
}

const SpotCardList: React.FC<SpotCardListProps> = ({
  height = 400,
  onSpotClick,
  scrollToTime,
}) => {
  const { preferences } = useMapStore()
  const [showByCall, setShowByCall] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Get spot data from API (全データを取得、フィルターは内部で実行)
  const { data: spotData, isLoading, error } = useActivationSpots({
    // pat_refを削除して全データを取得
    log_id: preferences.pota_hunter_uuid || undefined,
    by_call: showByCall ? true : undefined,
    by_ref: showByCall ? undefined : true,
    hours_ago: preferences.spot_period || 6,
  })

  // SpotCardList専用デバッグログ
  const DEBUG = false // デバッグログ制御
  if (DEBUG) console.log('SPOT-CARD-LIST - API Data:', {
    spotData,
    isLoading,
    error,
    spotsCount: spotData?.spots?.length || 0,
    preferences: { spot_period: preferences.spot_period, pota_hunter_uuid: preferences.pota_hunter_uuid },
    showByCall
  })

  // Debug logging
  if (DEBUG) console.log('SPOT - SpotCardList API Data:', {
    spotData,
    isLoading,
    error,
    preferences,
    showByCall
  })

  // Process spot data
  const processedSpots = useMemo(() => {
    if (DEBUG) console.log('SPOT - Processing spots:', spotData)
    
    if (!spotData?.spots || !Array.isArray(spotData.spots)) {
      if (DEBUG) console.log('SPOT - No spots data or not array:', spotData)
      return []
    }

    const now = new Date()
    const spotMap = new Map<string, ProcessedSpot>() // key: `${activator}-${reference}`

    if (DEBUG) console.log('SPOT - Raw spots count:', spotData.spots.length)

    spotData.spots.forEach((spot: any, index: number) => {
      if (DEBUG) console.log(`SPOT - Processing spot ${index}:`, spot)
      
      // Filter by program preferences
      const programMatch =
        (spot.program === 'SOTA' && preferences.sota_ref) ||
        (spot.program === 'POTA' && preferences.pota_ref)

      if (DEBUG) console.log(`SPOT - Program match for ${spot.program}:`, programMatch, {
        sota_ref: preferences.sota_ref,
        pota_ref: preferences.pota_ref
      })

      if (!programMatch) return

      const spotTime = new Date(spot.spotTime)
      const timeFromNow = (spotTime.getTime() - now.getTime()) / (1000 * 60) // minutes

      // Create unique key for deduplication: activator + reference
      const dedupeKey = `${spot.activator}-${spot.reference}`
      const existingSpot = spotMap.get(dedupeKey)
      
      const currentSpot: ProcessedSpot = {
        spotTime: spot.spotTime,
        activator: spot.activator,
        reference: spot.reference,
        frequency: spot.frequency,
        mode: spot.mode,
        comment: spot.comment,
        program: spot.program,
        referenceDetail: spot.referenceDetail || spot.reference,
        spotId: spot.spotId || 0,
        spotter: spot.spotter || '',
        timeFromNow,
        isRecent: Math.abs(timeFromNow) <= 30, // within 30 minutes
        isPast: timeFromNow < 0,
      }
      
      if (existingSpot) {
        // Keep the more recent spot (newer spotTime)
        const existingSpotTime = new Date(existingSpot.spotTime)
        if (spotTime > existingSpotTime) {
          if (DEBUG) console.log(`SPOT - Updating existing spot for ${dedupeKey}:`, {
            old: existingSpot.spotTime,
            new: spot.spotTime
          })
          spotMap.set(dedupeKey, currentSpot)
        } else {
          if (DEBUG) console.log(`SPOT - Keeping existing spot for ${dedupeKey} (newer):`, {
            existing: existingSpot.spotTime,
            current: spot.spotTime
          })
        }
      } else {
        // Create new spot entry
        if (DEBUG) console.log(`SPOT - Creating new spot for ${dedupeKey}`)
        spotMap.set(dedupeKey, currentSpot)
      }
    })

    // Convert map to array and sort by time (most recent first)
    const deduplicatedSpots = Array.from(spotMap.values())
    if (DEBUG) console.log('SPOT - Deduplicated spots count:', deduplicatedSpots.length)

    const sorted = deduplicatedSpots.sort((a, b) => new Date(b.spotTime).getTime() - new Date(a.spotTime).getTime())
    if (DEBUG) console.log('SPOT - Final sorted spots:', sorted)
    
    return sorted
  }, [spotData?.spots, preferences])

  // Auto-scroll to current time or specific time
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return

    const targetTime = scrollToTime ? new Date(scrollToTime) : new Date()
    let closestCard: HTMLDivElement | null = null
    let closestDistance = Infinity

    cardRefs.current.forEach((cardEl, spotTime) => {
      const cardTime = new Date(spotTime)
      const distance = Math.abs(cardTime.getTime() - targetTime.getTime())
      
      if (distance < closestDistance) {
        closestDistance = distance
        closestCard = cardEl
      }
    })

    if (closestCard) {
      (closestCard as any).scrollIntoView?.({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [scrollToTime, autoScroll, processedSpots])

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (minutes: number) => {
    const absMinutes = Math.abs(minutes)
    
    if (absMinutes < 1) return 'Now'
    if (absMinutes < 60) return `${Math.floor(absMinutes)}分${minutes < 0 ? '前' : '後'}`
    
    const hours = Math.floor(absMinutes / 60)
    const remainingMinutes = Math.floor(absMinutes % 60)
    
    if (remainingMinutes === 0) {
      return `${hours}時間${minutes < 0 ? '前' : '後'}`
    }
    return `${hours}時間${remainingMinutes}分${minutes < 0 ? '前' : '後'}`
  }

  const getProgramColor = (program: string) => {
    switch (program) {
      case 'SOTA': return '#1976d2'
      case 'POTA': return '#4caf50'
      default: return '#757575'
    }
  }

  const getTimeChipColor = (spot: ProcessedSpot) => {
    if (spot.isRecent) return 'error'
    if (spot.isPast) return 'default'
    return 'primary'
  }

  if (isLoading) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading spots...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography color="error" gutterBottom>
          Error loading spots
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error.message || 'Unknown error'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }} data-testid="spot-card-list">
      {/* Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">スポットカード</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showByCall}
                  onChange={(e) => setShowByCall(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">By Call</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Auto Scroll</Typography>}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Last {preferences.spot_period}H • {processedSpots.length} spots
        </Typography>
      </Box>

      {/* Card List */}
      <Box 
        ref={containerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1,
          '& > *:not(:last-child)': { mb: 1 }
        }}
      >
        {processedSpots.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>
              スポットがありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Raw spots: {spotData?.spots?.length || 0} | 
              SOTA enabled: {preferences.sota_ref ? 'Yes' : 'No'} | 
              POTA enabled: {preferences.pota_ref ? 'Yes' : 'No'}
            </Typography>
            {spotData?.spots && spotData.spots.length > 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Data received but filtered out - check program preferences
              </Typography>
            )}
          </Box>
        ) : (
          processedSpots.map((spot, index) => (
            <Card
              key={`${spot.spotTime}-${spot.activator}-${index}`}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(spot.spotTime, el)
                } else {
                  cardRefs.current.delete(spot.spotTime)
                }
              }}
              variant="outlined"
              data-testid={`spot-card-${spot.program}-${index}`}
              sx={{
                cursor: onSpotClick ? 'pointer' : 'default',
                opacity: spot.isPast && !spot.isRecent ? 0.7 : 1,
                border: spot.isRecent ? 2 : 1,
                borderColor: spot.isRecent ? 'error.main' : 'divider',
                '&:hover': onSpotClick ? { bgcolor: 'action.hover' } : {},
              }}
              onClick={() => onSpotClick?.(spot)}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={spot.program}
                      size="small"
                      sx={{
                        bgcolor: getProgramColor(spot.program),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                    <Chip
                      label={formatRelativeTime(spot.timeFromNow)}
                      size="small"
                      color={getTimeChipColor(spot)}
                      variant={spot.isRecent ? 'filled' : 'outlined'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    {formatTime(spot.spotTime)}
                  </Typography>
                </Box>

                {/* Main Content */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <i className="fas fa-user" style={{ fontSize: '16px', color: '#757575' }} />
                    <Typography variant="h6" component="span">
                      {spot.activator}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <i className="fas fa-map-marker-alt" style={{ fontSize: '16px', color: '#757575' }} />
                    <Typography variant="body1" fontWeight="bold" data-testid="spot-reference">
                      {spot.reference}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className="fas fa-broadcast-tower" style={{ fontSize: '16px', color: '#757575' }} />
                    <Typography variant="body1">
                      {spot.frequency} {spot.mode}
                    </Typography>
                  </Box>
                </Box>

                {/* Comment */}
                {spot.comment && (
                  <>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {spot.comment}
                    </Typography>
                  </>
                )}

              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  )
}

export default SpotCardList