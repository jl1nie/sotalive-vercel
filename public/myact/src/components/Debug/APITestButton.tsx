import React, { useState } from 'react'
import { Button, Box, Alert, Typography } from '@mui/material'
import { APIService } from '@/services/api'

const APITestButton: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testAPI = async () => {
    setIsLoading(true)
    setTestResult('Testing API...')
    
    try {
      // Test basic search in Japan area
      const result = await APIService.searchInBounds({
        min_lat: 35.0,
        min_lon: 135.0,
        max_lat: 36.0,
        max_lon: 136.0,
        min_elev: 0,
        min_area: 0
      })
      
      if (result) {
        const sota = (result as any).sota || []
        const pota = (result as any).pota || []
        setTestResult(`✅ API Success: SOTA=${sota.length}, POTA=${pota.length}`)
      } else {
        setTestResult('❌ API returned null')
      }
    } catch (error) {
      setTestResult(`❌ API Error: ${error}`)
    }
    
    setIsLoading(false)
  }

  return (
    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
      <Button 
        variant="contained" 
        onClick={testAPI}
        disabled={isLoading}
        sx={{ mb: 1 }}
      >
        Test API
      </Button>
      
      {testResult && (
        <Alert 
          severity={testResult.includes('✅') ? 'success' : 'error'}
          sx={{ maxWidth: 300 }}
        >
          <Typography variant="body2">
            {testResult}
          </Typography>
        </Alert>
      )}
    </Box>
  )
}

export default APITestButton