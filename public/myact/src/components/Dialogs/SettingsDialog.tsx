import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  InputLabel,
  SelectChangeEvent
} from '@mui/material'
import { useMapStore } from '@/stores/mapStore'
import type { Preferences } from '@/types'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  )
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { preferences, updatePreferences } = useMapStore()
  const [tabValue, setTabValue] = useState(0)
  const [localPrefs, setLocalPrefs] = useState<Preferences>(preferences)

  // Update local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalPrefs(preferences)
    }
  }, [open, preferences])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleSwitchChange = (key: keyof Preferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: event.target.checked
    }))
  }

  const handleTextChange = (key: keyof Preferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: event.target.value
    }))
  }

  const handleSelectChange = (key: keyof Preferences) => (event: SelectChangeEvent<any>) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: event.target.value
    }))
  }

  const handleSave = () => {
    updatePreferences(localPrefs)
    onClose()
  }

  const handleCancel = () => {
    setLocalPrefs(preferences) // Reset to original
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '80%'
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">
          <i className="oi oi-cog" style={{ marginRight: '8px' }} />
          設定
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="表示設定" />
            <Tab label="POTA設定" />
            <Tab label="パドルエミュレータ" />
            <Tab label="その他" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>表示オプション</Typography>
              <FormControlLabel
                control={<Switch checked={localPrefs.popup_permanent} onChange={handleSwitchChange('popup_permanent')} />}
                label="ポップアップを常時表示"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.display_mapcode} onChange={handleSwitchChange('display_mapcode')} />}
                label="マップコードを表示"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.link_googlemap} onChange={handleSwitchChange('link_googlemap')} />}
                label="Google マップリンクを有効"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.display_area} onChange={handleSwitchChange('display_area')} />}
                label="自然公園領域を表示"
              />
            </Box>
            
            <Box>
              <Divider />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>参照データ</Typography>
              <FormControlLabel
                control={<Switch checked={localPrefs.sota_ref} onChange={handleSwitchChange('sota_ref')} />}
                label="SOTA 参照"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.pota_ref} onChange={handleSwitchChange('pota_ref')} />}
                label="POTA 参照"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.jaff_ref} onChange={handleSwitchChange('jaff_ref')} />}
                label="JAFF 参照"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.aprs_track} onChange={handleSwitchChange('aprs_track')} />}
                label="APRS トラック"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>ズーム閾値</InputLabel>
                <Select
                  value={localPrefs.zoom_threshold}
                  onChange={handleSelectChange('zoom_threshold')}
                  label="ズーム閾値"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 8).map(zoom => (
                    <MenuItem key={zoom} value={zoom}>{zoom}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>スポット期間 (時間)</InputLabel>
                <Select
                  value={localPrefs.spot_period}
                  onChange={handleSelectChange('spot_period')}
                  label="スポット期間 (時間)"
                >
                  {[1, 3, 6, 9, 12, 15, 18, 21, 24].map(hours => (
                    <MenuItem key={hours} value={hours}>{hours}時間</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>POTA ログ設定</Typography>
              <FormControlLabel
                control={<Switch checked={localPrefs.show_potalog} onChange={handleSwitchChange('show_potalog')} />}
                label="POTA ログを表示"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.show_potaactlog} onChange={handleSwitchChange('show_potaactlog')} />}
                label="アクティベータログを表示"
              />
            </Box>
            
            <Box>
              <TextField
                fullWidth
                label="POTA Hunter UUID"
                value={localPrefs.pota_hunter_uuid || ''}
                onChange={handleTextChange('pota_hunter_uuid')}
                placeholder="ハンター用 UUID"
              />
            </Box>
            
            <Box>
              <TextField
                fullWidth
                label="POTA Activator UUID"
                value={localPrefs.pota_activator_uuid || ''}
                onChange={handleTextChange('pota_activator_uuid')}
                placeholder="アクティベータ用 UUID"
              />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>パドルエミュレータ設定</Typography>
              <FormControlLabel
                control={<Switch checked={localPrefs.enable_emulation} onChange={handleSwitchChange('enable_emulation')} />}
                label="エミュレーション有効"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="コールサイン"
                value={localPrefs.pemu_call}
                onChange={handleTextChange('pemu_call')}
              />

              <TextField
                fullWidth
                label="WPM"
                value={localPrefs.pemu_wpm}
                onChange={handleTextChange('pemu_wpm')}
                type="number"
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="ホスト"
                value={localPrefs.pemu_host}
                onChange={handleTextChange('pemu_host')}
              />
            </Box>

            <Box>
              <FormControlLabel
                control={<Switch checked={localPrefs.enable_serial} onChange={handleSwitchChange('enable_serial')} />}
                label="シリアル接続有効"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.enable_wifi} onChange={handleSwitchChange('enable_wifi')} />}
                label="WiFi 接続有効"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.paddle_reverse} onChange={handleSwitchChange('paddle_reverse')} />}
                label="パドル逆転"
              />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>その他の設定</Typography>
              <FormControlLabel
                control={<Switch checked={localPrefs.by_call} onChange={handleSwitchChange('by_call')} />}
                label="コールサイン別表示"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.pilgrim} onChange={handleSwitchChange('pilgrim')} />}
                label="巡礼モード"
              />
              <FormControlLabel
                control={<Switch checked={localPrefs.include_areacode} onChange={handleSwitchChange('include_areacode')} />}
                label="エリアコード含む"
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="マイコールサイン"
                value={localPrefs.my_callsign}
                onChange={handleTextChange('my_callsign')}
                placeholder="あなたのコールサイン"
              />
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleCancel} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog