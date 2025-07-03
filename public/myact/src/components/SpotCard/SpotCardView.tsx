import React, { useState } from 'react'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import SpotTimeline from '@/components/Charts/SpotTimeline'
import SpotCardList from './SpotCardList'
import { useMapStore } from '@/stores/mapStore'
import type { Spot, OperationAlert } from '@/types'

interface SpotCardViewProps {
  height?: number
  onSpotClick?: (spot: Spot) => void
  alerts?: OperationAlert[]
  selectedAlert?: OperationAlert | null
}

type ViewMode = 'timeline' | 'cards'

const SpotCardView: React.FC<SpotCardViewProps> = ({
  height = 400,
  onSpotClick,
  alerts = [],
  selectedAlert,
}) => {
  const { preferences } = useMapStore()
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  // Calculate scroll target time based on selected alert
  const scrollToTime = selectedAlert ? selectedAlert.operationDate : null

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Toggle */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          sx={{ width: '100%' }}
        >
          <ToggleButton value="cards" sx={{ flex: 1 }}>
            <i className="fas fa-list" style={{ fontSize: '16px', marginRight: '8px' }} />
            カード表示
          </ToggleButton>
          <ToggleButton value="timeline" sx={{ flex: 1 }}>
            <i className="fas fa-chart-line" style={{ fontSize: '16px', marginRight: '8px' }} />
            タイムライン
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {viewMode === 'cards' ? (
          <SpotCardList
            height={height - 60} // Subtract toggle button height
            onSpotClick={onSpotClick}
            scrollToTime={scrollToTime}
          />
        ) : (
          <Paper sx={{ height: height - 60, overflow: 'hidden' }}>
            <SpotTimeline
              height={height - 60}
              onSpotClick={onSpotClick}
            />
          </Paper>
        )}
      </Box>

      {/* Alert Indicators (if alerts exist) */}
      {alerts.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 60,
            right: 8,
            bottom: 8,
            width: 4,
            bgcolor: 'divider',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        >
          {alerts.map((alert) => {
            const alertTime = new Date(alert.operationDate)
            const now = new Date()
            const hoursAgo = preferences.spot_period || 24
            const timeRange = hoursAgo * 60 * 60 * 1000
            const startTime = now.getTime() - timeRange
            const endTime = now.getTime() + 60 * 60 * 1000 // 1 hour future
            
            // Calculate position (0-1) within the time range
            const position = Math.max(0, Math.min(1, 
              (alertTime.getTime() - startTime) / (endTime - startTime)
            ))

            return (
              <Box
                key={alert.id}
                sx={{
                  position: 'absolute',
                  top: `${(1 - position) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 8,
                  bgcolor: alert.program === 'SOTA' ? '#1976d2' : '#4caf50',
                  borderRadius: 1,
                  transform: 'translateY(-50%)',
                  opacity: selectedAlert?.id === alert.id ? 1 : 0.7,
                  border: selectedAlert?.id === alert.id ? '2px solid white' : 'none',
                }}
              />
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default SpotCardView