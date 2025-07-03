import React, { useState, useMemo } from 'react'
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Box, Typography, FormControlLabel, Switch } from '@mui/material'
import { useActivationSpots } from '@/hooks/useSOTAAPI'
import { useMapStore } from '@/stores/mapStore'
import type { Spot } from '@/types'

interface SpotTimelineProps {
  height?: number
  onSpotClick?: (spot: Spot) => void
}

interface ChartDataPoint {
  time: Date
  timeStr: string
  y: number
  reference: string
  activator: string
  frequency: string
  mode: string
  comment: string
  program: 'SOTA' | 'POTA'
  qsos?: number
}

const SpotTimeline: React.FC<SpotTimelineProps> = ({ 
  height = 400, 
  onSpotClick 
}) => {
  const { preferences } = useMapStore()
  const [showByCall, setShowByCall] = useState(false)
  
  // Get spot data from API (全データを取得、フィルターは内部で実行)
  const { data: spotData, isLoading, error } = useActivationSpots({
    // pat_refを削除して全データを取得
    log_id: preferences.pota_hunter_uuid || undefined,
    by_call: showByCall ? true : undefined,
    by_ref: showByCall ? undefined : true,
    hours_ago: preferences.spot_period,
  })

  // Debug logging
  console.log('TIMELINE - SpotTimeline API Data:', {
    spotData,
    isLoading,
    error,
    preferences,
    showByCall
  })

  // Process spot data for chart
  const chartData = useMemo(() => {
    if (!spotData?.spots || !Array.isArray(spotData.spots)) return []
    
    const processedData: ChartDataPoint[] = []
    let yIndex = 0
    
    // Group spots by reference or call
    const groupedSpots = spotData.spots.reduce((groups: any, spot: any) => {
      const key = showByCall ? spot.activator : spot.reference
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(spot)
      return groups
    }, {})

    // Convert to chart data
    Object.entries(groupedSpots).forEach(([_key, spots]: [string, any]) => {
      const spotArray = spots as any[]
      const firstSpot = spotArray[0]
      
      // Filter by program preferences
      const programMatch = 
        (firstSpot.program === 'SOTA' && preferences.sota_ref) ||
        (firstSpot.program === 'POTA' && preferences.pota_ref)
      
      if (!programMatch) return

      spotArray.forEach((spot) => {
        processedData.push({
          time: new Date(spot.spotTime),
          timeStr: new Date(spot.spotTime).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          y: yIndex,
          reference: spot.reference,
          activator: spot.activator,
          frequency: spot.frequency,
          mode: spot.mode,
          comment: spot.comment,
          program: spot.program,
          qsos: spot.qsos,
        })
      })
      
      yIndex++
    })

    return processedData.sort((a, b) => a.time.getTime() - b.time.getTime())
  }, [spotData?.spots, showByCall, preferences])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <Box
          sx={{
            bgcolor: 'rgba(25, 58, 95, 0.9)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontSize: '0.8rem'
          }}
        >
          <Typography variant="body2">
            {data.activator} {data.reference}
          </Typography>
          <Typography variant="body2">
            {data.frequency} {data.mode}
          </Typography>
          <Typography variant="body2">
            {data.comment}
          </Typography>
          {data.qsos && (
            <Typography variant="body2">
              QSOs: {data.qsos}
            </Typography>
          )}
        </Box>
      )
    }
    return null
  }

  // Handle spot click
  const handleSpotClick = (data: any) => {
    if (onSpotClick && data) {
      const spot: Spot = {
        spotTime: data.time.toISOString(),
        activator: data.activator,
        reference: data.reference,
        frequency: data.frequency,
        mode: data.mode,
        comment: data.comment,
        program: data.program,
        referenceDetail: data.reference,
        spotId: 0,
        spotter: '',
      }
      onSpotClick(spot)
    }
  }

  // Time range for chart
  const now = new Date()
  const timeFrom = new Date(now.getTime() - preferences.spot_period * 60 * 60 * 1000)
  const timeTo = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes buffer

  if (isLoading) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading spots...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height, width: '100%' }}>
      {/* Controls */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showByCall}
              onChange={(e) => setShowByCall(e.target.checked)}
              size="small"
            />
          }
          label={<Typography variant="body2">By Callsign</Typography>}
        />
        <Typography variant="body2" color="text.secondary">
          Last {preferences.spot_period}H • {chartData.length} spots
        </Typography>
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height - 40}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            scale="time"
            domain={[timeFrom.getTime(), timeTo.getTime()]}
            tickFormatter={(value) => new Date(value).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          />
          <YAxis
            type="number"
            domain={[0, Math.max(10, chartData.length)]}
            hide
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Current time reference line */}
          <ReferenceLine
            x={now.getTime()}
            stroke="#ff4444"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          
          {/* SOTA spots */}
          <Scatter
            dataKey="time"
            fill="#1976d2"
            onClick={handleSpotClick}
            data={chartData.filter(d => d.program === 'SOTA')}
          />
          
          {/* POTA spots */}
          <Scatter
            dataKey="time"
            fill="#4caf50"
            onClick={handleSpotClick}
            data={chartData.filter(d => d.program === 'POTA')}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default SpotTimeline