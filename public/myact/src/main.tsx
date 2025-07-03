import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useMapStore } from './stores/mapStore'
// Font Awesome icons are loaded via CDN in index.html for consistency with original app

// Zustand storeをグローバルに公開（テスト用）
if (typeof window !== 'undefined') {
  (window as any).zustandMapStore = useMapStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)