import React from 'react'
import { Box } from '@mui/material'
import Navbar from './Navbar'
import MapContainer from '../Map/MapContainer'

const Layout: React.FC = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MapContainer />
      </Box>
    </Box>
  )
}

export default Layout