import { test, expect } from '@playwright/test'

test.describe('基本UI表示テスト', () => {
  test('基本要素の表示確認', async ({ page }) => {
    console.log('サイトアクセス開始...')
    
    try {
      await page.goto('http://localhost:5173/myact/', { timeout: 30000 })
      console.log('✓ ページ読み込み完了')
    } catch (error) {
      console.log(`❌ ページ読み込みエラー: ${error}`)
      throw error
    }
    
    console.log('地図コンテナ待機...')
    try {
      await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15000 })
      console.log('✓ 地図コンテナ表示確認')
    } catch (error) {
      console.log(`❌ 地図コンテナ表示エラー: ${error}`)
      
      // ページ内容をデバッグ
      const pageContent = await page.textContent('body')
      console.log('ページ内容（抜粋）:', pageContent?.substring(0, 200))
      
      throw error
    }
    
    console.log('基本要素チェック開始...')
    
    // Reactアプリの基本要素確認
    const reactRoot = await page.locator('#root').isVisible()
    console.log(`React Root: ${reactRoot}`)
    
    // ナビゲーションバー確認
    const navbar = await page.locator('nav').isVisible()
    console.log(`ナビゲーションバー: ${navbar}`)
    
    // サイドパネル確認
    const sidePanel = await page.locator('[data-testid="alert-spot-card-list"]').isVisible()
    console.log(`サイドパネル: ${sidePanel}`)
    
    // エラーメッセージ確認
    const errorMessages = await page.locator(':text("Error")').count()
    console.log(`エラーメッセージ数: ${errorMessages}`)
    
    // スクリプトエラー確認
    let scriptErrors: string[] = []
    page.on('pageerror', error => {
      scriptErrors.push(error.message)
      console.log(`❌ スクリプトエラー: ${error.message}`)
    })
    
    // 3秒待機してエラーチェック
    await page.waitForTimeout(3000)
    
    console.log('=== 最終結果 ===')
    console.log(`React Root表示: ${reactRoot}`)
    console.log(`ナビゲーションバー表示: ${navbar}`)
    console.log(`サイドパネル表示: ${sidePanel}`)
    console.log(`スクリプトエラー数: ${scriptErrors.length}`)
    
    if (scriptErrors.length > 0) {
      console.log('スクリプトエラー詳細:')
      scriptErrors.forEach((error, i) => console.log(`${i + 1}: ${error}`))
    }
    
    // 最低限の成功条件
    expect(reactRoot).toBe(true)
  })
})