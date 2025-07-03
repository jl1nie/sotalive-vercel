import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  Paper,
  InputAdornment
} from '@mui/material'
// Using Open Iconic icons for consistency with original
import { APIService } from '@/services/api'

interface ReferenceResult {
  code: string
  coord: [number, number]
  name: string
  data?: any
}

interface SearchCandidate {
  code: string
  lat: number
  lon: number
  nameJ: string
  [key: string]: any
}

interface ReferenceSearchProps {
  /** 検索結果選択時のコールバック */
  onSelect?: (result: ReferenceResult) => void
  /** 入力フィールドの幅（px） */
  width?: number
  /** 候補数の上限 */
  maxCandidates?: number
  /** プレースホルダーテキスト */
  placeholder?: string
  /** 無効化フラグ */
  disabled?: boolean
}

/**
 * 座標文字列を解析
 * @param text 入力テキスト（例: "35.6762, 139.6503"）
 * @returns 座標データまたは null
 */
function parseCoordinates(text: string): ReferenceResult | null {
  if (text.length <= 14) return null
  
  const coordString = text.replace(/\s/g, '')
  const coords = coordString.split(',')
  
  if (coords.length !== 2) return null
  
  const lat = parseFloat(coords[0])
  const lng = parseFloat(coords[1])
  
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  
  return {
    code: 'COORD',
    coord: [lat, lng],
    name: `座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    data: { type: 'coordinate', lat, lng }
  }
}

/**
 * ReferenceSearch コンポーネント
 * SOTA/POTA リファレンス検索インターフェース
 */
export function ReferenceSearch({
  onSelect,
  width = 400,
  maxCandidates = 300,
  placeholder = "Search SOTA/POTA references...",
  disabled = false
}: ReferenceSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [candidates, setCandidates] = useState<ReferenceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedValue, setSelectedValue] = useState<ReferenceResult | null>(null)
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 検索実行
  const performSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim()) {
      setCandidates([])
      return
    }

    // 座標入力チェック
    const coordResult = parseCoordinates(searchText)
    if (coordResult) {
      setCandidates([coordResult])
      return
    }

    setLoading(true)
    
    try {
      const response = await APIService.searchReference(searchText)
      
      if (response) {
        // Anti-Corruption Layer transforms data to { summits: Summit[], parks: Park[] }
        const results: ReferenceResult[] = []
        
        // Process summits
        response.summits.forEach(summit => {
          results.push({
            code: summit.summitCode,
            coord: [summit.latitude, summit.longitude] as [number, number],
            name: summit.summitNameJ || summit.summitName,
            data: { ...summit, type: 'summit' }
          })
        })
        
        // Process parks
        response.parks.forEach(park => {
          results.push({
            code: park.potaCode,
            coord: [park.latitude, park.longitude] as [number, number],
            name: park.parkNameJ,
            data: { ...park, type: 'park' }
          })
        })
        
        // Limit candidates
        if (results.length < maxCandidates) {
          setCandidates(results)
        } else {
          // 候補が多すぎる場合
          setCandidates([])
        }
      }
    } catch (error) {
      console.error('Reference search error:', error)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [maxCandidates])

  // 入力変更時の処理
  const handleInputChange = useCallback((_event: React.SyntheticEvent, value: string) => {
    setInputValue(value)
    
    // 既存のタイマーをクリア
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 空文字の場合は即座にクリア
    if (!value.trim()) {
      setCandidates([])
      return
    }

    // デバウンス処理（300ms）
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  // 選択時の処理
  const handleSelect = useCallback((_event: React.SyntheticEvent, value: ReferenceResult | null) => {
    if (value) {
      setSelectedValue(value)
      setInputValue('')
      setCandidates([])
      
      if (onSelect) {
        onSelect(value)
      }
    }
  }, [onSelect])

  // 直接コード入力での選択
  const handleDirectSelect = useCallback((searchText: string) => {
    const trimmed = searchText.trim().toUpperCase()
    
    // 候補から完全一致を探す
    const exactMatch = candidates.find(candidate => 
      candidate.code === trimmed
    )
    
    if (exactMatch) {
      handleSelect({} as React.SyntheticEvent, exactMatch)
    }
  }, [candidates, handleSelect])

  // キー入力処理
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      // Enter キーで直接選択を試行
      const words = inputValue.trim().split(' ')
      if (words[0]) {
        handleDirectSelect(words[0])
      }
    }
  }, [inputValue, handleDirectSelect])

  // オプションのレンダリング
  const renderOption = (props: React.HTMLAttributes<HTMLLIElement>, option: ReferenceResult) => (
    <Box component="li" {...props}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <i className="fas fa-map-marker-alt" style={{ color: '#757575', marginRight: '8px', fontSize: '18px' }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {option.code}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {option.name}
          </Typography>
        </Box>
        <Chip 
          label={`${option.coord[0].toFixed(4)}, ${option.coord[1].toFixed(4)}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>
    </Box>
  )

  // 入力フィールドのレンダリング
  const renderInput = (params: any) => (
    <TextField
      {...params}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      disabled={disabled}
      InputProps={{
        ...params.InputProps,
        startAdornment: (
          <InputAdornment position="start">
            <i className="oi oi-magnifying-glass" style={{ color: 'gray', fontSize: '16px' }} />
          </InputAdornment>
        )
      }}
      sx={{ 
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'background.paper'
        }
      }}
    />
  )

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Box sx={{ width: width, maxWidth: '100%' }}>
      <Autocomplete
        value={selectedValue}
        inputValue={inputValue}
        onChange={handleSelect}
        onInputChange={handleInputChange}
        options={candidates}
        loading={loading}
        loadingText="検索中..."
        noOptionsText={inputValue.trim() ? "候補が見つかりません" : "検索語を入力してください"}
        getOptionLabel={(option) => `${option.code} ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        renderOption={renderOption}
        renderInput={renderInput}
        PaperComponent={(props) => (
          <Paper {...props} sx={{ maxHeight: 300, overflow: 'auto' }} />
        )}
        componentsProps={{
          popper: {
            sx: { zIndex: 1300 }
          }
        }}
        onKeyDown={handleKeyDown}
        clearOnBlur={false}
        selectOnFocus
        handleHomeEndKeys
      />
      
      {/* 検索ヒント */}
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ mt: 0.5, display: 'block' }}
      >
        例: "JA/ST-001", "富士山", "35.6762, 139.6503"
      </Typography>
    </Box>
  )
}