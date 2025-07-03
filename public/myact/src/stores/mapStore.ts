import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LatLng, Summit, Park, Preferences, OperationAlert } from '@/types'
import { debugLog } from '@/config/debugConfig'
import { APIService } from '@/services/api'

// Popup state interface (moved from usePopupManager)
export interface PopupInfo {
  position: LatLng
  summit?: Summit
  park?: Park
  isGPS?: boolean
}

// Map event loop state interface (moved from useMapEventLoop)
interface MapEventState {
  isProgrammaticMove: boolean
  lastExternalUpdate: { center: LatLng, zoom: number, timestamp: number } | null
}

interface MapState {
  // Map position and zoom
  mapCenter: LatLng
  zoom: number
  
  // Current GPS location
  currentLocation: LatLng | null
  
  // Markers and data
  summits: Summit[]
  parks: Park[]
  
  // Preferences (from original cookie-based system)
  preferences: Preferences
  
  // UI state
  isLoading: boolean
  selectedReference: Summit | Park | null
  
  // Popup state (centralized from usePopupManager)
  popupInfo: PopupInfo | null
  
  // Map event loop state (centralized from useMapEventLoop)
  eventState: MapEventState
  
  // Map initialization state
  mapFullyInitialized: boolean
  
  // Alert state (centralized from useAlerts)
  alerts: OperationAlert[]
}

interface MapActions {
  // Map control
  setMapCenter: (center: LatLng, zoom?: number) => void
  setZoom: (zoom: number) => void
  
  // Location
  setCurrentLocation: (location: LatLng | null) => void
  
  // Data
  setSummits: (summits: Summit[]) => void
  setParks: (parks: Park[]) => void
  addSummits: (summits: Summit[]) => void
  addParks: (parks: Park[]) => void
  clearMarkers: () => void
  
  // Preferences
  updatePreferences: (updates: Partial<Preferences>) => void
  
  // UI
  setLoading: (loading: boolean) => void
  setSelectedReference: (ref: Summit | Park | null) => void
  
  // Popup management (centralized from usePopupManager)
  setUniquePopup: (popupInfo: PopupInfo) => void
  clearPopup: () => void
  
  // Map event loop management (centralized from useMapEventLoop)
  startProgrammaticMove: (center: LatLng, zoom: number) => void
  isUserInteraction: () => boolean
  debounceStateUpdate: (updateFn: () => void, customDelay?: number) => void
  
  // Map initialization
  setMapFullyInitialized: (initialized: boolean) => void
  
  // Alert management (centralized from useAlerts)
  addAlert: (alert: Omit<OperationAlert, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, alert: Partial<OperationAlert>) => void
  deleteAlert: (id: string) => void
  getUpcomingAlerts: (hours?: number) => OperationAlert[]
  getPastAlerts: (hours?: number) => OperationAlert[]
  refreshAlerts: () => void
  setAlerts: (alerts: OperationAlert[]) => void

  // Marker click handling (centralized from useMarkerClickHandlers)
  handleSummitClick: (summit: Summit, latlng: any, mapInstance: L.Map | null) => Promise<void>
  handleParkClick: (park: Park, latlng: [number, number], mapInstance: L.Map | null) => Promise<void>
  handleQTHClick: (position: LatLng, mapInstance: L.Map | null) => void
}

type MapStore = MapState & MapActions

// Default preferences matching original implementation
const defaultPreferences: Preferences = {
  popup_permanent: true,
  display_mapcode: false,
  link_googlemap: false,
  by_call: false,
  sota_ref: true,
  pota_ref: true,
  jaff_ref: true,
  display_area: true, // Enable TopoJSON layer by default for debugging
  aprs_track: true,
  pilgrim: false,
  show_potalog: false,
  show_potaactlog: true,
  zoom_threshold: 12,
  spot_period: 6,
  pota_hunter_uuid: null,
  pota_activator_uuid: null,
  enable_emulation: false,
  pemu_call: '',
  pemu_areacode: '',
  pemu_century: '',
  pemu_sota: '',
  pemu_pota: '',
  pemu_jaff: '',
  pemu_mesg1: 'CQ CQ CQ DE $CALL SOTA $SOTA +',
  pemu_mesg2: 'CQ CQ CQ DE $CALL POTA $POTA +',
  pemu_mesg3: 'CQ CQ CQ DE $CALL JAFF $JAFF +',
  pemu_mesg4: 'p 1#CQ CQ CQ DE $CALL SOTA $SOTA+',
  pemu_wpm: '40',
  pemu_host: 'actpaddle.local',
  include_areacode: true,
  paddle_reverse: false,
  to_paddle: true,
  to_key: false,
  enable_wifi: false,
  enable_serial: true,
  my_callsign: '',
  // Alert/Spot display filter settings
  alert_spot_type_filter: 'all',
  alert_spot_program_filter: 'all',
  alert_spot_sort_mode: 'time-desc',
  alert_spot_region_filter: 'worldwide',
  alert_spot_show_by_call: false,
}

// Global references for debouncing (moved from useMapEventLoop)
let moveendDebounceRef: NodeJS.Timeout | null = null

export const useMapStore = create<MapStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mapCenter: { lat: 37.514444, lng: 137.712222 }, // Japan center
      zoom: 6,
      currentLocation: null,
      summits: [],
      parks: [],
      preferences: defaultPreferences,
      isLoading: false,
      selectedReference: null,
      
      // Centralized popup state
      popupInfo: null,
      
      // Centralized event loop state
      eventState: {
        isProgrammaticMove: false,
        lastExternalUpdate: null
      },
      
      // Map initialization state
      mapFullyInitialized: false,
      
      // Alert state
      alerts: [],

      // Actions
      setZoom: (zoom) => set({ zoom }),
      
      setCurrentLocation: (location) => set({ currentLocation: location }),
      
      setSummits: (summits) => set({ summits }),
      setParks: (parks) => set({ parks }),
      addSummits: (summits) => set((state) => ({ 
        summits: [...state.summits, ...summits] 
      })),
      addParks: (parks) => set((state) => ({ 
        parks: [...state.parks, ...parks] 
      })),
      clearMarkers: () => set({ summits: [], parks: [] }),
      
      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setSelectedReference: (ref) => set({ selectedReference: ref }),
      setMapCenter: (center: LatLng, zoom?: number) => set((state) => ({
        mapCenter: center,
        zoom: zoom !== undefined ? zoom : state.zoom
      })),
      
      // Centralized popup management (from usePopupManager)
      setUniquePopup: (newPopupInfo: PopupInfo) => {
        debugLog.event('setUniquePopup called:', newPopupInfo)
        
        // 一度の状態変更で重複表示を防止
        set({
          popupInfo: {
            ...newPopupInfo,
            summit: newPopupInfo.summit || undefined,
            park: newPopupInfo.park || undefined,
            isGPS: newPopupInfo.isGPS || false
          }
        })
        debugLog.event('Unique popup set (single update):', newPopupInfo)
      },
      
      clearPopup: () => {
        debugLog.event('Popup cleared')
        set({ popupInfo: null })
      },
      
      // Centralized map event loop management (from useMapEventLoop)
      startProgrammaticMove: (center: LatLng, zoom: number) => {
        // 外部変更の記録（タイムスタンプ付き）
        const externalUpdate = {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          timestamp: Date.now()
        }
        
        debugLog.leafletMap('Starting programmatic move (external change):', {
          center,
          zoom,
          externalUpdate: true
        })
        
        set((state) => ({
          eventState: {
            ...state.eventState,
            isProgrammaticMove: true,
            lastExternalUpdate: externalUpdate
          }
        }))
        
        // アニメーション完了後にフラグをクリア (1.1秒後)
        setTimeout(() => {
          set((state) => ({
            eventState: {
              ...state.eventState,
              isProgrammaticMove: false
            }
          }))
          debugLog.leafletMap('Programmatic move flag cleared')
        }, 1100) // animation duration + buffer
      },
      
      // ユーザー操作かどうかの判定 (from useMapEventLoop)
      isUserInteraction: () => {
        const { eventState } = get()
        
        // プログラム的移動中は状態更新をスキップ
        if (eventState.isProgrammaticMove) {
          debugLog.event('Skipping state update during programmatic move')
          return false
        }
        
        // 最近の外部変更の場合はユーザー操作を無視（1.5秒間）
        if (eventState.lastExternalUpdate) {
          const timeSinceExternal = Date.now() - eventState.lastExternalUpdate.timestamp
          if (timeSinceExternal < 1500) {
            debugLog.event('Skipping state update (recent external change)', timeSinceExternal, 'ms ago')
            return false
          }
        }
        
        return true
      },
      
      // デバウンス付きの状態更新 (from useMapEventLoop)
      debounceStateUpdate: (updateFn: () => void, customDelay?: number) => {
        // 既存のデバウンスタイマーをクリア
        if (moveendDebounceRef) {
          clearTimeout(moveendDebounceRef)
        }
        
        // カスタム遅延またはデフォルト200ms（ポップアップ表示中などで調整可能）
        const delay = customDelay ?? 200
        
        // 指定された遅延後に状態更新（外部変更との競合を避けるため）
        moveendDebounceRef = setTimeout(() => {
          const { eventState } = get()
          
          // 再度外部変更チェック（デバウンス期間中の変更確認）
          if (eventState.lastExternalUpdate && 
              Date.now() - eventState.lastExternalUpdate.timestamp < 1500) {
            debugLog.event('Cancelled user update (external change during debounce)', `delay: ${delay}ms`)
            moveendDebounceRef = null
            return
          }
          
          updateFn()
          moveendDebounceRef = null
        }, delay)
      },
      
      // Map initialization state
      setMapFullyInitialized: (initialized: boolean) => {
        set({ mapFullyInitialized: initialized })
      },
      
      // Alert management (centralized from useAlerts)
      setAlerts: (alerts: OperationAlert[]) => {
        set({ alerts })
      },
      
      addAlert: (alertData: Omit<OperationAlert, 'id' | 'createdAt'>) => {
        const newAlert: OperationAlert = {
          ...alertData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        
        set((state) => ({
          alerts: [...state.alerts, newAlert].sort((a, b) => 
            new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
          )
        }))
      },
      
      updateAlert: (id: string, alertData: Partial<OperationAlert>) => {
        set((state) => ({
          alerts: state.alerts.map(alert => 
            alert.id === id ? { ...alert, ...alertData } : alert
          )
        }))
      },
      
      deleteAlert: (id: string) => {
        set((state) => ({
          alerts: state.alerts.filter(alert => alert.id !== id)
        }))
      },
      
      getUpcomingAlerts: (hours = 72) => {
        const { alerts } = get()
        const now = new Date()
        const cutoff = new Date(now.getTime() + (hours * 60 * 60 * 1000))
        
        return alerts.filter(alert => {
          const alertDate = new Date(alert.operationDate)
          return alertDate >= now && alertDate <= cutoff
        }).sort((a, b) => 
          new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
        )
      },
      
      getPastAlerts: (hours = 24) => {
        const { alerts } = get()
        const now = new Date()
        const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000))
        
        return alerts.filter(alert => {
          const alertDate = new Date(alert.operationDate)
          return alertDate < now && alertDate >= cutoff
        }).sort((a, b) => 
          new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
        )
      },
      
      refreshAlerts: () => {
        // This is a no-op since alerts are stored locally
        // In the future, this could fetch from an external API
        const { alerts } = get()
        set({ alerts: [...alerts] }) // Force re-render
      },

      // Centralized marker click handling (moved from useMarkerClickHandlers)
      handleSummitClick: async (summit: Summit, latlng: any, mapInstance: L.Map | null) => {
        const { mapFullyInitialized, setUniquePopup } = get()
        
        debugLog.event('handleSummitClick called for summit:', summit.summitCode, 'at', summit.latitude, summit.longitude)
        debugLog.event('handleSummitClick: map initialization status:', mapFullyInitialized)
        
        // 地図初期化未完了時の安全対策
        if (!mapFullyInitialized && mapInstance) {
          debugLog.event('Summit click during map initialization, applying safety measures')
          try {
            mapInstance.invalidateSize({ pan: false, debounceMoveend: true })
            
            // 座標変換テスト
            const testPoint = mapInstance.latLngToContainerPoint([summit.latitude, summit.longitude])
            debugLog.event('Summit coordinate conversion test:', testPoint)
            
            // 異常な座標変換結果の場合は処理を遅延
            if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
                testPoint.x > 10000 || testPoint.y > 10000) {
              debugLog.event('Abnormal summit coordinate conversion, delaying popup')
              
              // 300ms後に再試行
              setTimeout(() => {
                debugLog.event('Retrying summit click after coordinate stabilization')
                get().handleSummitClick(summit, latlng, mapInstance)
              }, 300)
              return
            }
          } catch (error) {
            debugLog.event('Error in summit click safety measures:', error)
          }
        }
        
        try {
          // レガシー実装と同じ検索API使用: APIService経由でサミット詳細検索
          // legacy/index.html:1847行 searchNearestSummit() 関数の移植版
          // - 半径200m以内の最も近いサミットを検索（精度向上のため）
          // - 基本データ（summitCode, name, lat, lng）に詳細データを追加
          // - activationCount, points, bonusPoints 等の詳細情報を取得
          debugLog.api('Fetching summit details via APIService for:', summit.summitCode, 'at', summit.latitude, summit.longitude)
          
          const searchResults = await APIService.searchNearestSummits(summit.latitude, summit.longitude, 200)
          
          if (searchResults && searchResults.length > 0) {
            // 最も近いサミット（通常は最初の結果）を使用
            const detailedSummit = searchResults[0]
            debugLog.api('Found detailed summit data:', detailedSummit)
            
            // レガシー形式のサミットデータにマップ
            // legacy/index.html:1870-1890行のデータ統合ロジック移植
            // - API検索結果と元のSummitオブジェクトをマージ
            // - フィールド名の正規化（activationCount vs count 等）
            // - 型安全性確保のためTypeScript型定義に準拠
            const enrichedSummit = {
              ...summit,
              summitCode: detailedSummit.summitCode,
              summitName: detailedSummit.summitName,
              summitNameJ: detailedSummit.summitNameJ,
              latitude: detailedSummit.latitude,
              longitude: detailedSummit.longitude,
              altM: detailedSummit.altM,
              points: detailedSummit.points,
              bonusPoints: detailedSummit.bonusPoints,
              maidenhead: detailedSummit.maidenhead,
              cityJ: detailedSummit.cityJ,
              activationCount: detailedSummit.activationCount,
              activationDate: detailedSummit.activationDate,
              activationCall: detailedSummit.activationCall
            }
            
            // レガシー実装と同じ：サミット詳細 + リバースジオコーディング
            // legacy/index.html:1900-1920行の統合表示ロジック移植
            // Note: Geocoding is handled by the calling component (LeafletMap)
            // Store only manages the popup data, not external service calls
            // レガシーではdisplayPopup()関数内で全処理を実行していたが、
            // React実装では責務分離：Store(データ管理) + Component(UI処理)
            debugLog.event('handleSummitClick: Geocoding will be handled by calling component')
            
            // 統一的なポップアップ設定を使用（重複防止）
            setUniquePopup({
              position: { lat: summit.latitude, lng: summit.longitude },
              summit: enrichedSummit,
              park: undefined, // 明示的にpark情報を除外
              isGPS: false
            })
            debugLog.event('handleSummitClick: Detailed summit popup set')
          } else {
            // API結果が無い場合は基本データを使用
            setUniquePopup({
              position: { lat: summit.latitude, lng: summit.longitude },
              summit,
              park: undefined,
              isGPS: false
            })
            debugLog.event('handleSummitClick: Fallback to basic summit data')
          }
        } catch (error) {
          console.error('handleSummitClick: Error fetching detailed summit info:', error)
          // エラー時は基本データを使用
          setUniquePopup({
            position: { lat: summit.latitude, lng: summit.longitude },
            summit,
            park: undefined,
            isGPS: false
          })
          debugLog.event('handleSummitClick: Error fallback to basic summit data')
        }
      },

      handleParkClick: async (park: Park, latlng: [number, number], mapInstance: L.Map | null) => {
        const { mapFullyInitialized, setUniquePopup } = get()
        
        debugLog.event('handleParkClick called for park:', park.potaCode || park.wwffCode, 'at', park.latitude, park.longitude)
        debugLog.event('handleParkClick: map initialization status:', mapFullyInitialized)
        
        // 地図初期化未完了時の安全対策
        if (!mapFullyInitialized && mapInstance) {
          debugLog.event('Park click during map initialization, applying safety measures')
          try {
            mapInstance.invalidateSize({ pan: false, debounceMoveend: true })
            
            // 座標変換テスト
            const testPoint = mapInstance.latLngToContainerPoint([latlng[0], latlng[1]])
            debugLog.event('Park coordinate conversion test:', testPoint)
            
            // 異常な座標変換結果の場合は処理を遅延
            if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
                testPoint.x > 10000 || testPoint.y > 10000) {
              debugLog.event('Abnormal park coordinate conversion, delaying popup')
              
              // 300ms後に再試行
              setTimeout(() => {
                debugLog.event('Retrying park click after coordinate stabilization')
                get().handleParkClick(park, latlng, mapInstance)
              }, 300)
              return
            }
          } catch (error) {
            debugLog.event('Error in park click safety measures:', error)
          }
        }
        
        try {
          const referenceCode = park.potaCode || park.wwffCode
          if (referenceCode) {
            debugLog.api('Fetching park details for:', referenceCode)
            const detailsResponse = await APIService.searchReferenceDetails(referenceCode)
            
            if (detailsResponse && detailsResponse.parks.length > 0) {
              const detailedPark = detailsResponse.parks[0]
              // Merge the basic park data with detailed API response
              const enrichedPark = {
                ...park,
                ...detailedPark
              }
              debugLog.api('Enriched park details:', enrichedPark)
              
              // 統一的なポップアップ設定を使用（重複防止）
              setUniquePopup({
                position: { lat: latlng[0], lng: latlng[1] },
                park: enrichedPark,
                summit: undefined, // 明示的にsummit情報を除外
                isGPS: false
              })
            } else {
              // Fallback to basic park data if API fails
              debugLog.api('No detailed data found, using basic park info')
              setUniquePopup({
                position: { lat: latlng[0], lng: latlng[1] },
                park,
                summit: undefined, // 明示的にsummit情報を除外
                isGPS: false
              })
            }
          } else {
            // No reference code available, use basic data
            setUniquePopup({
              position: { lat: latlng[0], lng: latlng[1] },
              park
            })
          }
        } catch (error) {
          debugLog.api('Failed to fetch park details:', error)
          // Fallback to basic park data if API fails
          setUniquePopup({
            position: { lat: latlng[0], lng: latlng[1] },
            park
          })
        }
      },

      handleQTHClick: (position: LatLng, mapInstance: L.Map | null) => {
        const { mapFullyInitialized, setUniquePopup } = get()
        
        debugLog.event('handleQTHClick called at:', position.lat, position.lng)
        debugLog.event('handleQTHClick: map initialization status:', mapFullyInitialized)
        
        // 地図初期化未完了時の安全対策
        if (!mapFullyInitialized && mapInstance) {
          debugLog.event('QTH click during map initialization, applying safety measures')
          try {
            mapInstance.invalidateSize({ pan: false, debounceMoveend: true })
            
            // 座標変換テスト
            const testPoint = mapInstance.latLngToContainerPoint([position.lat, position.lng])
            debugLog.event('QTH coordinate conversion test:', testPoint)
            
            // 異常な座標変換結果の場合は処理を遅延
            if (!testPoint || testPoint.x <= 0 || testPoint.y <= 0 || 
                testPoint.x > 10000 || testPoint.y > 10000) {
              debugLog.event('Abnormal QTH coordinate conversion, delaying popup')
              
              // 200ms後に再試行
              setTimeout(() => {
                debugLog.event('Retrying QTH click after coordinate stabilization')
                get().handleQTHClick(position, mapInstance)
              }, 200)
              return
            }
          } catch (error) {
            debugLog.event('Error in QTH click safety measures:', error)
          }
        }
        
        // 統一的なポップアップ設定を使用（重複防止）
        setUniquePopup({
          position,
          summit: undefined, // 明示的にsummit情報を除外
          park: undefined, // 明示的にpark情報を除外
          isGPS: true
        })
        debugLog.event('QTH popup set (initialized:', mapFullyInitialized, ')')
      },
    }),
    {
      name: 'myact-map-store', // localStorage key
      partialize: (state) => ({
        preferences: state.preferences,
        mapCenter: state.mapCenter,
        zoom: state.zoom,
        alerts: state.alerts, // Persist alerts
      }), // Only persist these fields
    }
  )
)

// Expose store to global window for testing/debugging
if (typeof window !== 'undefined') {
  (window as any).useMapStore = useMapStore
}