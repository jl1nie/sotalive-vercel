import { useMapStore } from '@/stores/mapStore'
import type { OperationAlert } from '@/types'

interface UseAlertsReturn {
  alerts: OperationAlert[]
  addAlert: (alert: Omit<OperationAlert, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, alert: Partial<OperationAlert>) => void
  deleteAlert: (id: string) => void
  getUpcomingAlerts: (hours?: number) => OperationAlert[]
  getPastAlerts: (hours?: number) => OperationAlert[]
  refreshAlerts: () => void
}

/**
 * Simplified hook for alert management
 * Now delegates to centralized mapStore for state management
 * Focuses on UI behavior encapsulation only
 */
export const useAlerts = (): UseAlertsReturn => {
  // Access centralized alert state and actions from mapStore
  const alerts = useMapStore((state) => state.alerts)
  const addAlert = useMapStore((state) => state.addAlert)
  const updateAlert = useMapStore((state) => state.updateAlert)
  const deleteAlert = useMapStore((state) => state.deleteAlert)
  const getUpcomingAlerts = useMapStore((state) => state.getUpcomingAlerts)
  const getPastAlerts = useMapStore((state) => state.getPastAlerts)
  const refreshAlerts = useMapStore((state) => state.refreshAlerts)

  // Hook now only provides UI behavior - no complex state management
  return {
    alerts,
    addAlert,
    updateAlert,
    deleteAlert,
    getUpcomingAlerts,
    getPastAlerts,
    refreshAlerts
  }
}