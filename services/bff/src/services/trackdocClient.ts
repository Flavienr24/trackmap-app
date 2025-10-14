// TrackDoc API Client
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../config/logger';
import config from '../config';
import { TrackDocClient, AppError } from '../types';

class TrackDocApiClient implements TrackDocClient {
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.TRACKDOC_API_KEY;

    if (!apiKey) {
      logger.error('TRACKDOC_API_KEY not configured in environment variables');
      throw new Error('TRACKDOC_API_KEY is required for TrackDoc API client');
    }

    this.client = axios.create({
      baseURL: config.services.trackdoc.baseUrl,
      timeout: config.services.trackdoc.timeout,
      headers: {
        // Note: Content-Type intentionally omitted to let Axios set it automatically
        // based on request body (e.g., application/json for objects, multipart/form-data for FormData)
        // Multipart uploads go through the HTTP proxy (routes/proxy.ts), not this client
        'User-Agent': 'TrackMap-BFF/1.0.0',
        'X-API-Key': apiKey
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('TrackDoc API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timeout: config.timeout
        });
        return config;
      },
      (error) => {
        logger.error('TrackDoc API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Use content-length header to avoid blocking JSON.stringify on large payloads
        const dataSize = response.headers['content-length']
          ? `${response.headers['content-length']} bytes`
          : 'chunked';

        logger.debug('TrackDoc API Response', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          dataSize
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

        logger.error('TrackDoc API Error', errorInfo);

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
      return 'TrackDoc service is unavailable';
    }
    if (error.code === 'ENOTFOUND') {
      return 'TrackDoc service not found';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'TrackDoc service timeout';
    }
    return error.message || 'Unknown TrackDoc service error';
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.client.get<{ data: T }>(path);
    return response.data.data;
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await this.client.post<{ data: T }>(path, data);
    return response.data.data;
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await this.client.put<{ data: T }>(path, data);
    return response.data.data;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.client.delete<{ data: T }>(path);
    return response.data.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      logger.warn('TrackDoc health check failed', { error: (error as Error).message });
      return false;
    }
  }

  // Batch operations for performance
  async batchGet<T>(paths: string[]): Promise<(T | null)[]> {
    const promises = paths.map(async (path) => {
      try {
        return await this.get<T>(path);
      } catch (error) {
        logger.warn(`Batch get failed for path: ${path}`, { error: (error as Error).message });
        return null;
      }
    });

    return Promise.all(promises);
  }
}

// Singleton instance
export const trackdocClient = new TrackDocApiClient();
export default trackdocClient;