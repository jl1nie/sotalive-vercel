import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  CircularProgress,
} from '@mui/material'
// Using Font Awesome and Open Iconic icons for consistency with original
import Clock from '../UI/Clock'
import { useGPS } from '@/hooks/useGPS'
import TimelineDialog from '../Dialogs/TimelineDialog'
import SettingsDialog from '../Dialogs/SettingsDialog'

const Navbar: React.FC = () => {
  const { isLoading, getCurrentPosition } = useGPS()
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  // Store methods are handled in useGPS hook

  const handleQTHClick = async () => {
    try {
      await getCurrentPosition()
      // GPS位置取得成功時の処理は useGPS フック内で処理される
    } catch (error) {
      console.error('GPS location error:', error)
    }
  }

  const handleSpotsClick = () => {
    setTimelineDialogOpen(true)
  }

  const handleSettingsClick = () => {
    setSettingsDialogOpen(true)
  }

  return (
    <AppBar position="static" color="default" sx={{ bgcolor: '#343a40' }}>
      <Toolbar variant="dense" sx={{ minHeight: { xs: 48, sm: 56 } }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            color: 'white',
            cursor: 'pointer',
            mr: 2 
          }}
        >
          MyACT
        </Typography>
        
        <IconButton
          color="inherit"
          onClick={handleQTHClick}
          title="現在位置を調べる"
          disabled={isLoading}
          sx={{ 
            bgcolor: '#ffc107',
            color: 'black',
            mr: 1,
            '&:hover': { bgcolor: '#ffca2c' },
            '&:disabled': { bgcolor: '#f0f0f0' }
          }}
        >
          {isLoading ? <CircularProgress size={20} /> : <i className="fas fa-map-marked-alt" style={{ fontSize: '18px' }} />}
        </IconButton>
        
        <IconButton
          color="inherit"
          onClick={handleSpotsClick}
          title="最新スポットを表示"
          sx={{ 
            bgcolor: '#17a2b8',
            mr: 1,
            '&:hover': { bgcolor: '#138496' }
          }}
        >
          <i className="fas fa-satellite-dish" style={{ fontSize: '18px' }} />
        </IconButton>
        
        <IconButton
          color="inherit"
          onClick={handleSettingsClick}
          title="設定"
          sx={{ 
            bgcolor: '#007bff',
            mr: 2,
            '&:hover': { bgcolor: '#0056b3' }
          }}
        >
          <i className="oi oi-cog" style={{ fontSize: '18px' }} />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />
        
        <Clock />
      </Toolbar>
      
      {/* Dialog components */}
      <TimelineDialog 
        open={timelineDialogOpen} 
        onClose={() => setTimelineDialogOpen(false)} 
      />
      <SettingsDialog 
        open={settingsDialogOpen} 
        onClose={() => setSettingsDialogOpen(false)} 
      />
    </AppBar>
  )
}

export default Navbar