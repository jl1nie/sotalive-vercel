import React, { useState } from 'react'
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material'
// Using Open Iconic icons for consistency with original

interface CollapsibleSidePanelProps {
  children: React.ReactNode
  title?: string
  defaultExpanded?: boolean
  defaultVisible?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  position?: 'left' | 'right'
  onVisibilityChange?: (visible: boolean) => void
}

const CollapsibleSidePanel: React.FC<CollapsibleSidePanelProps> = ({
  children,
  title = 'パネル',
  defaultExpanded = true,
  defaultVisible = true,
  width = 400,
  minWidth = 300,
  maxWidth = 600,
  position = 'right',
  onVisibilityChange,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [visible, setVisible] = useState(defaultVisible)
  
  const handleToggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    // Call onVisibilityChange with the new visibility state
    if (onVisibilityChange) {
      onVisibilityChange(newExpanded)
    }
  }
  
  const handleToggleVisible = () => {
    const newVisible = !visible
    setVisible(newVisible)
    // Call onVisibilityChange with the new visibility state
    if (onVisibilityChange) {
      onVisibilityChange(newVisible && expanded)
    }
  }
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Mobile: overlay, Desktop: inline
  const containerSx = isMobile
    ? {
        position: 'fixed' as const,
        top: 0,
        bottom: 0,
        [position]: 0,
        width: expanded ? Math.min(width, window.innerWidth * 0.9) : 48,
        zIndex: 1300,
        transition: 'width 0.3s ease-in-out',
      }
    : {
        position: 'relative' as const,
        width: expanded ? width : 48,
        minWidth: expanded ? minWidth : 48,
        maxWidth: expanded ? maxWidth : 48,
        transition: 'all 0.3s ease-in-out',
        flexShrink: 0,
      }

  const togglePanel = handleToggleExpanded

  const closePanel = () => {
    setVisible(false)
    onVisibilityChange?.(false)
  }

  const showPanel = () => {
    setVisible(true)
    setExpanded(true)
    onVisibilityChange?.(true)
  }

  // パネルが非表示の場合、引き手を表示
  if (!visible) {
    return (
      <Box
        sx={{
          position: 'fixed',
          [position]: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1300,
          width: 24,
          height: 80,
          cursor: 'pointer',
        }}
        onClick={showPanel}
        data-testid="panel-show-handle"
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'primary.main',
            borderRadius: position === 'right' ? '8px 0 0 8px' : '0 8px 8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { bgcolor: 'primary.dark' },
            transition: 'background-color 0.2s',
          }}
        >
          <i 
            className={`fas fa-chevron-${position === 'right' ? 'left' : 'right'}`} 
            style={{ fontSize: '14px', color: 'white' }} 
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', display: 'flex' }} data-testid="collapsible-side-panel">
      {/* Left handle for toggling when visible */}
      {visible && (
        <Box
          sx={{
            position: 'absolute',
            left: position === 'right' ? -12 : 'auto',
            right: position === 'left' ? -12 : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 80,
            bgcolor: 'primary.main',
            borderRadius: position === 'right' ? '8px 0 0 8px' : '0 8px 8px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { bgcolor: 'primary.dark' },
            transition: 'background-color 0.2s',
            zIndex: 1301,
          }}
          onClick={closePanel}
          data-testid="panel-close-handle"
        >
          <i 
            className={`fas fa-chevron-${position === 'right' ? 'right' : 'left'}`} 
            style={{ fontSize: '14px', color: 'white' }} 
          />
        </Box>
      )}

      <Paper
        elevation={isMobile ? 8 : 1}
        data-testid="side-panel-content"
        sx={{
          ...containerSx,
          display: visible ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : 1,
          backgroundColor: 'background.paper',
        ...(position === 'left' && {
          borderTopRightRadius: isMobile ? 0 : theme.spacing(1),
          borderBottomRightRadius: isMobile ? 0 : theme.spacing(1),
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }),
        ...(position === 'right' && {
          borderTopLeftRadius: isMobile ? 0 : theme.spacing(1),
          borderBottomLeftRadius: isMobile ? 0 : theme.spacing(1),
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }),
      }}
    >
      {/* Header with toggle button */}
      {title && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            borderBottom: expanded ? 1 : 0,
            borderColor: 'divider',
            minHeight: 48,
            bgcolor: 'background.paper',
          }}
        >
        {/* Toggle button */}
        <IconButton
          onClick={togglePanel}
          size="small"
          sx={{
            order: position === 'left' ? 2 : 0,
            ml: position === 'left' ? 'auto' : 0,
            mr: position === 'right' ? 'auto' : 0,
          }}
        >
          {expanded ? (
            position === 'right' ? (
              <i className="oi oi-chevron-right" style={{ fontSize: '16px' }} />
            ) : (
              <i className="oi oi-chevron-left" style={{ fontSize: '16px' }} />
            )
          ) : position === 'right' ? (
            <i className="oi oi-chevron-left" style={{ fontSize: '16px' }} />
          ) : (
            <i className="oi oi-chevron-right" style={{ fontSize: '16px' }} />
          )}
        </IconButton>

        {/* Title */}
        <Collapse in={expanded} orientation="horizontal">
          <Typography
            variant="h6"
            sx={{
              ml: position === 'right' ? 1 : 0,
              mr: position === 'left' ? 1 : 0,
              order: position === 'left' ? 1 : 1,
              fontWeight: 600,
              fontSize: '1.25rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {title}
          </Typography>
        </Collapse>

      </Box>
      )}

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: expanded
            ? isMobile
              ? Math.min(width, window.innerWidth * 0.9)
              : width
            : 0,
          transition: 'width 0.3s ease-in-out',
          opacity: expanded ? 1 : 0,
          visibility: expanded ? 'visible' : 'hidden',
        }}
      >
        {expanded && children}
      </Box>

      {/* Mobile overlay backdrop */}
      {isMobile && expanded && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: -1,
          }}
          onClick={togglePanel}
        />
      )}
    </Paper>
    </Box>
  )
}

export default CollapsibleSidePanel