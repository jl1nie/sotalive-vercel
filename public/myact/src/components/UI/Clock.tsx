import React, { useState, useEffect } from 'react'
import { Typography } from '@mui/material'
import { useGeomagneticData } from '@/hooks/useSOTAAPI'
import type { GeomagneticResponse } from '@/types/api'

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date())
  const { data: geomagData } = useGeomagneticData()

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  // Format geomagnetic index
  const geomagIndex = geomagData 
    ? `A:${(geomagData as GeomagneticResponse).aIndex || '--'} K:${(geomagData as GeomagneticResponse).kIndex?.[0] || '-'}`
    : 'A:-- K:-'

  const formatTime = (date: Date) => {
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  return (
    <Typography 
      variant="body2" 
      sx={{ 
        color: 'white',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap'
      }}
    >
      {formatTime(time)} {geomagIndex}
    </Typography>
  )
}

export default Clock