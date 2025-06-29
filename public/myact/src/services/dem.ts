// DEM (Digital Elevation Model) Service
// 国土地理院 DEM PNG データから標高情報を取得

interface TileCoords {
  x: number
  y: number
  z: number
}

// 将来の拡張用インターフェース
// interface DEMResult {
//   elevations: Float32Array
//   hasErrors: boolean
//   missingDataPercentage: number
// }

/**
 * DEM Service クラス
 * 国土地理院の DEM PNG タイルから標高データを取得・処理
 */
export class DEMService {
  private static readonly DEM_PNG_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
  private static readonly DEM5A_PNG_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'
  private static readonly MISSING_THRESHOLD = 1000
  private static readonly TILE_SIZE = 256

  /**
   * DEM データ取得
   * @param coords タイル座標
   * @returns 標高データの Promise
   */
  static async getDEM(coords: TileCoords): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const dem = new Float32Array(DEMService.TILE_SIZE * DEMService.TILE_SIZE)
      let dem5a: Float32Array | null = null
      let is5a = true
      let force10b = false
      let force5a = false
      const errorPixels: number[] = []
      let missingArea = 0

      const img = new Image()
      img.crossOrigin = 'anonymous'

      const url5a = DEMService.formatURL(DEMService.DEM5A_PNG_URL, coords)
      const url10 = DEMService.formatURL(DEMService.DEM_PNG_URL, coords)

      img.onload = function() {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Cannot get canvas context'))
          return
        }

        canvas.width = DEMService.TILE_SIZE
        canvas.height = DEMService.TILE_SIZE
        context.drawImage(img, 0, 0)
        
        const imageData = context.getImageData(0, 0, DEMService.TILE_SIZE, DEMService.TILE_SIZE)
        const data = imageData.data

        let missing = 0
        let prevHeight = 0

        for (let i = 0; i <= 0xffff; i++) {
          const r = data[i * 4 + 0]
          const g = data[i * 4 + 1]
          const b = data[i * 4 + 2]
          
          const x = r * Math.pow(2, 16) + g * Math.pow(2, 8) + b
          let height = x < Math.pow(2, 23) ? x : x - Math.pow(2, 24)
          
          if (height === -Math.pow(2, 23)) {
            height = 0
          }

          // 5m メッシュデータの欠損チェック
          if (is5a && height < 100) {
            missing++
            if ((i & 0xff) !== 0 && prevHeight >= 100) {
              errorPixels.push(i - 1)
            }
          } else if (is5a && prevHeight < 100) {
            missing++
            if ((i & 0xff) !== 0 && height >= 100) {
              errorPixels.push(i)
            }
          }

          prevHeight = height
          dem[i] = 0.01 * height
        }

        // 強制フラグが設定されている場合はそのまま返す
        if (force10b || force5a) {
          resolve(dem)
          return
        }

        if (is5a) {
          if (missing < DEMService.MISSING_THRESHOLD) {
            // 5m メッシュデータで十分
            resolve(dem)
            return
          }
          
          // 欠損が多いので 10m メッシュで補完
          is5a = false
          force10b = false
          missingArea = (100.0 * missing) / 65536
          dem5a = new Float32Array(dem)
          img.src = url10
        } else {
          // 10m メッシュとの補完処理
          if (!dem5a) {
            resolve(dem)
            return
          }

          const errorCount = errorPixels.length
          let sumDelta = 0

          while (errorPixels.length > 0) {
            const p = errorPixels.pop()!
            sumDelta += dem5a[p] - dem[p]
          }

          const delta = sumDelta / errorCount

          console.log(`DEM interpolation: ${missingArea.toFixed(1)}% missing, ${errorCount} points, delta: ${delta.toFixed(2)}m`)

          // 欠損部分を補間
          for (let i = 0; i <= 0xffff; i++) {
            if (dem5a[i] < 1.0) {
              dem5a[i] = dem[i] - delta
            }
          }

          resolve(dem5a)
        }
      }

      img.onerror = function() {
        if (force10b) {
          console.error('Fatal: No GSI DEM data available:', url10)
          reject(new Error(`DEM data not available: ${url10}`))
        } else {
          // 5m メッシュが見つからない場合は 10m メッシュを使用
          is5a = false
          force10b = true
          img.src = url10
        }
      }

      img.src = url5a
    })
  }

  /**
   * 座標からピクセル位置を計算
   * @param lat 緯度
   * @param lon 経度 
   * @param zoom ズームレベル
   * @returns ピクセル座標
   */
  static latLonToPixel(lat: number, lon: number, zoom: number) {
    const LMAX = 85.05112878
    const px = Math.floor(Math.pow(2, zoom + 7) * (lon / 180 + 1))
    const tx = Math.floor(px / 256)
    const py = Math.floor((Math.pow(2, zoom + 7) / Math.PI) * 
      ((-1 * Math.atanh(Math.sin((Math.PI / 180) * lat))) + 
       Math.atanh(Math.sin((Math.PI / 180) * LMAX))))
    const ty = Math.floor(py / 256)
    
    return { px, tx, py, ty }
  }

  /**
   * ピクセル位置から座標を計算
   * @param px ピクセル X
   * @param py ピクセル Y
   * @param zoom ズームレベル
   * @returns 緯度経度
   */
  static pixelToLatLon(px: number, py: number, zoom: number) {
    const LMAX = 85.05112878
    const lon = 180 * (px / Math.pow(2, zoom + 7) - 1)
    const lat = (180 / Math.PI) * 
      Math.asin(Math.tanh((-1 * Math.PI / Math.pow(2, zoom + 7) * py) + 
        Math.atanh(Math.sin(Math.PI / 180 * LMAX))))
    
    return { lat, lon }
  }

  /**
   * URL テンプレートをフォーマット
   * @param template URL テンプレート
   * @param coords タイル座標
   * @returns フォーマット済み URL
   */
  private static formatURL(template: string, coords: TileCoords): string {
    return template
      .replace('{z}', coords.z.toString())
      .replace('{x}', coords.x.toString())
      .replace('{y}', coords.y.toString())
  }

  /**
   * 指定座標の標高を取得（簡易版）
   * @param lat 緯度
   * @param lon 経度
   * @param zoom ズームレベル（デフォルト: 14）
   * @returns 標高値
   */
  static async getElevationAtPoint(
    lat: number, 
    lon: number, 
    zoom: number = 14
  ): Promise<number> {
    const pixel = DEMService.latLonToPixel(lat, lon, zoom)
    const coords = { x: pixel.tx, y: pixel.ty, z: zoom }
    
    try {
      const dem = await DEMService.getDEM(coords)
      const localX = pixel.px % 256
      const localY = pixel.py % 256
      const index = localY * 256 + localX
      
      return dem[index]
    } catch (error) {
      console.error('Failed to get elevation:', error)
      return 0
    }
  }
}