/**
 * vConsole Log Collector
 * Captures and stores vConsole logs for testing and debugging purposes
 */

export interface VConsoleLogEntry {
  timestamp: number
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
  args: any[]
  source: 'console' | 'network' | 'system'
  url?: string
  method?: string
  status?: number
}

class VConsoleLogCollector {
  private logs: VConsoleLogEntry[] = []
  private isEnabled: boolean = false
  private originalConsole: any = {}

  /**
   * Initialize the log collector and start capturing logs
   */
  init() {
    if (this.isEnabled) return

    this.isEnabled = true
    this.setupConsoleInterception()
    this.setupNetworkInterception()
    
    console.info('[vConsole Log Collector] Initialized')
  }

  /**
   * Intercept console methods to capture logs
   */
  private setupConsoleInterception() {
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const

    consoleMethods.forEach(method => {
      this.originalConsole[method] = console[method]
      
      console[method] = (...args: any[]) => {
        // Store the log
        this.addLog({
          timestamp: Date.now(),
          level: method,
          message: this.formatMessage(args),
          args,
          source: 'console'
        })

        // Call original console method
        this.originalConsole[method].apply(console, args)
      }
    })
  }

  /**
   * Intercept network requests to capture network logs
   */
  private setupNetworkInterception() {
    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      this._method = method
      this._url = url
      return originalXHROpen.apply(this, [method, url, ...args])
    }

    XMLHttpRequest.prototype.send = function(...args: any[]) {
      const xhr = this
      
      xhr.addEventListener('loadend', () => {
        logCollector.addLog({
          timestamp: Date.now(),
          level: xhr.status >= 400 ? 'error' : 'info',
          message: `${xhr._method} ${xhr._url} - ${xhr.status}`,
          args: [{ method: xhr._method, url: xhr._url, status: xhr.status, response: xhr.responseText }],
          source: 'network',
          url: xhr._url,
          method: xhr._method,
          status: xhr.status
        })
      })

      return originalXHRSend.apply(this, args)
    }

    // Intercept Fetch API
    const originalFetch = window.fetch
    
    window.fetch = async function(...args: any[]) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url
      const method = args[1]?.method || 'GET'
      const startTime = Date.now()

      try {
        const response = await originalFetch.apply(this, args)
        
        logCollector.addLog({
          timestamp: startTime,
          level: response.status >= 400 ? 'error' : 'info',
          message: `${method} ${url} - ${response.status} (${Date.now() - startTime}ms)`,
          args: [{ method, url, status: response.status, duration: Date.now() - startTime }],
          source: 'network',
          url,
          method,
          status: response.status
        })

        return response
      } catch (error) {
        logCollector.addLog({
          timestamp: startTime,
          level: 'error',
          message: `${method} ${url} - Network Error`,
          args: [{ method, url, error: error.message }],
          source: 'network',
          url,
          method
        })
        throw error
      }
    }
  }

  /**
   * Add a log entry to the collection
   */
  private addLog(entry: VConsoleLogEntry) {
    this.logs.push(entry)
    
    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }
  }

  /**
   * Format console arguments into a readable message
   */
  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')
  }

  /**
   * Get all collected logs
   */
  getLogs(): VConsoleLogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: VConsoleLogEntry['level']): VConsoleLogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get logs filtered by source
   */
  getLogsBySource(source: VConsoleLogEntry['source']): VConsoleLogEntry[] {
    return this.logs.filter(log => log.source === source)
  }

  /**
   * Get logs from a specific time range
   */
  getLogsByTimeRange(startTime: number, endTime: number): VConsoleLogEntry[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime)
  }

  /**
   * Export logs as JSON string
   */
  exportLogsAsJson(): string {
    return JSON.stringify({
      exportTime: Date.now(),
      totalLogs: this.logs.length,
      logs: this.logs
    }, null, 2)
  }

  /**
   * Export logs as formatted text
   */
  exportLogsAsText(): string {
    return this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString()
      const level = log.level.toUpperCase().padEnd(5)
      const source = log.source.toUpperCase().padEnd(7)
      return `[${timestamp}] ${level} ${source} ${log.message}`
    }).join('\n')
  }

  /**
   * Clear all collected logs
   */
  clearLogs() {
    this.logs = []
    console.info('[vConsole Log Collector] Logs cleared')
  }

  /**
   * Get summary statistics
   */
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      errorCount: 0,
      networkRequests: 0
    }

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1
      
      if (log.level === 'error') stats.errorCount++
      if (log.source === 'network') stats.networkRequests++
    })

    return stats
  }

  /**
   * Restore original console methods
   */
  destroy() {
    if (!this.isEnabled) return

    // Restore original console methods
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method]
    })

    this.isEnabled = false
    this.logs = []
    console.info('[vConsole Log Collector] Destroyed')
  }
}

// Global singleton instance
export const logCollector = new VConsoleLogCollector()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).vConsoleLogCollector = logCollector
}