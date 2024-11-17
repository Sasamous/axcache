import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AxcacheOptions extends AxiosRequestConfig {
  stdTTL?: number;
  maxSizeMB?: number;
  onCacheHit?: (key: string) => void;
  onCacheMiss?: (key: string) => void;
  onCacheWrite?: (key: string) => void;
}

export interface AxcacheRequestConfig extends AxiosRequestConfig {
  forceRefresh?: boolean;
  ttl?: number;
}

export interface Axcache {
  get<T = any>(url: string, config?: AxcacheRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxcacheRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxcacheRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxcacheRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: AxcacheRequestConfig): Promise<AxiosResponse<T>>;
  getCacheStats(): { entries: number; size: number };
  clearCache(): void;
}

declare function createAxcache(options?: AxcacheOptions): Axcache;
export default createAxcache; 