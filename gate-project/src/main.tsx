import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Pre-load the comprehensive attack system to ensure window.launchComprehensiveAttack is available
// This bypasses dynamic import caching issues
(async () => {
  try {
    // @ts-ignore - JS file without type declarations
    await import('./attack-bots/comprehensiveAttack.js')
    console.log('✅ Attack system pre-loaded successfully')
  } catch (err) {
    console.error('❌ Failed to pre-load attack system:', err)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
