import React from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Spot } from '@/types'

interface SpotTimelineProps {
  spots: Spot[]
  height?: number
  onSpotClick?: (spot: Spot) => void
}

const SpotTimeline: React.FC<SpotTimelineProps> = ({ 
  spots, 
  height = 400, 
  onSpotClick 
}) => {
  // Convert spots to chart data
  const chartData = React.useMemo(() => {
    if (!spots?.length) return []

    // Group spots by reference or callsign for Y-axis positioning
    const groups = new Map<string, number>()
    let yIndex = 0

    return spots.map(spot => {
      const groupKey = spot.summit_code || spot.summitCode || spot.park_code || spot.parkCode || spot.activator_call || spot.activatorCall || 'unknown'
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, yIndex++)
      }

      const spotTime = new Date(spot.time_string || spot.timeString || spot.time || Date.now())
      
      return {
        x: spotTime.getTime(),
        y: groups.get(groupKey) || 0,
        spot,
        reference: groupKey,
        activator: spot.activator_call || spot.activatorCall || '',
        frequency: spot.frequency || '',
        mode: spot.mode || '',
        comment: spot.comments || spot.comment || '',
        program: (spot.summit_code || spot.summitCode) ? 'SOTA' : 'POTA'
      }
    }).sort((a, b) => a.x - b.x)
  }, [spots])

  const handleDotClick = (data: any) => {
    if (onSpotClick && data.spot) {
      onSpotClick(data.spot)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const time = new Date(data.x)
      
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          fontSize: '12px'
        }}>
          <div><strong>{data.reference}</strong></div>
          <div>運用者: {data.activator}</div>
          <div>時刻: {format(time, 'HH:mm', { locale: ja })}</div>
          <div>周波数: {data.frequency} MHz</div>
          <div>モード: {data.mode}</div>
          {data.comment && <div>コメント: {data.comment}</div>}
          <div>プログラム: {data.program}</div>
        </div>
      )
    }
    return null
  }

  const formatXAxisTick = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm', { locale: ja })
  }

  const getColorByProgram = (program: string) => {
    return program === 'SOTA' ? '#1976d2' : '#388e3c'
  }

  if (!chartData.length) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <div>
          <i className="fas fa-satellite-dish" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
          <div style={{ color: '#666', textAlign: 'center' }}>
            指定された期間にスポット情報がありません
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="x" 
          scale="time" 
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatXAxisTick}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          domain={[0, 'dataMax']}
          tickFormatter={() => ''}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter dataKey="y" onClick={handleDotClick}>
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getColorByProgram(entry.program)}
              stroke="#fff"
              strokeWidth={1}
              r={6}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default SpotTimeline