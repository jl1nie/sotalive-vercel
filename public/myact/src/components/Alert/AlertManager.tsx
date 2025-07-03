import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ja } from 'date-fns/locale'
import { useMapStore } from '@/stores/mapStore'
import type { OperationAlert } from '@/types'

interface AlertManagerProps {
  alerts: OperationAlert[]
  onAddAlert: (alert: Omit<OperationAlert, 'id' | 'createdAt'>) => void
  onUpdateAlert: (id: string, alert: Partial<OperationAlert>) => void
  onDeleteAlert: (id: string) => void
  onAlertClick?: (alert: OperationAlert) => void
}

interface AlertFormData {
  title: string
  reference: string
  program: 'SOTA' | 'POTA' | 'WWFF'
  operationDate: Date
  frequency: string
  mode: string
  comment: string
  callsign: string
}

const AlertManager: React.FC<AlertManagerProps> = ({
  alerts,
  onAddAlert,
  onUpdateAlert,
  onDeleteAlert,
  onAlertClick,
}) => {
  const { preferences } = useMapStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<OperationAlert | null>(null)
  const [formData, setFormData] = useState<AlertFormData>({
    title: '',
    reference: '',
    program: 'SOTA',
    operationDate: new Date(),
    frequency: '',
    mode: 'SSB',
    comment: '',
    callsign: preferences.my_callsign || '',
  })

  // Group alerts by date
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, OperationAlert[]> = {}
    const now = new Date()
    
    alerts.forEach(alert => {
      const alertDate = new Date(alert.operationDate)
      const dayKey = alertDate.toDateString()
      
      if (!groups[dayKey]) {
        groups[dayKey] = []
      }
      groups[dayKey].push(alert)
    })

    // Sort each group by time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
      )
    })

    // Sort dates
    const sortedDates = Object.keys(groups).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    )

    return sortedDates.map(date => ({
      date,
      alerts: groups[date],
      isPast: new Date(date).getTime() < now.getTime() - 24 * 60 * 60 * 1000
    }))
  }, [alerts])

  const handleOpenDialog = (alert?: OperationAlert) => {
    if (alert) {
      setEditingAlert(alert)
      setFormData({
        title: alert.title,
        reference: alert.reference,
        program: alert.program,
        operationDate: new Date(alert.operationDate),
        frequency: alert.frequency || '',
        mode: alert.mode || 'SSB',
        comment: alert.comment || '',
        callsign: alert.callsign,
      })
    } else {
      setEditingAlert(null)
      setFormData({
        title: '',
        reference: '',
        program: 'SOTA',
        operationDate: new Date(),
        frequency: '',
        mode: 'SSB',
        comment: '',
        callsign: preferences.my_callsign || '',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingAlert(null)
  }

  const handleSave = () => {
    if (!formData.title || !formData.reference) return

    const alertData = {
      title: formData.title,
      reference: formData.reference,
      program: formData.program,
      operationDate: formData.operationDate.toISOString(),
      frequency: formData.frequency || undefined,
      mode: formData.mode || undefined,
      comment: formData.comment || undefined,
      callsign: formData.callsign,
    }

    if (editingAlert) {
      onUpdateAlert(editingAlert.id, alertData)
    } else {
      onAddAlert(alertData)
    }

    handleCloseDialog()
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const getProgramColor = (program: string) => {
    switch (program) {
      case 'SOTA': return '#1976d2'
      case 'POTA': return '#4caf50'
      case 'WWFF': return '#ff9800'
      default: return '#757575'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fas fa-calendar" style={{ fontSize: '18px' }} />
              運用アラート
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<i className="fas fa-plus" style={{ fontSize: '16px' }} />}
              onClick={() => handleOpenDialog()}
            >
              追加
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {alerts.length} 件のアラート
          </Typography>
        </Box>

        {/* Alert List */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {groupedAlerts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                アラートがありません
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {groupedAlerts.map(({ date, alerts: dayAlerts, isPast }) => (
                <Box key={date}>
                  <Typography 
                    variant="subtitle2" 
                    color={isPast ? 'text.secondary' : 'text.primary'}
                    sx={{ mb: 1, opacity: isPast ? 0.7 : 1 }}
                  >
                    {formatDate(date)}
                  </Typography>
                  <Stack spacing={1}>
                    {dayAlerts.map((alert) => (
                      <Card 
                        key={alert.id}
                        variant="outlined"
                        sx={{ 
                          cursor: onAlertClick ? 'pointer' : 'default',
                          opacity: isPast ? 0.7 : 1,
                          '&:hover': onAlertClick ? { bgcolor: 'action.hover' } : {}
                        }}
                        onClick={() => onAlertClick?.(alert)}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Chip
                                  label={alert.program}
                                  size="small"
                                  sx={{ 
                                    bgcolor: getProgramColor(alert.program),
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }}
                                />
                                <Typography variant="body2" fontWeight="bold">
                                  {formatTime(alert.operationDate)}
                                </Typography>
                              </Box>
                              
                              <Typography variant="body1" fontWeight="bold" gutterBottom>
                                {alert.title}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <i className="fas fa-map-marker-alt" style={{ fontSize: '16px', color: '#757575' }} />
                                <Typography variant="body2">
                                  {alert.reference}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  by {alert.callsign}
                                </Typography>
                              </Box>

                              {(alert.frequency || alert.mode) && (
                                <Typography variant="body2" color="text.secondary">
                                  {alert.frequency} {alert.mode}
                                </Typography>
                              )}

                              {alert.comment && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  {alert.comment}
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="編集">
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenDialog(alert)
                                  }}
                                >
                                  <i className="fas fa-edit" style={{ fontSize: '16px' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="削除">
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteAlert(alert.id)
                                  }}
                                >
                                  <i className="fas fa-trash" style={{ fontSize: '16px' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingAlert ? 'アラート編集' : '新規アラート'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="タイトル"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="リファレンス"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="JA/ST-001, JP-0001"
                  required
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel id="program-select-label">プログラム</InputLabel>
                  <Select
                    name="program"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value as any })}
                    labelId="program-select-label"
                    label="プログラム"
                  >
                    <MenuItem value="SOTA">SOTA</MenuItem>
                    <MenuItem value="POTA">POTA</MenuItem>
                    <MenuItem value="WWFF">WWFF</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <DateTimePicker
                label="運用予定日時"
                value={formData.operationDate}
                onChange={(date: Date | null) => date && setFormData({ ...formData, operationDate: date })}
                format="yyyy/MM/dd HH:mm"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="周波数"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="14.230, 21.250"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="モード"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  placeholder="SSB, CW, FT8"
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                label="コールサイン"
                name="callsign"
                value={formData.callsign}
                onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                required
              />

              <TextField
                label="コメント"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              disabled={!formData.title || !formData.reference}
            >
              {editingAlert ? '更新' : '追加'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}

export default AlertManager