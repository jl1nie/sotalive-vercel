import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  SelectChangeEvent
} from '@mui/material'
import SpotTimeline from '../SpotCard/SpotTimeline'
import { useActivationSpots } from '@/hooks/useSOTAAPI'

interface TimelineDialogProps {
  open: boolean
  onClose: () => void
}

const TimelineDialog: React.FC<TimelineDialogProps> = ({ open, onClose }) => {
  const [spotPeriod, setSpotPeriod] = useState(6) // hours
  const [programFilter, setProgramFilter] = useState('all') // 'all', 'sota', 'pota'
  const [byCallsign, setByCallsign] = useState(false)

  // API query for spots data (全データを取得、フィルターは内部で実行)
  const { data: spotsData, isLoading } = useActivationSpots({
    // pat_refを削除して全データを取得
    hours_ago: spotPeriod,
    by_call: byCallsign,
    by_ref: !byCallsign
  })

  const handlePeriodChange = (event: SelectChangeEvent<number>) => {
    setSpotPeriod(Number(event.target.value))
  }

  const handleProgramChange = (event: SelectChangeEvent<string>) => {
    setProgramFilter(event.target.value)
  }

  const handleByCallsignChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setByCallsign(event.target.checked)
  }

  const filteredSpots = React.useMemo(() => {
    if (!spotsData?.spots) return []
    
    return spotsData.spots.filter(spot => {
      if (programFilter === 'sota' && !spot.summit_code && !spot.summitCode) return false
      if (programFilter === 'pota' && !spot.park_code && !spot.parkCode) return false
      return true
    })
  }, [spotsData, programFilter])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: '90%',
          height: '80%',
          maxWidth: 'none',
          margin: '1rem auto'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="span">
            <i className="fas fa-satellite-dish" style={{ marginRight: '8px' }} />
            最新スポット情報
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={programFilter}
              onChange={handleProgramChange}
              displayEmpty
            >
              <MenuItem value="all">全プログラム</MenuItem>
              <MenuItem value="sota">SOTA のみ</MenuItem>
              <MenuItem value="pota">POTA のみ</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={spotPeriod}
              onChange={handlePeriodChange}
              displayEmpty
            >
              <MenuItem value={1}>1時間</MenuItem>
              <MenuItem value={3}>3時間</MenuItem>
              <MenuItem value={6}>6時間</MenuItem>
              <MenuItem value={9}>9時間</MenuItem>
              <MenuItem value={12}>12時間</MenuItem>
              <MenuItem value={15}>15時間</MenuItem>
              <MenuItem value={18}>18時間</MenuItem>
              <MenuItem value={21}>21時間</MenuItem>
              <MenuItem value={24}>24時間</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={byCallsign}
                onChange={handleByCallsignChange}
                size="small"
              />
            }
            label="コールサイン別"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, height: '100%' }}>
        <Box sx={{ height: '100%', width: '100%' }}>
          {isLoading ? (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}
            >
              <Typography>読み込み中...</Typography>
            </Box>
          ) : (
            <SpotTimeline 
              spots={filteredSpots}
              height={400}
              onSpotClick={(spot) => {
                console.log('Timeline spot clicked:', spot)
                // TODO: Center map on spot location
              }}
            />
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TimelineDialog