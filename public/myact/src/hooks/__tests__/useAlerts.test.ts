import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAlerts } from '../useAlerts'
import type { OperationAlert } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should initialize with empty alerts', () => {
    const { result } = renderHook(() => useAlerts())
    
    expect(result.current.alerts).toEqual([])
  })

  it('should load alerts from localStorage on mount', () => {
    const storedAlerts: OperationAlert[] = [
      {
        id: 'test-1',
        title: 'Test Operation',
        reference: 'JA/ST-001',
        program: 'SOTA',
        operationDate: '2024-01-01T10:00:00.000Z',
        callsign: 'JA1TEST',
        createdAt: '2024-01-01T09:00:00.000Z',
      },
    ]
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedAlerts))
    
    const { result } = renderHook(() => useAlerts())
    
    expect(result.current.alerts).toEqual(storedAlerts)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('myact_operation_alerts')
  })

  it('should add new alert', () => {
    const { result } = renderHook(() => useAlerts())
    
    const newAlert = {
      title: 'Test Operation',
      reference: 'JA/ST-001',
      program: 'SOTA' as const,
      operationDate: '2024-01-01T10:00:00.000Z',
      callsign: 'JA1TEST',
    }
    
    act(() => {
      result.current.addAlert(newAlert)
    })
    
    expect(result.current.alerts).toHaveLength(1)
    expect(result.current.alerts[0]).toMatchObject(newAlert)
    expect(result.current.alerts[0].id).toBeDefined()
    expect(result.current.alerts[0].createdAt).toBeDefined()
  })

  it('should update existing alert', () => {
    const { result } = renderHook(() => useAlerts())
    
    // Add an alert first
    const newAlert = {
      title: 'Test Operation',
      reference: 'JA/ST-001',
      program: 'SOTA' as const,
      operationDate: '2024-01-01T10:00:00.000Z',
      callsign: 'JA1TEST',
    }
    
    act(() => {
      result.current.addAlert(newAlert)
    })
    
    const alertId = result.current.alerts[0].id
    
    // Update the alert
    act(() => {
      result.current.updateAlert(alertId, {
        title: 'Updated Operation',
        frequency: '14.230',
        mode: 'SSB',
      })
    })
    
    expect(result.current.alerts[0].title).toBe('Updated Operation')
    expect(result.current.alerts[0].frequency).toBe('14.230')
    expect(result.current.alerts[0].mode).toBe('SSB')
  })

  it('should delete alert', () => {
    const { result } = renderHook(() => useAlerts())
    
    // Add an alert first
    const newAlert = {
      title: 'Test Operation',
      reference: 'JA/ST-001',
      program: 'SOTA' as const,
      operationDate: '2024-01-01T10:00:00.000Z',
      callsign: 'JA1TEST',
    }
    
    act(() => {
      result.current.addAlert(newAlert)
    })
    
    const alertId = result.current.alerts[0].id
    
    // Delete the alert
    act(() => {
      result.current.deleteAlert(alertId)
    })
    
    expect(result.current.alerts).toHaveLength(0)
  })

  it('should get upcoming alerts', () => {
    const { result } = renderHook(() => useAlerts())
    
    const now = new Date()
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
    const farFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48 hours from now
    
    // Add alerts
    act(() => {
      result.current.addAlert({
        title: 'Soon Operation',
        reference: 'JA/ST-001',
        program: 'SOTA',
        operationDate: future.toISOString(),
        callsign: 'JA1TEST',
      })
      
      result.current.addAlert({
        title: 'Far Operation',
        reference: 'JA/ST-002',
        program: 'SOTA',
        operationDate: farFuture.toISOString(),
        callsign: 'JA1TEST',
      })
    })
    
    const upcomingAlerts = result.current.getUpcomingAlerts(24) // Next 24 hours
    
    expect(upcomingAlerts).toHaveLength(1)
    expect(upcomingAlerts[0].title).toBe('Soon Operation')
  })

  it('should get past alerts', () => {
    const { result } = renderHook(() => useAlerts())
    
    const now = new Date()
    const past = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    const farPast = new Date(now.getTime() - 48 * 60 * 60 * 1000) // 48 hours ago
    
    // Add alerts
    act(() => {
      result.current.addAlert({
        title: 'Recent Operation',
        reference: 'JA/ST-001',
        program: 'SOTA',
        operationDate: past.toISOString(),
        callsign: 'JA1TEST',
      })
      
      result.current.addAlert({
        title: 'Old Operation',
        reference: 'JA/ST-002',
        program: 'SOTA',
        operationDate: farPast.toISOString(),
        callsign: 'JA1TEST',
      })
    })
    
    const pastAlerts = result.current.getPastAlerts(24) // Last 24 hours
    
    expect(pastAlerts).toHaveLength(1)
    expect(pastAlerts[0].title).toBe('Recent Operation')
  })

  it('should save alerts to localStorage when alerts change', () => {
    const { result } = renderHook(() => useAlerts())
    
    const newAlert = {
      title: 'Test Operation',
      reference: 'JA/ST-001',
      program: 'SOTA' as const,
      operationDate: '2024-01-01T10:00:00.000Z',
      callsign: 'JA1TEST',
    }
    
    act(() => {
      result.current.addAlert(newAlert)
    })
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'myact_operation_alerts',
      expect.stringContaining('Test Operation')
    )
  })

  it('should sort alerts by operation date', () => {
    const { result } = renderHook(() => useAlerts())
    
    const now = new Date()
    const future1 = new Date(now.getTime() + 1 * 60 * 60 * 1000) // 1 hour from now
    const future2 = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours from now
    const future3 = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
    
    // Add alerts in random order
    act(() => {
      result.current.addAlert({
        title: 'Third Operation',
        reference: 'JA/ST-003',
        program: 'SOTA',
        operationDate: future2.toISOString(),
        callsign: 'JA1TEST',
      })
      
      result.current.addAlert({
        title: 'First Operation',
        reference: 'JA/ST-001',
        program: 'SOTA',
        operationDate: future1.toISOString(),
        callsign: 'JA1TEST',
      })
      
      result.current.addAlert({
        title: 'Second Operation',
        reference: 'JA/ST-002',
        program: 'SOTA',
        operationDate: future3.toISOString(),
        callsign: 'JA1TEST',
      })
    })
    
    // Should be sorted by operation date
    expect(result.current.alerts[0].title).toBe('First Operation')
    expect(result.current.alerts[1].title).toBe('Second Operation')
    expect(result.current.alerts[2].title).toBe('Third Operation')
  })
})