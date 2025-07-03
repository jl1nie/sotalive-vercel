import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material'
// Material-UI icons replaced with Font Awesome equivalents
import type { POTALog, POTALogStats } from '@/types/api'
import { useMapStore } from '@/stores/mapStore'
import { 
  usePOTALog, 
  usePOTALogStats, 
  useUploadPOTALog, 
  useDeletePOTALog,
  useSharePOTALog,
  useImportSharedPOTALog 
} from '@/hooks/useSOTAAPI'

interface POTALogManagerProps {
  onClose?: () => void
}

const POTALogManager: React.FC<POTALogManagerProps> = ({ onClose: _onClose }) => {
  const { preferences } = useMapStore()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [shareKey, setShareKey] = useState('')
  const [importKey, setImportKey] = useState('')

  // API hooks
  const activatorLogQuery = usePOTALog(
    preferences.pota_activator_uuid || '', 
    !!preferences.pota_activator_uuid
  )
  const hunterLogQuery = usePOTALog(
    preferences.pota_hunter_uuid || '', 
    !!preferences.pota_hunter_uuid
  )
  const statsQuery = usePOTALogStats()
  const uploadMutation = useUploadPOTALog()
  const deleteMutation = useDeletePOTALog()
  const shareMutation = useSharePOTALog()
  const importMutation = useImportSharedPOTALog()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      await uploadMutation.mutateAsync({
        activatorUuid: preferences.pota_activator_uuid,
        hunterUuid: preferences.pota_hunter_uuid,
        formData,
      })
      setUploadDialogOpen(false)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleDelete = async (logId: string) => {
    if (window.confirm('このログを削除しますか？この操作は取り消せません。')) {
      try {
        await deleteMutation.mutateAsync(logId)
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  const handleDownload = async (log: POTALog) => {
    try {
      // Simple download trigger - actual implementation would need API endpoint
      const element = document.createElement('a')
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent('POTA Log: ' + log.filename)}`)
      element.setAttribute('download', log.filename || `pota-log-${log.id}.adi`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleShare = async () => {
    try {
      const result = await shareMutation.mutateAsync({
        activatorUuid: preferences.pota_activator_uuid,
        hunterUuid: preferences.pota_hunter_uuid,
      }) as any
      setShareKey(result?.shareKey || '')
      setShareDialogOpen(true)
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const handleImport = async () => {
    if (!importKey.trim()) return

    try {
      await importMutation.mutateAsync(importKey.trim())
      setImportDialogOpen(false)
      setImportKey('')
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  // Removed unused formatFileSize function

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderLogList = (logs: POTALog[], title: string): React.ReactElement => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {logs.length === 0 ? (
          <Typography color="text.secondary">
            ログがありません
          </Typography>
        ) : (
          logs.map((log: POTALog, index: number) => (
            <Box
              key={log.id || index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="body2">
                  {log.filename || `Log ${index + 1}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.uploadDate && formatDate(log.uploadDate)} • {log.records || 0} records
                </Typography>
              </Box>
              <Box>
                <Tooltip title="ダウンロード">
                  <IconButton size="small" onClick={() => handleDownload(log)}>
                    <i className="fas fa-download" style={{ fontSize: '16px' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(log.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <i className="fas fa-trash" style={{ fontSize: '16px' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" gutterBottom>
          POTAログ管理
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<i className="fas fa-upload" style={{ fontSize: '16px' }} />}
            onClick={() => setUploadDialogOpen(true)}
          >
            アップロード
          </Button>
          <Button
            variant="outlined"
            startIcon={<i className="fas fa-share" style={{ fontSize: '16px' }} />}
            onClick={handleShare}
            disabled={shareMutation.isPending}
          >
            共有
          </Button>
          <Button
            variant="outlined"
            startIcon={<i className="fas fa-download" style={{ fontSize: '16px' }} />}
            onClick={() => setImportDialogOpen(true)}
          >
            インポート
          </Button>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Statistics */}
        {statsQuery.data ? (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                統計情報
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`総ログ数: ${(statsQuery.data as POTALogStats).totalLogs || 0}`} />
                <Chip label={`総レコード数: ${(statsQuery.data as POTALogStats).totalRecords || 0}`} />
                <Chip label={`ユニーク公園数: ${(statsQuery.data as POTALogStats).uniqueParks || 0}`} />
              </Box>
            </CardContent>
          </Card>
        ) : null}

        {/* Activator Logs */}
        {preferences.pota_activator_uuid && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Activatorログ
              </Typography>
              <IconButton
                size="small"
                onClick={() => activatorLogQuery.refetch()}
                disabled={activatorLogQuery.isFetching}
              >
                <i className="fas fa-sync" style={{ fontSize: '16px' }} />
              </IconButton>
            </Box>

            {activatorLogQuery.isLoading && <LinearProgress />}
            
            {activatorLogQuery.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                ログの読み込みに失敗しました
              </Alert>
            )}

            {activatorLogQuery.data && Array.isArray(activatorLogQuery.data) ? 
              renderLogList(activatorLogQuery.data as POTALog[], 'Activatorログ') : null
            }
          </Box>
        )}

        {/* Hunter Logs */}
        {preferences.pota_hunter_uuid && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Hunterログ
              </Typography>
              <IconButton
                size="small"
                onClick={() => hunterLogQuery.refetch()}
                disabled={hunterLogQuery.isFetching}
              >
                <i className="fas fa-sync" style={{ fontSize: '16px' }} />
              </IconButton>
            </Box>

            {hunterLogQuery.isLoading && <LinearProgress />}
            
            {hunterLogQuery.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                ログの読み込みに失敗しました
              </Alert>
            )}

            {hunterLogQuery.data && Array.isArray(hunterLogQuery.data) ? 
              renderLogList(hunterLogQuery.data as POTALog[], 'Hunterログ') : null
            }
          </Box>
        )}
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ログファイルアップロード</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              ADIF形式のログファイルをアップロードできます。
            </Alert>
            <Button
              variant="outlined"
              component="label"
              startIcon={<i className="fas fa-upload" style={{ fontSize: '16px' }} />}
              fullWidth
            >
              ファイルを選択
              <input
                type="file"
                hidden
                accept=".adi,.adif,.txt"
                onChange={handleFileSelect}
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                選択されたファイル: {selectedFile.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploadMutation.isPending}
          >
            アップロード
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ログ共有</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              ログの共有キーが生成されました。このキーを他のユーザーと共有してください。
            </Alert>
            <TextField
              label="共有キー"
              value={shareKey}
              fullWidth
              multiline
              rows={3}
              InputProps={{
                readOnly: true,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            閉じる
          </Button>
          <Button
            onClick={() => navigator.clipboard.writeText(shareKey)}
            variant="contained"
          >
            コピー
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ログインポート</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              他のユーザーから受け取った共有キーを入力してログをインポートできます。
            </Alert>
            <TextField
              label="共有キー"
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="共有キーを入力してください"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!importKey.trim() || importMutation.isPending}
          >
            インポート
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default POTALogManager