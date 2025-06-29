import { useState, useCallback, useEffect } from 'react'
import type { OperationAlert } from '@/types'

const ALERTS_STORAGE_KEY = 'myact_operation_alerts'

interface UseAlertsReturn {
  alerts: OperationAlert[]
  addAlert: (alert: Omit<OperationAlert, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, alert: Partial<OperationAlert>) => void
  deleteAlert: (id: string) => void
  getUpcomingAlerts: (hours?: number) => OperationAlert[]
  getPastAlerts: (hours?: number) => OperationAlert[]
}

export const useAlerts = (): UseAlertsReturn => {
  const [alerts, setAlerts] = useState<OperationAlert[]>([])

  // Load alerts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as OperationAlert[]
        setAlerts(parsed)
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error)
    }
  }, [])

  // Save alerts to localStorage whenever alerts change
  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
    } catch (error) {
      console.error('Failed to save alerts to storage:', error)
    }
  }, [alerts])

  const addAlert = useCallback((alertData: Omit<OperationAlert, 'id' | 'createdAt'>) => {
    const newAlert: OperationAlert = {
      ...alertData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    
    setAlerts(prev => [...prev, newAlert].sort((a, b) => 
      new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
    ))
  }, [])

  const updateAlert = useCallback((id: string, alertData: Partial<OperationAlert>) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id 
        ? { ...alert, ...alertData }
        : alert
    ).sort((a, b) => 
      new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
    ))
  }, [])

  const deleteAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  const getUpcomingAlerts = useCallback((hours = 24) => {
    const now = new Date()
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
    
    return alerts.filter(alert => {
      const alertDate = new Date(alert.operationDate)
      return alertDate >= now && alertDate <= futureTime
    })
  }, [alerts])

  const getPastAlerts = useCallback((hours = 24) => {
    const now = new Date()
    const pastTime = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    return alerts.filter(alert => {
      const alertDate = new Date(alert.operationDate)
      return alertDate < now && alertDate >= pastTime
    })
  }, [alerts])

  return {
    alerts,
    addAlert,
    updateAlert,
    deleteAlert,
    getUpcomingAlerts,
    getPastAlerts,
  }
}