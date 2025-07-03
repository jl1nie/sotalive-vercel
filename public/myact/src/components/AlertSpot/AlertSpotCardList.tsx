import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import AlertSpotCard from './AlertSpotCard'
import { useAlerts } from '@/hooks/useAlerts'
import { useActivationSpots, useActivationAlerts } from '@/hooks/useSOTAAPI'
import { useMapStore } from '@/stores/mapStore'
import { 
  processAlertSpotCards, 
  getActiveCount,
  type AlertSpotCardData,
  type SortMode,
  type TypeFilter,
  type ProgramFilter,
  type RegionFilter
} from '@/utils/alertSpotProcessing'
import type { OperationAlert, Spot, SotaAlert, SotaAlertValue } from '@/types'

interface AlertSpotCardListProps {
  height?: number
  onAlertClick?: (alert: OperationAlert) => void
  onSpotClick?: (spot: Spot) => void
  onViewOnMap?: (item: OperationAlert | Spot) => void
  autoRefresh?: boolean
  refreshInterval?: number // minutes
}


const AlertSpotCardList: React.FC<AlertSpotCardListProps> = ({
  height,
  onAlertClick,
  onSpotClick,
  onViewOnMap,
  autoRefresh = true,
  refreshInterval = 5, // 5 minutes
}) => {
  const { preferences, updatePreferences } = useMapStore()
  const { alerts, refreshAlerts } = useAlerts()
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh)
  
  // Use preferences from mapStore for persistent state
  const sortMode = preferences.alert_spot_sort_mode
  const typeFilter = preferences.alert_spot_type_filter
  const programFilter = preferences.alert_spot_program_filter
  const regionFilter = preferences.alert_spot_region_filter
  const showByCall = preferences.alert_spot_show_by_call
  
  const setSortMode = useCallback((mode: SortMode) => {
    updatePreferences({ alert_spot_sort_mode: mode })
  }, [updatePreferences])
  
  const setTypeFilter = useCallback((filter: TypeFilter) => {
    updatePreferences({ alert_spot_type_filter: filter })
  }, [updatePreferences])
  
  const setProgramFilter = useCallback((filter: ProgramFilter) => {
    updatePreferences({ alert_spot_program_filter: filter })
  }, [updatePreferences])
  
  const setRegionFilter = useCallback((filter: RegionFilter) => {
    updatePreferences({ alert_spot_region_filter: filter })
  }, [updatePreferences])
  
  const setShowByCall = useCallback((show: boolean) => {
    updatePreferences({ alert_spot_show_by_call: show })
  }, [updatePreferences])
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [regionMenuAnchor, setRegionMenuAnchor] = useState<null | HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Get spot data from API (全データを取得、フィルターは内部で実行)
  const { 
    data: spotData, 
    isLoading: spotsLoading, 
    refetch: refetchSpots 
  } = useActivationSpots({
    // pat_refを削除して全データ取得（レガシー実装と同じ）
    log_id: preferences.pota_hunter_uuid || undefined,
    by_call: showByCall ? true : undefined,
    by_ref: showByCall ? undefined : true,
    hours_ago: preferences.spot_period || 6, // デフォルト6時間
  })

  // Get alert data from API
  const { 
    data: apiAlertsData, 
    isLoading: alertsLoading, 
    refetch: refetchAlerts 
  } = useActivationAlerts({
    hours_ago: preferences.spot_period || 24,
    limit: 100,
  })

  // Debug logging
  const DEBUG = false // デバッグログ制御
  if (DEBUG) console.log('ALERT-SPOT - Raw API Data (詳細):', {
    spotData,
    spotsLoading,
    spotDataType: typeof spotData,
    spotDataKeys: spotData ? Object.keys(spotData) : null,
    spotsArray: spotData?.spots,
    spotsArrayLength: Array.isArray(spotData?.spots) ? spotData.spots.length : 'not array',
    preferences: {
      spot_period: preferences.spot_period,
      pota_hunter_uuid: preferences.pota_hunter_uuid,
    },
    showByCall,
    apiParams: {
      log_id: preferences.pota_hunter_uuid || undefined,
      by_call: showByCall ? true : undefined,
      by_ref: showByCall ? undefined : true,
      hours_ago: preferences.spot_period || 6,
    }
  })
  if (DEBUG) console.log('ALERT-SPOT - Alert API Data:', {
    apiAlertsData,
    alertsLoading,
    alertType: typeof apiAlertsData,
    alertsLength: Array.isArray(apiAlertsData) ? apiAlertsData.length : 'not array'
  })

  // Ensure data arrays
  const spots = Array.isArray(spotData?.spots) ? spotData.spots : []
  const apiAlerts = Array.isArray(apiAlertsData) ? apiAlertsData : []

  if (DEBUG) console.log('ALERT-SPOT - Processed arrays (詳細):', {
    spotsCount: spots.length,
    firstSpot: spots.length > 0 ? spots[0] : null,
    apiAlertsCount: apiAlerts.length,
    firstApiAlert: apiAlerts.length > 0 ? apiAlerts[0] : null,
    localAlertsCount: alerts.length,
    firstLocalAlert: alerts.length > 0 ? alerts[0] : null,
    spotsLoading,
    alertsLoading,
    currentRegionFilter: regionFilter,
    currentTypeFilter: typeFilter,
    currentProgramFilter: programFilter
  })

  // Convert API alerts to OperationAlert format
  const convertedApiAlerts = useMemo(() => {
    const converted: OperationAlert[] = []
    
    apiAlerts.forEach((alertGroup: SotaAlert) => {
      alertGroup.values.forEach((alertValue: SotaAlertValue) => {
        converted.push({
          id: `api-${alertValue.alert_id}`,
          title: `${alertValue.activator} - ${alertValue.reference}`,
          reference: alertValue.reference,
          program: alertValue.program as 'SOTA' | 'POTA',
          operationDate: alertValue.start_time,
          callsign: alertValue.activator,
          createdAt: alertValue.start_time,
          comment: alertValue.comment || undefined,
          frequencies: alertValue.frequencies || undefined,
          location: alertValue.location || undefined,
        })
      })
    })
    
    return converted
  }, [apiAlerts])

  // Combine local and API alerts
  const allAlerts = useMemo(() => {
    return [...alerts, ...convertedApiAlerts]
  }, [alerts, convertedApiAlerts])

  // Auto refresh logic
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const setupRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshAlerts()
        void refetchSpots()
        void refetchAlerts()
        setupRefresh() // Schedule next refresh
      }, refreshInterval * 60 * 1000)
    }

    setupRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [autoRefreshEnabled, refreshInterval, refreshAlerts, refetchSpots, refetchAlerts])

  // Process and match alerts with spots using pure functions
  const processedCards = useMemo(() => {
    return processAlertSpotCards(allAlerts, spots, {
      programFilter,
      regionFilter,
      typeFilter,
      sortMode,
      expandedCards,
      debug: DEBUG
    })
  }, [allAlerts, spots, programFilter, regionFilter, typeFilter, sortMode, expandedCards])

  const handleToggleExpand = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }, [])

  const handleRefresh = () => {
    refreshAlerts()
    void refetchSpots()
    void refetchAlerts()
  }

  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget)
  }

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget)
  }

  const handleRegionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setRegionMenuAnchor(event.currentTarget)
  }

  const getSortLabel = (mode: SortMode) => {
    switch (mode) {
      case 'time-desc': return '新しい順'
      case 'time-asc': return '古い順'
      case 'type': return 'タイプ別'
      case 'program': return 'プログラム別'
      default: return ''
    }
  }

  const getTypeFilterLabel = (filter: TypeFilter) => {
    switch (filter) {
      case 'all': return 'すべて'
      case 'alerts': return 'アラート'
      case 'spots': return 'スポット'
      case 'active': return 'アクティブ'
      default: return ''
    }
  }
  
  const getProgramFilterLabel = (filter: ProgramFilter) => {
    switch (filter) {
      case 'all': return 'すべて'
      case 'sota': return 'SOTA'
      case 'pota': return 'POTA'
      default: return ''
    }
  }

  const getRegionLabel = (mode: RegionFilter) => {
    switch (mode) {
      case 'worldwide': return '全世界'
      case 'japan': return '日本'
      default: return ''
    }
  }

  const activeCount = useMemo(() => getActiveCount(processedCards), [processedCards])

  return (
    <Box sx={{ 
      height: height || '100%',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>アラート・スポット</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="地域フィルター">
              <IconButton size="small" onClick={handleRegionMenuOpen}>
                <i className="fas fa-globe" style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="フィルター">
              <IconButton size="small" onClick={handleFilterMenuOpen}>
                <i className="fas fa-filter" style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="ソート">
              <IconButton size="small" onClick={handleSortMenuOpen}>
                <i className="fas fa-sort" style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="更新">
              <IconButton size="small" onClick={handleRefresh}>
                <i className="fas fa-sync" style={{ fontSize: '16px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={getRegionLabel(regionFilter)} size="small" color="secondary" />
          <Chip label={getTypeFilterLabel(typeFilter)} size="small" color="primary" />
          <Chip label={getProgramFilterLabel(programFilter)} size="small" color="info" />
          <Chip label={getSortLabel(sortMode)} size="small" variant="outlined" />
          <Chip label={`${processedCards.length}件`} size="small" variant="outlined" />
          {activeCount > 0 && (
            <Chip label={`アクティブ ${activeCount}件`} size="small" color="warning" />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">自動更新</Typography>}
          />
        </Box>
      </Box>

      {/* Card List */}
      <Box 
        ref={containerRef}
        data-testid="alert-spot-card-list"
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          overflowY: 'scroll',
          p: 1,
          '& > *:not(:last-child)': { mb: 1 },
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555'
          }
        }}
      >
        {(spotsLoading || alertsLoading) ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              データを読み込み中...
            </Typography>
          </Box>
        ) : processedCards.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              アラート・スポットがありません
            </Typography>
          </Box>
        ) : (
          processedCards.map((card) => (
            <AlertSpotCard
              key={card.id}
              data={card}
              onToggleExpand={handleToggleExpand}
              onAlertClick={onAlertClick}
              onSpotClick={onSpotClick}
              onViewOnMap={onViewOnMap}
            />
          ))
        )}
      </Box>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setSortMode('time-desc'); setSortMenuAnchor(null) }}>
          新しい順
        </MenuItem>
        <MenuItem onClick={() => { setSortMode('time-asc'); setSortMenuAnchor(null) }}>
          古い順
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setSortMode('type'); setSortMenuAnchor(null) }}>
          タイプ別
        </MenuItem>
        <MenuItem onClick={() => { setSortMode('program'); setSortMenuAnchor(null) }}>
          プログラム別
        </MenuItem>
      </Menu>

      {/* Region Filter Menu */}
      <Menu
        anchorEl={regionMenuAnchor}
        open={Boolean(regionMenuAnchor)}
        onClose={() => setRegionMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setRegionFilter('worldwide'); setRegionMenuAnchor(null) }}>
          全世界
        </MenuItem>
        <MenuItem onClick={() => { setRegionFilter('japan'); setRegionMenuAnchor(null) }}>
          日本 (JA/JP)
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">種類</Typography>
        </Box>
        <MenuItem 
          onClick={() => { setTypeFilter('all'); setFilterMenuAnchor(null) }}
          selected={typeFilter === 'all'}
        >
          すべて
        </MenuItem>
        <MenuItem 
          onClick={() => { setTypeFilter('alerts'); setFilterMenuAnchor(null) }}
          selected={typeFilter === 'alerts'}
        >
          アラート
        </MenuItem>
        <MenuItem 
          onClick={() => { setTypeFilter('spots'); setFilterMenuAnchor(null) }}
          selected={typeFilter === 'spots'}
        >
          スポット
        </MenuItem>
        <MenuItem 
          onClick={() => { setTypeFilter('active'); setFilterMenuAnchor(null) }}
          selected={typeFilter === 'active'}
        >
          アクティブ
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">プログラム</Typography>
        </Box>
        <MenuItem 
          onClick={() => { setProgramFilter('all'); setFilterMenuAnchor(null) }}
          selected={programFilter === 'all'}
        >
          すべて
        </MenuItem>
        <MenuItem 
          onClick={() => { setProgramFilter('sota'); setFilterMenuAnchor(null) }}
          selected={programFilter === 'sota'}
        >
          SOTA
        </MenuItem>
        <MenuItem 
          onClick={() => { setProgramFilter('pota'); setFilterMenuAnchor(null) }}
          selected={programFilter === 'pota'}
        >
          POTA
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default AlertSpotCardList