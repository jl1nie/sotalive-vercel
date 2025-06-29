import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { DEMService } from '@/services/dem'
import { useReverseGeocoder } from '@/hooks/useReverseGeocoder'

interface ActivationZoneProps {
  /** 表示位置の緯度経度 */
  position: L.LatLng | null
  /** 上限高度差（メートル、デフォルト: -25） */
  upperLimit?: number
  /** 垂直距離（メートル、デフォルト: 25） */
  verticalDistance?: number
  /** 水平距離（タイル数、デフォルト: 8） */
  horizontalDistance?: number
  /** 表示可否 */
  visible?: boolean
}

/**
 * RegionFill2 クラス（簡易版）
 * アクティベーションゾーンの領域塗りつぶし処理
 */
class RegionFill2 {
  private tileX: number
  private tileY: number
  private _pixelX: number
  private _pixelY: number
  private _colorMap: ColorMapEntry[]
  private horizontalDistance: number

  constructor(
    tileX: number,
    tileY: number,
    pixelX: number,
    pixelY: number,
    colorMap: ColorMapEntry[],
    horizontalDistance: number
  ) {
    this.tileX = tileX
    this.tileY = tileY
    this._pixelX = pixelX
    this._pixelY = pixelY
    this._colorMap = colorMap
    this.horizontalDistance = horizontalDistance
  }

  fillTile(
    context: CanvasRenderingContext2D,
    imageData: ImageData,
    tileX: number,
    tileY: number
  ) {
    // 距離チェック
    if (Math.abs(tileX - this.tileX) > this.horizontalDistance ||
        Math.abs(tileY - this.tileY) > this.horizontalDistance) {
      return
    }

    // 画像データを Canvas に描画
    context.putImageData(imageData, 0, 0)
  }
}

interface ColorMapEntry {
  opaque: number
  color: [number, number, number, number]
}

/**
 * ContourLayer クラス
 * Leaflet 用のカスタム等高線レイヤー
 */
class ContourLayer extends L.GridLayer {
  private elevation: number
  private _pixelX: number
  private tileX: number
  private _pixelY: number
  private tileY: number
  private upperLimit: number
  private verticalDistance: number
  private horizontalDistance: number
  private regionFill: RegionFill2
  private colorMap: ColorMapEntry[]

  constructor(
    pixel: { px: number; tx: number; py: number; ty: number },
    zoom: number,
    elevation: number,
    colorMap: ColorMapEntry[],
    upperLimit: number,
    verticalDistance: number,
    horizontalDistance: number,
    options?: L.GridLayerOptions
  ) {
    super(options)
    
    this.elevation = elevation
    this._pixelX = pixel.px
    this.tileX = pixel.tx
    this._pixelY = pixel.py
    this.tileY = pixel.ty
    this.upperLimit = upperLimit
    this.verticalDistance = verticalDistance
    this.horizontalDistance = horizontalDistance
    this.colorMap = colorMap
    this.regionFill = new RegionFill2(
      this.tileX,
      this.tileY,
      this._pixelX,
      this._pixelY,
      colorMap,
      horizontalDistance
    )
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    // zoom パラメータを使用する
    const _zoom = (coords as any).z || 14
    const canvas = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement
    canvas.width = 256
    canvas.height = 256

    // 距離チェック
    if (Math.abs(coords.x - this.tileX) > this.horizontalDistance ||
        Math.abs(coords.y - this.tileY) > this.horizontalDistance) {
      if (done) done(undefined, canvas)
      return canvas
    }

    // DEM データ取得と処理
    DEMService.getDEM(coords)
      .then(demData => {
        const elevationDiff = demData.map(elevation => 
          (this.elevation - elevation) / this.verticalDistance
        )

        const context = canvas.getContext('2d')
        if (!context) {
          if (done) done(new Error('Cannot get canvas context'))
          return
        }

        const imageData = context.createImageData(256, 256)
        
        // ピクセル単位で色を設定
        for (let i = 0; i <= 0xffff; i++) {
          if (elevationDiff[i] < 1) {
            let opaque: number
            if (elevationDiff[i] < this.upperLimit) {
              opaque = this.colorMap[1].opaque
            } else {
              opaque = this.colorMap[0].opaque
            }
            
            imageData.data[i * 4 + 0] = 0x00  // R
            imageData.data[i * 4 + 1] = 0x00  // G  
            imageData.data[i * 4 + 2] = 0x00  // B
            imageData.data[i * 4 + 3] = opaque // A
          }
        }

        this.regionFill.fillTile(context, imageData, coords.x, coords.y)
        if (done) done(undefined, canvas)
      })
      .catch(error => {
        console.error('DEM tile creation error:', error)
        if (done) done(error, canvas)
      })

    return canvas
  }
}

/**
 * ActivationZone コンポーネント
 * SOTA アクティベーションゾーン（山頂から25m下まで）を地図上に表示
 */
export function ActivationZone({
  position,
  upperLimit = -25,
  verticalDistance = 25,
  horizontalDistance = 8,
  visible = true
}: ActivationZoneProps) {
  const map = useMap()
  const layerRef = useRef<ContourLayer | null>(null)
  const lastStateRef = useRef<{ position: L.LatLng; upperLimit: number } | null>(null)
  const { getElevation } = useReverseGeocoder()

  // アクティベーションゾーン表示
  const displayActivationZone = async (latlng: L.LatLng, uplmt: number) => {
    if (!map) return

    const _zoom = Math.min(map.getZoom(), 14) // 最大ズーム 14

    try {
      // 標高取得
      const elevationResult = await getElevation(latlng.lat, latlng.lng)
      
      if (elevationResult.errors !== 'OK') {
        console.warn('DEM error:', elevationResult.errors)
        return
      }

      const elevation = parseFloat(elevationResult.elevation)
      if (isNaN(elevation)) {
        console.warn('Invalid elevation data:', elevationResult.elevation)
        return
      }

      // ピクセル座標計算
      const pixel = DEMService.latLonToPixel(latlng.lat, latlng.lng, _zoom)

      // ピーク検索（7x7 グリッド）
      let peakElevation = 0
      let centerX = pixel.px % 256
      let centerY = pixel.py % 256
      let moved = false

      try {
        const demData = await DEMService.getDEM({ 
          x: pixel.tx, 
          y: pixel.ty, 
          z: _zoom 
        })

        for (let i = -3; i < 4; i++) {
          for (let j = -3; j < 4; j++) {
            const pos = (centerY + j) * 256 + centerX + i
            if (pos >= 0 && pos <= 65535) {
              if (demData[pos] > peakElevation) {
                centerX = (pixel.px % 256) + i
                centerY = (pixel.py % 256) + j
                peakElevation = demData[pos]
                moved = true
              }
            }
          }
        }

        // 新しいピクセル座標
        const newPixel = {
          px: pixel.tx * 256 + centerX,
          py: pixel.ty * 256 + centerY,
          tx: pixel.tx,
          ty: pixel.ty
        }

        // 新しい位置の座標（将来の機能拡張用）
        // const newLatLng = DEMService.pixelToLatLon(newPixel.px, newPixel.py, _zoom)

        // 既存レイヤーを削除
        if (layerRef.current) {
          map.removeLayer(layerRef.current)
        }

        // 新しいコンターレイヤーを作成
        const colorMap: ColorMapEntry[] = [
          { opaque: 0x01, color: [0xff, 0x00, 0x00, 0x60] }, // 赤（アクティベーション可能）
          { opaque: 0x02, color: [0x00, 0x00, 0xff, 0x60] }  // 青（アクティベーション不可）
        ]

        layerRef.current = new ContourLayer(
          newPixel,
          _zoom,
          peakElevation,
          colorMap,
          uplmt,
          verticalDistance,
          horizontalDistance,
          {
            attribution: '<a href="https://little-ctc.com/sota_hp/" target="_blank">JCC/JCGデータ</a>',
            minZoom: 14,
            maxZoom: 18,
            maxNativeZoom: 14
          }
        )

        layerRef.current.addTo(map)

        console.log(`Activation zone displayed: peak ${peakElevation}m, moved: ${moved}`)
      } catch (demError) {
        console.error('DEM data fetch error:', demError)
      }
    } catch (error) {
      console.error('Activation zone display error:', error)
    }
  }

  // 地図移動時の再描画
  const redoActivationZone = () => {
    if (!lastStateRef.current || !map) return

    const { position: lastPosition, upperLimit: lastUpperLimit } = lastStateRef.current
    const bounds = map.getBounds()

    // 表示範囲チェック
    if (!bounds.contains(lastPosition)) return

    displayActivationZone(lastPosition, lastUpperLimit)
  }

  // position 変更時の処理
  useEffect(() => {
    if (!position || !visible) {
      // レイヤーを削除
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
      lastStateRef.current = null
      return
    }

    lastStateRef.current = { position, upperLimit }
    displayActivationZone(position, upperLimit)
  }, [position, upperLimit, visible, map])

  // 地図イベントの監視
  useEffect(() => {
    if (!map) return

    map.on('moveend', redoActivationZone)
    map.on('zoomend', redoActivationZone)

    return () => {
      map.off('moveend', redoActivationZone)
      map.off('zoomend', redoActivationZone)
    }
  }, [map])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map])

  return null
}