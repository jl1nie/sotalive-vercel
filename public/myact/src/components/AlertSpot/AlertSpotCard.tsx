import React from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import { format, formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { OperationAlert, Spot } from '@/types'
import type { AlertSpotCardData } from '@/utils/alertSpotProcessing'

// Removed duplicate AlertSpotCardData interface - now imported from utils

interface AlertSpotCardProps {
  data: AlertSpotCardData
  onToggleExpand?: (id: string) => void
  onAlertClick?: (alert: OperationAlert) => void
  onSpotClick?: (spot: Spot) => void
  onViewOnMap?: (alert: OperationAlert | Spot) => void
}

const AlertSpotCard: React.FC<AlertSpotCardProps> = ({
  data,
  onToggleExpand,
  onAlertClick,
  onSpotClick,
  onViewOnMap,
}) => {
  const { type, alert, spot, matchedSpots = [], isExpanded = false } = data

  const handleToggleExpand = () => {
    onToggleExpand?.(data.id)
  }

  const handleMainClick = () => {
    if (type === 'alert' && alert) {
      onAlertClick?.(alert)
    } else if (type === 'spot' && spot) {
      onSpotClick?.(spot)
    }
  }

  const handleViewOnMap = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (type === 'alert' && alert) {
      onViewOnMap?.(alert)
    } else if (type === 'spot' && spot) {
      onViewOnMap?.(spot)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'HH:mm', { locale: ja })
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true, locale: ja })
  }

  const getProgramColor = (program: string) => {
    switch (program) {
      case 'SOTA': return '#1976d2'
      case 'POTA': return '#4caf50'
      default: return '#757575'
    }
  }

  const getTimeStatus = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMinutes = diffMs / (1000 * 60)

    if (Math.abs(diffMinutes) <= 30) return 'active' // Within 30 minutes
    if (diffMinutes > 0) return 'future' // Future
    return 'past' // Past
  }

  const getCardStyle = () => {
    if (type === 'alert') {
      const status = alert ? getTimeStatus(alert.operationDate) : 'past'
      return {
        border: status === 'active' ? 2 : 1,
        borderColor: status === 'active' ? 'warning.main' : 'divider',
        bgcolor: status === 'future' ? 'primary.50' : 'background.paper',
      }
    } else {
      const status = spot ? getTimeStatus(spot.spotTime) : 'past'
      return {
        border: status === 'active' ? 2 : 1,
        borderColor: status === 'active' ? 'error.main' : 'divider',
        bgcolor: status === 'active' ? 'error.50' : 'background.paper',
        opacity: status === 'past' ? 0.8 : 1,
      }
    }
  }

  // Alert Card
  if (type === 'alert' && alert) {
    const hasMatchedSpots = matchedSpots.length > 0
    const timeStatus = getTimeStatus(alert.operationDate)

    return (
      <Card
        variant="outlined"
        data-testid="alert-spot-card"
        data-card-type={type}
        sx={{
          ...getCardStyle(),
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={handleMainClick}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <i className="fas fa-bell" style={{ fontSize: '16px', color: '#1976d2' }} />
              <Chip
                label={alert.program}
                size="small"
                sx={{
                  bgcolor: getProgramColor(alert.program),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              <Chip
                label={timeStatus === 'active' ? 'アクティブ' : timeStatus === 'future' ? '予定' : '終了'}
                size="small"
                color={timeStatus === 'active' ? 'warning' : timeStatus === 'future' ? 'primary' : 'default'}
                variant={timeStatus === 'active' ? 'filled' : 'outlined'}
              />
              {hasMatchedSpots && (
                <Badge badgeContent={matchedSpots.length} color="secondary">
                  <i className="fas fa-broadcast-tower" style={{ fontSize: '16px', color: '#757575' }} />
                </Badge>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                {formatTime(alert.operationDate)}
              </Typography>
              {hasMatchedSpots && (
                <IconButton size="small" onClick={handleToggleExpand}>
                  <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '16px' }} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <i className="fas fa-user" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="body1" component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {alert.callsign}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {alert.reference}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fas fa-clock" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {formatRelativeTime(alert.operationDate)}
              </Typography>
            </Box>
          </Box>

          {/* Title */}
          {alert.title && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {alert.title}
              </Typography>
            </>
          )}

          {/* Matched Spots */}
          <Collapse in={isExpanded}>
            {matchedSpots.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                  関連スポット ({matchedSpots.length}件)
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {matchedSpots.map((matchedSpot, index) => (
                    <Box
                      key={`${matchedSpot.spotTime}-${index}`}
                      sx={{
                        py: 1,
                        borderLeft: 2,
                        borderColor: 'secondary.main',
                        pl: 2,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSpotClick?.(matchedSpot)
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {matchedSpot.frequency} {matchedSpot.mode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                          {formatTime(matchedSpot.spotTime)}
                        </Typography>
                      </Box>
                      {matchedSpot.comment && (
                        <Typography variant="caption" color="text.secondary">
                          {matchedSpot.comment}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Collapse>
        </CardContent>
      </Card>
    )
  }

  // Spot Card
  if (type === 'spot' && spot) {
    const timeStatus = getTimeStatus(spot.spotTime)

    return (
      <Card
        variant="outlined"
        data-testid="alert-spot-card"
        data-card-type={type}
        sx={{
          ...getCardStyle(),
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={handleMainClick}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <i className="fas fa-broadcast-tower" style={{ fontSize: '16px', color: '#9c27b0' }} />
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
                label={formatRelativeTime(spot.spotTime)}
                size="small"
                color={timeStatus === 'active' ? 'error' : timeStatus === 'future' ? 'primary' : 'default'}
                variant={timeStatus === 'active' ? 'filled' : 'outlined'}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" fontWeight="bold">
              {formatTime(spot.spotTime)}
            </Typography>
          </Box>

          {/* Main Content */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <i className="fas fa-user" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="body1" component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {spot.activator}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {spot.reference}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fas fa-broadcast-tower" style={{ fontSize: '14px', color: '#757575' }} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
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
    )
  }

  return null
}

export default AlertSpotCard