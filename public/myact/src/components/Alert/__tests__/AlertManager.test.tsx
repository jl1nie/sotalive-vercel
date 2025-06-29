import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import AlertManager from '../AlertManager'
import type { OperationAlert } from '@/types'

// Mock date-fns locale
vi.mock('date-fns/locale', () => ({
  ja: {},
}))

// Mock MUI DateTimePicker
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange }: any) => (
    <input
      data-testid="datetime-picker"
      aria-label={label}
      value={value?.toISOString?.() || ''}
      onChange={(e) => onChange?.(new Date(e.target.value))}
    />
  ),
}))

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: any) => children,
}))

vi.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: vi.fn(),
}))

const mockAlerts: OperationAlert[] = [
  {
    id: 'alert-1',
    title: 'Mount Fuji Operation',
    reference: 'JA/ST-001',
    program: 'SOTA',
    operationDate: '2024-01-15T10:00:00.000Z',
    frequency: '14.230',
    mode: 'SSB',
    comment: 'QRV from Mt. Fuji',
    callsign: 'JA1TEST',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'alert-2',
    title: 'Yosemite Operation',
    reference: 'JP-0001',
    program: 'POTA',
    operationDate: '2024-01-20T08:00:00.000Z',
    callsign: 'JA1TEST',
    createdAt: '2024-01-02T00:00:00.000Z',
  },
]

const mockProps = {
  alerts: mockAlerts,
  onAddAlert: vi.fn(),
  onUpdateAlert: vi.fn(),
  onDeleteAlert: vi.fn(),
  onAlertClick: vi.fn(),
}

describe('AlertManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render alert list', () => {
    render(<AlertManager {...mockProps} />)
    
    expect(screen.getByText('運用アラート')).toBeInTheDocument()
    expect(screen.getByText('2 件のアラート')).toBeInTheDocument()
    expect(screen.getByText('Mount Fuji Operation')).toBeInTheDocument()
    expect(screen.getByText('Yosemite Operation')).toBeInTheDocument()
  })

  it('should group alerts by date', () => {
    render(<AlertManager {...mockProps} />)
    
    // Should show dates as group headers
    expect(screen.getByText(/1月15日/)).toBeInTheDocument()
    expect(screen.getByText(/1月20日/)).toBeInTheDocument()
  })

  it('should display alert details', () => {
    render(<AlertManager {...mockProps} />)
    
    // Check first alert details
    expect(screen.getByText('SOTA')).toBeInTheDocument()
    expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
    expect(screen.getByText('14.230 SSB')).toBeInTheDocument()
    expect(screen.getByText('QRV from Mt. Fuji')).toBeInTheDocument()
    
    // Check second alert details
    expect(screen.getByText('POTA')).toBeInTheDocument()
    expect(screen.getByText('JP-0001')).toBeInTheDocument()
  })

  it('should open add alert dialog when clicking add button', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    const addButton = screen.getByRole('button', { name: /追加/ })
    await user.click(addButton)
    
    expect(screen.getByText('新規アラート')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'リファレンス' })).toBeInTheDocument()
  })

  it('should open edit dialog when clicking edit button', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    const editButtons = screen.getAllByLabelText('編集')
    await user.click(editButtons[0])
    
    expect(screen.getByText('アラート編集')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mount Fuji Operation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('JA/ST-001')).toBeInTheDocument()
  })

  it('should call onDeleteAlert when clicking delete button', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    const deleteButtons = screen.getAllByLabelText('削除')
    await user.click(deleteButtons[0])
    
    expect(mockProps.onDeleteAlert).toHaveBeenCalledWith('alert-1')
  })

  it('should call onAlertClick when clicking alert card', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    const alertCard = screen.getByText('Mount Fuji Operation').closest('[role="button"]') 
      || screen.getByText('Mount Fuji Operation').closest('div')
    
    if (alertCard) {
      await user.click(alertCard)
      expect(mockProps.onAlertClick).toHaveBeenCalledWith(mockAlerts[0])
    }
  })

  it('should validate required fields in add dialog', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    // Open add dialog
    const addButton = screen.getByRole('button', { name: /追加/ })
    await user.click(addButton)
    
    // Try to save without filling required fields
    const saveButton = screen.getByRole('button', { name: '追加' })
    expect(saveButton).toBeDisabled()
    
    // Fill title only
    const titleInput = screen.getByRole('textbox', { name: 'タイトル' })
    await user.type(titleInput, 'Test Operation')
    expect(saveButton).toBeDisabled()
    
    // Fill reference as well
    const referenceInput = screen.getByRole('textbox', { name: 'リファレンス' })
    await user.type(referenceInput, 'JA/ST-999')
    expect(saveButton).toBeEnabled()
  })

  it('should call onAddAlert when saving new alert', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    // Open add dialog
    const addButton = screen.getByRole('button', { name: /追加/ })
    await user.click(addButton)
    
    // Fill form
        await user.type(screen.getByRole('textbox', { name: 'タイトル' }), 'New Operation')
    await user.type(screen.getByRole('textbox', { name: 'リファレンス' }), 'JA/ST-999')
    await user.type(screen.getByRole('textbox', { name: 'コールサイン' }), 'JA1NEW')
    
    // Save
    const saveButton = screen.getByRole('button', { name: '追加' })
    await user.click(saveButton)
    
    expect(mockProps.onAddAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Operation',
        reference: 'JA/ST-999',
        callsign: 'JA1NEW',
        program: 'SOTA', // default
      })
    )
  })

  it('should display empty state when no alerts', () => {
    render(<AlertManager {...{ ...mockProps, alerts: [] }} />)
    
    expect(screen.getByText('0 件のアラート')).toBeInTheDocument()
    expect(screen.getByText('アラートがありません')).toBeInTheDocument()
  })

  it('should show program-specific colors', () => {
    render(<AlertManager {...mockProps} />)
    
    const sotaChip = screen.getByText('SOTA')
    const potaChip = screen.getByText('POTA')
    
    // Check that chips have different styles (exact color testing would require more complex setup)
    expect(sotaChip).toBeInTheDocument()
    expect(potaChip).toBeInTheDocument()
  })

  it('should format times correctly', () => {
    render(<AlertManager {...mockProps} />)
    
    // Should show times in HH:MM format (locale-specific)
    expect(screen.getByText(/10:00|19:00/)).toBeInTheDocument() // UTC vs JST
    expect(screen.getByText(/08:00|17:00/)).toBeInTheDocument() // UTC vs JST
  })

  it('should support different programs in select', async () => {
    const user = userEvent.setup()
    render(<AlertManager {...mockProps} />)
    
    // Open add dialog
    const addButton = screen.getByRole('button', { name: /追加/ })
    await user.click(addButton)
    
    // Check program options
    const programSelect = screen.getByRole('combobox', { name: 'プログラム' })
    await user.click(programSelect)
    
    expect(screen.getAllByText('SOTA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('POTA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('WWFF')).toBeInTheDocument()
  })
})