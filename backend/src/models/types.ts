// Database model types and interfaces

export interface CreateProductRequest {
  name: string;
  description?: string;
  hasInstances?: boolean;
  currentEnvironment?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  hasInstances?: boolean;
  currentEnvironment?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode?: number;
}