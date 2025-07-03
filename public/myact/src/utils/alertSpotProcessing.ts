import type { OperationAlert, Spot } from '@/types'

export interface AlertSpotCardData {
  id: string
  type: 'alert' | 'spot'
  timestamp: string
  alert?: OperationAlert
  spot?: Spot
  matchedSpots?: Spot[]
  isExpanded?: boolean
}

export type SortMode = 'time-desc' | 'time-asc' | 'type' | 'program'
export type TypeFilter = 'all' | 'alerts' | 'spots' | 'active'
export type ProgramFilter = 'all' | 'sota' | 'pota'
export type RegionFilter = 'worldwide' | 'japan'

/**
 * Pure function to check if a reference matches the region filter
 */
export const matchesRegionFilter = (reference: string, regionFilter: RegionFilter): boolean => {
  if (regionFilter === 'worldwide') return true
  if (regionFilter === 'japan') return reference.startsWith('JA') || reference.startsWith('JP-')
  return true
}

/**
 * Pure function to check if an alert and spot match
 */
export const isAlertSpotMatch = (alert: OperationAlert, spot: Spot): boolean => {
  // Match callsign
  if (alert.callsign.toLowerCase() !== spot.activator.toLowerCase()) {
    return false
  }

  // Match reference (SOTA/POTA ID)
  if (alert.reference !== spot.reference) {
    return false
  }

  // Match program
  if (alert.program !== spot.program) {
    return false
  }

  return true
}

/**
 * Pure function to process alerts into alert cards
 */
export const processAlerts = (
  alerts: OperationAlert[],
  spots: Spot[],
  options: {
    programFilter: ProgramFilter
    regionFilter: RegionFilter
    expandedCards: Set<string>
    debug?: boolean
  }
): AlertSpotCardData[] => {
  const { programFilter, regionFilter, expandedCards, debug = false } = options
  const cards: AlertSpotCardData[] = []
  const now = new Date()
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1日後（アラート用）

  alerts.forEach((alert, index) => {
    if (debug) console.log(`ALERT-SPOT - Processing alert ${index}:`, alert)
    
    // Filter by program filter
    const programMatch = 
      programFilter === 'all' ||
      (programFilter === 'sota' && alert.program === 'SOTA') ||
      (programFilter === 'pota' && alert.program === 'POTA')

    // Filter by region
    const regionMatch = matchesRegionFilter(alert.reference, regionFilter)

    // Filter by time (現在時刻〜1日後の範囲のみ表示)
    // アラートは未来の予定なので、現在時刻以降のみ表示
    const alertTime = new Date(alert.operationDate)
    const timeMatch = alertTime >= now && alertTime <= oneDayFromNow

    if (debug) console.log(`ALERT-SPOT - Alert filters:`, {
      program: programMatch,
      region: regionMatch,
      time: timeMatch,
      alertTime: alertTime.toISOString(),
      currentTime: now.toISOString(),
      oneDayFromNow: oneDayFromNow.toISOString(),
      withinTimeWindow: `${alertTime >= now} && ${alertTime <= oneDayFromNow}`
    })

    if (!programMatch || !regionMatch || !timeMatch) return

    const matchedSpots = spots.filter((spot: any) => isAlertSpotMatch(alert, spot))

    cards.push({
      id: `alert-${alert.id}`,
      type: 'alert',
      timestamp: alert.operationDate,
      alert,
      matchedSpots,
      isExpanded: expandedCards.has(`alert-${alert.id}`),
    })
  })

  return cards
}

/**
 * Pure function to process spots into spot cards with deduplication
 */
export const processSpots = (
  spots: Spot[],
  alerts: OperationAlert[],
  options: {
    programFilter: ProgramFilter
    regionFilter: RegionFilter
    debug?: boolean
  }
): AlertSpotCardData[] => {
  const { programFilter, regionFilter, debug = false } = options
  const spotCardMap = new Map<string, AlertSpotCardData>() // key: `${activator}-${reference}`
  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6時間前（スポット用）
  
  spots.forEach((spot: any, index: number) => {
    if (debug) console.log(`ALERT-SPOT - Processing spot ${index}:`, spot)
    
    // Filter by program filter
    const programMatch = 
      programFilter === 'all' ||
      (programFilter === 'sota' && spot.program === 'SOTA') ||
      (programFilter === 'pota' && spot.program === 'POTA')

    // Filter by region
    const regionMatch = matchesRegionFilter(spot.reference, regionFilter)

    // Filter by time (過去のスポットは6時間以内のみ)
    const spotTime = new Date(spot.spotTime)
    const timeMatch = spotTime >= sixHoursAgo

    if (debug) console.log(`ALERT-SPOT - Spot filters:`, {
      program: programMatch,
      region: regionMatch,
      time: timeMatch,
      spotTime: spotTime.toISOString()
    })

    if (!programMatch || !regionMatch || !timeMatch) return

    // Check if this spot is already matched with an alert
    const hasMatchingAlert = alerts.some(alert => isAlertSpotMatch(alert, spot))
    
    if (debug) console.log(`ALERT-SPOT - Spot has matching alert:`, hasMatchingAlert)
    
    if (!hasMatchingAlert) {
      // Create unique key for deduplication: activator + reference
      const dedupeKey = `${spot.activator}-${spot.reference}`
      const existingCard = spotCardMap.get(dedupeKey)
      
      if (existingCard && existingCard.spot) {
        // Update existing card with newer spot data (keep most recent)
        const existingSpotTime = new Date(existingCard.spot.spotTime)
        if (spotTime > existingSpotTime) {
          if (debug) console.log(`ALERT-SPOT - Updating existing card for ${dedupeKey}:`, {
            old: existingCard.spot.spotTime,
            new: spot.spotTime
          })
          
          // Update the existing card with newer spot data
          existingCard.timestamp = spot.spotTime
          existingCard.spot = {
            spotTime: spot.spotTime,
            activator: spot.activator,
            reference: spot.reference,
            frequency: spot.frequency,
            mode: spot.mode,
            comment: spot.comment,
            program: spot.program,
            referenceDetail: spot.referenceDetail || spot.reference,
            spotId: spot.spotId || 0,
            spotter: spot.spotter || '',
          }
        } else {
          if (debug) console.log(`ALERT-SPOT - Keeping existing card for ${dedupeKey} (newer):`, {
            existing: existingCard.spot.spotTime,
            current: spot.spotTime
          })
        }
      } else {
        // Create new card
        if (debug) console.log(`ALERT-SPOT - Creating new card for ${dedupeKey}`)
        
        const newCard: AlertSpotCardData = {
          id: `spot-${dedupeKey}-${spot.spotTime}`,
          type: 'spot',
          timestamp: spot.spotTime,
          spot: {
            spotTime: spot.spotTime,
            activator: spot.activator,
            reference: spot.reference,
            frequency: spot.frequency,
            mode: spot.mode,
            comment: spot.comment,
            program: spot.program,
            referenceDetail: spot.referenceDetail || spot.reference,
            spotId: spot.spotId || 0,
            spotter: spot.spotter || '',
          },
        }
        
        spotCardMap.set(dedupeKey, newCard)
      }
    }
  })
  
  return Array.from(spotCardMap.values())
}

/**
 * Pure function to apply type filter to cards
 */
export const applyTypeFilter = (cards: AlertSpotCardData[], typeFilter: TypeFilter): AlertSpotCardData[] => {
  switch (typeFilter) {
    case 'alerts':
      return cards.filter(card => card.type === 'alert')
    case 'spots':
      return cards.filter(card => card.type === 'spot')
    case 'active':
      // Active filter applies only to spots (not alerts)
      const now = new Date()
      return cards.filter(card => {
        if (card.type !== 'spot') return false // Only spots can be active
        const time = new Date(card.timestamp)
        const diffMinutes = Math.abs(time.getTime() - now.getTime()) / (1000 * 60)
        return diffMinutes <= 30 // Active within 30 minutes
      })
    default:
      // 'all' - no filtering
      return cards
  }
}

/**
 * Pure function to sort cards
 */
export const sortCards = (cards: AlertSpotCardData[], sortMode: SortMode): AlertSpotCardData[] => {
  return [...cards].sort((a, b) => {
    switch (sortMode) {
      case 'time-asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      case 'time-desc':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      case 'type':
        if (a.type !== b.type) {
          return a.type === 'alert' ? -1 : 1 // Alerts first
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      case 'program':
        const programA = a.alert?.program || a.spot?.program || ''
        const programB = b.alert?.program || b.spot?.program || ''
        if (programA !== programB) {
          return programA.localeCompare(programB)
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      default:
        return 0
    }
  })
}

/**
 * Main processing function that combines alerts and spots
 */
export const processAlertSpotCards = (
  alerts: OperationAlert[],
  spots: Spot[],
  options: {
    programFilter: ProgramFilter
    regionFilter: RegionFilter
    typeFilter: TypeFilter
    sortMode: SortMode
    expandedCards: Set<string>
    debug?: boolean
  }
): AlertSpotCardData[] => {
  const { typeFilter, sortMode, debug = false } = options

  if (debug) console.log('ALERT-SPOT - Processing cards with data:', {
    spotsCount: spots.length,
    alertsCount: alerts.length,
    regionFilter: options.regionFilter,
    programFilter: options.programFilter
  })

  // Process alerts
  const alertCards = processAlerts(alerts, spots, options)

  // Process spots (excluding those already matched with alerts)
  const spotCards = processSpots(spots, alerts, options)

  // Combine all cards
  const allCards = [...alertCards, ...spotCards]

  // Apply type filter
  const filteredCards = applyTypeFilter(allCards, typeFilter)

  // Apply sorting
  const sortedCards = sortCards(filteredCards, sortMode)

  if (debug) console.log('ALERT-SPOT - Final processed cards:', {
    totalCards: allCards.length,
    filteredCards: filteredCards.length,
    typeFilter,
    sortMode,
    cardTypes: sortedCards.map(c => c.type)
  })

  return sortedCards
}

/**
 * Pure function to get active count
 */
export const getActiveCount = (cards: AlertSpotCardData[]): number => {
  const now = new Date()
  return cards.filter(card => {
    if (card.type !== 'spot') return false // Only count active spots
    const time = new Date(card.timestamp)
    const diffMinutes = Math.abs(time.getTime() - now.getTime()) / (1000 * 60)
    return diffMinutes <= 30
  }).length
}