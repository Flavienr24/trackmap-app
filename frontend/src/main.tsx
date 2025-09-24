import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import and initialize vConsole for mobile debugging
import VConsole from 'vconsole'
import { logCollector } from './utils/vConsoleLogCollector'
import './utils/testingHelpers' // Load testing helpers globally

// Only initialize vConsole in development mode
if (import.meta.env.MODE === 'development') {
  // Initialize log collector first
  logCollector.init()
  
  // Then initialize vConsole
  const vConsole = new VConsole()
  
  // Make log collector accessible globally for testing
  ;(window as any).getVConsoleLogs = () => logCollector.getLogs()
  ;(window as any).exportVConsoleLogs = () => logCollector.exportLogsAsJson()
  ;(window as any).clearVConsoleLogs = () => logCollector.clearLogs()
  ;(window as any).getVConsoleStats = () => logCollector.getLogStats()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)