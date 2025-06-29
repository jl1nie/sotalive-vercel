import { useState, useCallback } from 'react'
import type { LatLng } from '@/types'
import { useMapStore } from '@/stores/mapStore'

interface GPSError {
  code: number
  message: string
}

interface UseGPSReturn {
  position: LatLng | null
  error: GPSError | null
  isLoading: boolean
  getCurrentPosition: () => Promise<void>
}

export const useGPS = (): UseGPSReturn => {
  const [position, setPosition] = useState<LatLng | null>(null)
  const [error, setError] = useState<GPSError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { setCurrentLocation, setMapCenter } = useMapStore()

  const getCurrentPosition = useCallback(async () => {
    if (typeof navigator.geolocation === 'undefined') {
      setError({
        code: -1,
        message: 'ブラウザが位置情報取得に対応していません'
      })
      return
    }

    setIsLoading(true)
    setError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options)
      })

      const coords = position.coords
      const newPosition: LatLng = {
        lat: coords.latitude,
        lng: coords.longitude,
        alt: coords.altitude !== null ? Math.round(coords.altitude * 100) / 100 : undefined
      }

      setPosition(newPosition)
      setCurrentLocation(newPosition)
      setMapCenter(newPosition)
      setIsLoading(false)
    } catch (err) {
      const geoError = err as GeolocationPositionError
      let errorMessage = "エラーが発生しました"

      switch (geoError.code) {
        case 1:
          errorMessage = "位置情報の利用が許可されていません"
          break
        case 2:
          errorMessage = "端末位置がわかりませんでした"
          break
        case 3:
          errorMessage = "タイムアウトしました"
          break
      }

      setError({
        code: geoError.code,
        message: errorMessage
      })
      setIsLoading(false)
    }
  }, [setCurrentLocation, setMapCenter])

  return {
    position,
    error,
    isLoading,
    getCurrentPosition
  }
}