// TrackmAPI Client for audit functionality
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../config/logger';
import config from '../config';
import { AppError } from '../types';

export interface AuditStatus {
  isRunning: boolean;
  currentUrl: string | null;
  duration: number;
  activeCollectors: string[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  url: string;
  type: string;
  source: string;
  data: any;
  event_name?: string;
  metadata: any;
}

export interface AuditResults {
  success: boolean;
  count: number;
  events: AuditEvent[];
  filters?: any;
}

class TrackmAPIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.services.trackmapi.baseUrl,
      timeout: config.services.trackmapi.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TrackMap-BFF/1.0.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('TrackmAPI Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timeout: config.timeout
        });
        return config;
      },
      (error) => {
        logger.error('TrackmAPI Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('TrackmAPI Response', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        const errorInfo = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase()
        };

        logger.error('TrackmAPI Error', errorInfo);

        // Transform axios errors to app errors
        const appError: AppError = new Error(this.getErrorMessage(error));
        appError.statusCode = error.response?.status || 500;
        appError.isOperational = true;

        return Promise.reject(appError);
      }
    );
  }

  private getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.code === 'ECONNREFUSED') {
      return 'TrackmAPI service is unavailable';
    }
    if (error.code === 'ENOTFOUND') {
      return 'TrackmAPI service not found';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'TrackmAPI service timeout';
    }
    return error.message || 'Unknown TrackmAPI service error';
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      logger.warn('TrackmAPI health check failed', { error: (error as Error).message });
      return false;
    }
  }

  // Get audit status
  async getAuditStatus(): Promise<AuditStatus> {
    try {
      const response = await this.client.get<{ success: boolean; status: AuditStatus }>('/api/audit/status');
      return response.data.status;
    } catch (error) {
      logger.error('Failed to get audit status', { error: (error as Error).message });
      throw error;
    }
  }

  // Get audit results
  async getAuditResults(filters?: { url?: string; type?: string; source?: string }): Promise<AuditResults> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await this.client.get<AuditResults>(`/api/audit/results?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get audit results', { error: (error as Error).message });
      throw error;
    }
  }

  // Start audit
  async startAudit(url: string, clearHistory: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/api/audit/start', { url, clearHistory });
      return response.data;
    } catch (error) {
      logger.error('Failed to start audit', { url, error: (error as Error).message });
      throw error;
    }
  }

  // Stop audit  
  async stopAudit(): Promise<{ success: boolean; message: string; results?: any }> {
    try {
      const response = await this.client.post('/api/audit/stop');
      return response.data;
    } catch (error) {
      logger.error('Failed to stop audit', { error: (error as Error).message });
      throw error;
    }
  }

  // Clear events
  async clearEvents(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.delete('/api/audit/events');
      return response.data;
    } catch (error) {
      logger.error('Failed to clear events', { error: (error as Error).message });
      throw error;
    }
  }
}

// Singleton instance
export const trackmapiClient = new TrackmAPIClient();
export default trackmapiClient;