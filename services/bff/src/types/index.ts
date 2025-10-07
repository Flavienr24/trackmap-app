// BFF Types - Optimized for frontend consumption

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    generatedAt?: string;
    cacheKey?: string;
    productId?: string;
    type?: string;
    [key: string]: any; // Allow additional meta fields
  };
}

// Enhanced types for BFF responses
export interface Product {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Aggregated data
  stats: {
    totalPages: number;
    totalEvents: number;
    eventsInError: number;
    healthScore: number;
  };
}

export interface ProductOverview extends Product {
  recentPages: PageSummary[];
  recentEvents: EventSummary[];
  propertiesLibrary: VariableSummary[];
}

export interface PageSummary {
  id: string;
  name: string;
  url: string;
  eventCount: number;
  lastModified: string;
  status: 'healthy' | 'warning' | 'error';
}

export interface EventSummary {
  id: string;
  name: string;
  status: EventStatus;
  page: {
    id: string;
    name: string;
  };
  lastModified: string;
  variableCount: number;
}

export interface VariableSummary {
  id: string;
  name: string;
  type: string;
  usageCount: number;
  description?: string;
}

export interface DashboardData {
  summary: {
    totalProducts: number;
    totalPages: number;
    totalEvents: number;
    avgHealthScore: number;
  };
  recentActivity: ActivityItem[];
  healthScores: HealthScoreItem[];
  topIssues: IssueItem[];
}

export interface ActivityItem {
  id: string;
  type: 'event_created' | 'event_updated' | 'page_created' | 'status_changed';
  entityName: string;
  productName: string;
  timestamp: string;
  details?: string;
}

export interface HealthScoreItem {
  productId: string;
  productName: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

export interface IssueItem {
  id: string;
  type: 'error' | 'warning';
  message: string;
  productName: string;
  pageName?: string;
  eventName?: string;
  count: number;
}

// Search and filtering
export interface SearchRequest {
  query?: string;
  productId?: string;
  status?: EventStatus[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    query: SearchRequest;
  };
  aggregations?: {
    statusCounts: Record<EventStatus, number>;
    productCounts: Record<string, number>;
  };
}

// Enums
export type EventStatus = 'TO_IMPLEMENT' | 'TO_TEST' | 'ERROR' | 'VALIDATED';

export interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  name: string;
  status: EventStatus;
  testDate?: string;
  variables: Record<string, any>;
  pageId: string;
  createdAt: string;
  updatedAt: string;
}

// Service interfaces
export interface TrackDocClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, data: any): Promise<T>;
  put<T>(path: string, data: any): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// Error types
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}