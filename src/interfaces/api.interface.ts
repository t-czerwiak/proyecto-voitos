// Respuesta estándar para todos los endpoints
export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Para endpoints paginados (por si se necesita en el futuro)
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
