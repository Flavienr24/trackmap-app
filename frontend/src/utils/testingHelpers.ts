/**
 * Testing Helpers
 * Utilities to access and export logs during testing phases
 */

import { logCollector, VConsoleLogEntry } from './vConsoleLogCollector'

export class TestingLogManager {
  /**
   * Get all logs from the current session
   */
  static getAllLogs(): VConsoleLogEntry[] {
    return logCollector.getLogs()
  }

  /**
   * Get only error logs for debugging
   */
  static getErrorLogs(): VConsoleLogEntry[] {
    return logCollector.getLogsByLevel('error')
  }

  /**
   * Get network logs for API debugging
   */
  static getNetworkLogs(): VConsoleLogEntry[] {
    return logCollector.getLogsBySource('network')
  }

  /**
   * Export complete log session to file
   */
  static exportLogSession(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `vconsole-logs-${timestamp}.json`
    
    const logData = logCollector.exportLogsAsJson()
    const blob = new Blob([logData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    
    URL.revokeObjectURL(url)
    console.info(`[Testing] Logs exported to ${filename}`)
  }

  /**
   * Export logs as readable text file
   */
  static exportLogSessionAsText(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `vconsole-logs-${timestamp}.txt`
    
    const logData = logCollector.exportLogsAsText()
    const blob = new Blob([logData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    
    URL.revokeObjectURL(url)
    console.info(`[Testing] Logs exported as text to ${filename}`)
  }

  /**
   * Get log statistics for testing session
   */
  static getSessionStats() {
    const stats = logCollector.getLogStats()
    const sessionDuration = this.getSessionDuration()
    
    return {
      ...stats,
      sessionDuration,
      averageLogsPerMinute: Math.round(stats.total / (sessionDuration / 60000))
    }
  }

  /**
   * Print formatted log summary to console
   */
  static printLogSummary(): void {
    const stats = this.getSessionStats()
    console.group('📊 vConsole Log Session Summary')
    console.log(`Total logs: ${stats.total}`)
    console.log(`Errors: ${stats.errorCount}`)
    console.log(`Network requests: ${stats.networkRequests}`)
    console.log(`Session duration: ${Math.round(stats.sessionDuration / 1000)}s`)
    console.log('Logs by level:', stats.byLevel)
    console.log('Logs by source:', stats.bySource)
    console.groupEnd()
  }

  /**
   * Get session duration in milliseconds
   */
  private static getSessionDuration(): number {
    const logs = logCollector.getLogs()
    if (logs.length === 0) return 0
    
    const firstLog = Math.min(...logs.map(log => log.timestamp))
    const lastLog = Math.max(...logs.map(log => log.timestamp))
    
    return lastLog - firstLog
  }

  /**
   * Clear current session logs
   */
  static clearSession(): void {
    logCollector.clearLogs()
    console.info('[Testing] Log session cleared')
  }

  /**
   * Start a new testing session
   */
  static startTestingSession(sessionName?: string): void {
    this.clearSession()
    const name = sessionName || `Session-${new Date().toISOString()}`
    console.group(`🧪 Starting Testing Session: ${name}`)
    console.log('vConsole Log Collector is active')
    console.log('Use TestingLogManager methods to export logs during testing')
    console.groupEnd()
  }

  /**
   * End testing session and show summary
   */
  static endTestingSession(): void {
    console.group('🏁 Ending Testing Session')
    this.printLogSummary()
    console.log('Use TestingLogManager.exportLogSession() to save logs')
    console.groupEnd()
  }

  /**
   * Quick debug: get recent error logs
   */
  static getRecentErrors(minutes: number = 5): VConsoleLogEntry[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000)
    return logCollector.getLogsByLevel('error').filter(log => log.timestamp > cutoffTime)
  }

  /**
   * Quick debug: get recent network failures
   */
  static getRecentNetworkErrors(minutes: number = 5): VConsoleLogEntry[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000)
    return logCollector.getNetworkLogs()
      .filter(log => log.timestamp > cutoffTime && (log.status || 0) >= 400)
  }
}

// Make testing helpers available globally in development
if (import.meta.env.MODE === 'development') {
  ;(window as any).TestingLogManager = TestingLogManager
  
  // Convenient shortcuts
  ;(window as any).exportLogs = () => TestingLogManager.exportLogSession()
  ;(window as any).logSummary = () => TestingLogManager.printLogSummary()
  ;(window as any).clearLogs = () => TestingLogManager.clearSession()
  ;(window as any).getErrors = () => TestingLogManager.getErrorLogs()
  ;(window as any).getNetworkLogs = () => TestingLogManager.getNetworkLogs()
}